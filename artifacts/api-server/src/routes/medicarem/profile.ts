import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  GetProfileResponse,
  SaveProfileBody,
  SaveProfileResponse,
} from "@workspace/api-zod";
import { db, medicaremUsersTable } from "@workspace/db";
import { getClerkUserId } from "../../middlewares/requireAuth";
import { findUser } from "./common";

const router: IRouter = Router();

router.get("/profile", async (_req, res): Promise<void> => {
  const user = await findUser(getClerkUserId(res));
  if (!user) {
    res.status(404).json({ error: "Completa tu perfil para continuar." });
    return;
  }

  res.json(
    GetProfileResponse.parse({
      id: user.id,
      clerkUserId: user.clerkUserId,
      displayName: user.displayName,
      role: user.role,
      timezone: user.timezone,
      largeText: user.largeText,
      notificationsEnabled: user.notificationsEnabled,
      lastSyncedAt: user.lastSyncedAt?.toISOString() ?? null,
    }),
  );
});

router.put("/profile", async (req, res): Promise<void> => {
  const parsed = SaveProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Revisa los datos del perfil e inténtalo de nuevo." });
    return;
  }
  try {
    new Intl.DateTimeFormat("es-CO", { timeZone: parsed.data.timezone });
  } catch {
    res.status(400).json({ error: "La zona horaria no es válida." });
    return;
  }

  const clerkUserId = getClerkUserId(res);
  const current = await findUser(clerkUserId);
  if (current && current.role !== parsed.data.role) {
    res.status(409).json({ error: "El tipo de cuenta no se puede cambiar después de crear el perfil." });
    return;
  }

  const values = {
    clerkUserId,
    displayName: parsed.data.displayName.trim(),
    role: parsed.data.role,
    timezone: parsed.data.timezone,
    largeText: parsed.data.largeText,
    notificationsEnabled: parsed.data.notificationsEnabled,
  };
  const [user] = current
    ? await db
        .update(medicaremUsersTable)
        .set(values)
        .where(eq(medicaremUsersTable.id, current.id))
        .returning()
    : await db.insert(medicaremUsersTable).values(values).returning();

  if (!user) {
    res.status(500).json({ error: "No se pudo guardar el perfil." });
    return;
  }
  res.json(
    SaveProfileResponse.parse({
      id: user.id,
      clerkUserId: user.clerkUserId,
      displayName: user.displayName,
      role: user.role,
      timezone: user.timezone,
      largeText: user.largeText,
      notificationsEnabled: user.notificationsEnabled,
      lastSyncedAt: user.lastSyncedAt?.toISOString() ?? null,
    }),
  );
});

export default router;
