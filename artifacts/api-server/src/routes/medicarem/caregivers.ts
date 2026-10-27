import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateCaregiverInvitationResponse,
  ListCaregiverInvitationsResponse,
  RedeemCaregiverInvitationBody,
  RedeemCaregiverInvitationResponse,
  UpdateCaregiverInvitationBody,
  UpdateCaregiverInvitationParams,
  UpdateCaregiverInvitationResponse,
} from "@workspace/api-zod";
import {
  db,
  caregiverAuthorizationsTable,
  medicaremUsersTable,
} from "@workspace/db";
import { getClerkUserId } from "../../middlewares/requireAuth";
import {
  getProfileOrRespond,
  sendBadRequest,
  writeAudit,
} from "./common";

const router: IRouter = Router();

function codeDigest(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function invitationPayload(
  invitation: typeof caregiverAuthorizationsTable.$inferSelect,
  patientName: string,
  caregiverName: string | null,
  code: string | null = null,
) {
  return {
    id: invitation.id,
    code,
    patientId: invitation.patientId,
    patientName,
    caregiverId: invitation.caregiverId,
    caregiverName,
    status: invitation.status,
    createdAt: invitation.createdAt.toISOString(),
  };
}

router.get("/caregiver-invitations", async (_req, res): Promise<void> => {
  const viewer = await getProfileOrRespond(getClerkUserId(res), res);
  if (!viewer) return;

  if (viewer.role === "PATIENT") {
    const rows = await db
      .select({ invitation: caregiverAuthorizationsTable, caregiver: medicaremUsersTable })
      .from(caregiverAuthorizationsTable)
      .leftJoin(medicaremUsersTable, eq(caregiverAuthorizationsTable.caregiverId, medicaremUsersTable.id))
      .where(eq(caregiverAuthorizationsTable.patientId, viewer.id))
      .orderBy(desc(caregiverAuthorizationsTable.createdAt));
    res.json(
      ListCaregiverInvitationsResponse.parse(
        rows.map(({ invitation, caregiver }) =>
          invitationPayload(invitation, viewer.displayName, caregiver?.displayName ?? null),
        ),
      ),
    );
    return;
  }

  const rows = await db
    .select({ invitation: caregiverAuthorizationsTable, patient: medicaremUsersTable })
    .from(caregiverAuthorizationsTable)
    .innerJoin(medicaremUsersTable, eq(caregiverAuthorizationsTable.patientId, medicaremUsersTable.id))
    .where(eq(caregiverAuthorizationsTable.caregiverId, viewer.id))
    .orderBy(desc(caregiverAuthorizationsTable.createdAt));
  res.json(
    ListCaregiverInvitationsResponse.parse(
      rows.map(({ invitation, patient }) =>
        invitationPayload(invitation, patient.displayName, viewer.displayName),
      ),
    ),
  );
});

router.post("/caregiver-invitations", async (_req, res): Promise<void> => {
  const viewer = await getProfileOrRespond(getClerkUserId(res), res);
  if (!viewer) return;
  if (viewer.role !== "PATIENT") {
    res.status(403).json({ error: "Solo la persona titular puede crear una invitación." });
    return;
  }

  const code = randomBytes(6).toString("hex").toUpperCase();
  const [invitation] = await db
    .insert(caregiverAuthorizationsTable)
    .values({
      patientId: viewer.id,
      inviteCodeHash: codeDigest(code),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: "PENDING",
    })
    .returning();
  if (!invitation) {
    res.status(500).json({ error: "No se pudo crear el código de invitación." });
    return;
  }
  await writeAudit(viewer.id, viewer.id, "caregiver.invitation_created", "caregiver_authorization", String(invitation.id));
  res.status(201).json(
    CreateCaregiverInvitationResponse.parse(
      invitationPayload(invitation, viewer.displayName, null, code),
    ),
  );
});

router.post("/caregiver-invitations/redeem", async (req, res): Promise<void> => {
  const parsed = RedeemCaregiverInvitationBody.safeParse(req.body);
  if (!parsed.success) {
    sendBadRequest(res, "Escribe un código de invitación válido.");
    return;
  }
  const viewer = await getProfileOrRespond(getClerkUserId(res), res);
  if (!viewer) return;
  if (viewer.role !== "CAREGIVER") {
    res.status(403).json({ error: "Esta cuenta debe tener el perfil de familiar o cuidador." });
    return;
  }

  const [invitation] = await db
    .select()
    .from(caregiverAuthorizationsTable)
    .where(eq(caregiverAuthorizationsTable.inviteCodeHash, codeDigest(parsed.data.code.trim().toUpperCase())))
    .limit(1);
  if (
    !invitation ||
    invitation.status !== "PENDING" ||
    !invitation.inviteCodeHash ||
    !invitation.expiresAt ||
    invitation.expiresAt.getTime() < Date.now()
  ) {
    res.status(404).json({ error: "El código no existe, venció o ya fue utilizado." });
    return;
  }
  if (invitation.patientId === viewer.id) {
    res.status(400).json({ error: "No puedes vincular tu cuenta contigo mismo." });
    return;
  }
  if (invitation.caregiverId && invitation.caregiverId !== viewer.id) {
    res.status(409).json({ error: "Este código ya fue utilizado." });
    return;
  }

  const [updated] = await db
    .update(caregiverAuthorizationsTable)
    .set({ caregiverId: viewer.id, inviteCodeHash: null })
    .where(
      and(
        eq(caregiverAuthorizationsTable.id, invitation.id),
        isNull(caregiverAuthorizationsTable.caregiverId),
        eq(caregiverAuthorizationsTable.status, "PENDING"),
      ),
    )
    .returning();
  if (!updated) {
    res.status(409).json({ error: "El código ya fue utilizado. Solicita una nueva invitación." });
    return;
  }

  const [patient] = await db
    .select()
    .from(medicaremUsersTable)
    .where(eq(medicaremUsersTable.id, updated.patientId))
    .limit(1);
  if (!patient) {
    res.status(404).json({ error: "No se encontró el perfil que creó la invitación." });
    return;
  }
  await writeAudit(viewer.id, patient.id, "caregiver.access_requested", "caregiver_authorization", String(updated.id));
  res.status(201).json(
    RedeemCaregiverInvitationResponse.parse(
      invitationPayload(updated, patient.displayName, viewer.displayName),
    ),
  );
});

router.patch("/caregiver-invitations/:id", async (req, res): Promise<void> => {
  const params = UpdateCaregiverInvitationParams.safeParse(req.params);
  const parsed = UpdateCaregiverInvitationBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    sendBadRequest(res, "La acción de autorización no es válida.");
    return;
  }
  const viewer = await getProfileOrRespond(getClerkUserId(res), res);
  if (!viewer) return;
  if (viewer.role !== "PATIENT") {
    res.status(403).json({ error: "Solo la persona titular puede aprobar o revocar el acceso." });
    return;
  }

  const [invitation] = await db
    .select()
    .from(caregiverAuthorizationsTable)
    .where(
      and(
        eq(caregiverAuthorizationsTable.id, params.data.id),
        eq(caregiverAuthorizationsTable.patientId, viewer.id),
      ),
    )
    .limit(1);
  if (!invitation) {
    res.status(404).json({ error: "No se encontró esa autorización." });
    return;
  }
  if (!invitation.caregiverId) {
    res.status(409).json({ error: "Esta invitación todavía no ha sido aceptada por un cuidador." });
    return;
  }
  if (invitation.status === "REVOKED" && parsed.data.status === "ACTIVE") {
    res.status(409).json({ error: "Una autorización revocada no se puede reactivar. Crea una invitación nueva." });
    return;
  }

  const [caregiver] = await db
    .select()
    .from(medicaremUsersTable)
    .where(eq(medicaremUsersTable.id, invitation.caregiverId))
    .limit(1);
  if (!caregiver) {
    res.status(404).json({ error: "No se encontró el perfil del cuidador." });
    return;
  }
  const [updated] = await db
    .update(caregiverAuthorizationsTable)
    .set({ status: parsed.data.status })
    .where(eq(caregiverAuthorizationsTable.id, invitation.id))
    .returning();
  if (!updated) {
    res.status(500).json({ error: "No se pudo actualizar la autorización." });
    return;
  }
  await writeAudit(
    viewer.id,
    viewer.id,
    parsed.data.status === "ACTIVE" ? "caregiver.access_approved" : "caregiver.access_revoked",
    "caregiver_authorization",
    String(updated.id),
  );
  res.json(
    UpdateCaregiverInvitationResponse.parse(
      invitationPayload(updated, viewer.displayName, caregiver.displayName),
    ),
  );
});

export default router;
