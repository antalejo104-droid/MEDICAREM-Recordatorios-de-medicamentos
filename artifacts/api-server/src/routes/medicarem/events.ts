import { and, count, desc, eq, gte, lt } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  GetDashboardQueryParams,
  GetDashboardResponse,
  ListEventsQueryParams,
  ListEventsResponse,
  RecordEventBody,
  RecordEventResponse,
  SyncEventsBody,
  SyncEventsResponse,
} from "@workspace/api-zod";
import {
  db,
  medicationEventRecordsTable,
  medicaremUsersTable,
  medicationsTable,
  scheduledEventsTable,
  syncLogsTable,
} from "@workspace/db";
import { getClerkUserId } from "../../middlewares/requireAuth";
import {
  dateWindow,
  dateKeyFromInput,
  ensureUpcomingEvents,
  findUser,
  getPatientForViewer,
  getProfileOrRespond,
  localDateKey,
  sendBadRequest,
  shiftDate,
  writeAudit,
} from "./common";

const router: IRouter = Router();
type EventWriteStatus = "CONFIRMED" | "DECLARED_OMISSION";

class EventWriteError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
  }
}

async function recordEventForPatient(
  patientId: number,
  input: {
    eventId: number;
    status: EventWriteStatus;
    clientEventId: string;
    reportedAt?: string | Date;
  },
  source: "web" | "mobile",
): Promise<{ event: typeof scheduledEventsTable.$inferSelect; duplicate: boolean }> {
  const reportedAt = input.reportedAt ? new Date(input.reportedAt) : new Date();
  if (Number.isNaN(reportedAt.getTime())) {
    throw new EventWriteError("La hora del reporte no es válida.", 400);
  }

  return db.transaction(async (tx) => {
    const [priorRecord] = await tx
      .select()
      .from(medicationEventRecordsTable)
      .where(eq(medicationEventRecordsTable.clientEventId, input.clientEventId))
      .limit(1);
    if (priorRecord) {
      if (priorRecord.eventId !== input.eventId) {
        throw new EventWriteError("El identificador de sincronización ya fue utilizado.", 409);
      }
      const [priorEvent] = await tx
        .select()
        .from(scheduledEventsTable)
        .where(eq(scheduledEventsTable.id, input.eventId))
        .limit(1);
      if (!priorEvent) throw new EventWriteError("No se encontró el evento.", 404);
      return { event: priorEvent, duplicate: true };
    }

    const [event] = await tx
      .select()
      .from(scheduledEventsTable)
      .where(and(eq(scheduledEventsTable.id, input.eventId), eq(scheduledEventsTable.patientId, patientId)))
      .for("update")
      .limit(1);
    if (!event) throw new EventWriteError("No se encontró el evento.", 404);
    if (event.status !== "PENDING" && event.status !== "UNCONFIRMED") {
      throw new EventWriteError("Este evento ya tiene un registro y no se puede cambiar.", 409);
    }

    await tx.insert(medicationEventRecordsTable).values({
      eventId: event.id,
      clientEventId: input.clientEventId,
      status: input.status,
      reportedAt,
      source,
    });
    const [updatedEvent] = await tx
      .update(scheduledEventsTable)
      .set({ status: input.status, reportedAt })
      .where(eq(scheduledEventsTable.id, event.id))
      .returning();
    if (!updatedEvent) throw new EventWriteError("No se pudo guardar el registro.", 500);
    return { event: updatedEvent, duplicate: false };
  });
}

function eventPayload(
  event: typeof scheduledEventsTable.$inferSelect,
  medicationName: string,
  prescribedDose: string,
  patientName: string | null,
) {
  return {
    id: event.id,
    externalId: event.externalId,
    medicationId: event.medicationId ?? 0,
    medicationName,
    prescribedDose,
    scheduledAt: event.scheduledAt.toISOString(),
    status: event.status,
    reportedAt: event.reportedAt?.toISOString() ?? null,
    patientName,
  };
}

router.get("/dashboard", async (req, res): Promise<void> => {
  const query = GetDashboardQueryParams.safeParse(req.query);
  if (!query.success) {
    sendBadRequest(res, "El perfil seleccionado no es válido.");
    return;
  }
  const viewer = await getProfileOrRespond(getClerkUserId(res), res);
  if (!viewer) return;
  const patient = await getPatientForViewer(viewer, query.data.patientId, res);
  if (!patient) return;

  await ensureUpcomingEvents(patient);
  const today = localDateKey(new Date(), patient.timezone);
  const todayWindow = dateWindow(today, patient.timezone);
  const todayRows = await db
    .select({ status: scheduledEventsTable.status })
    .from(scheduledEventsTable)
    .where(
      and(
        eq(scheduledEventsTable.patientId, patient.id),
        gte(scheduledEventsTable.scheduledAt, todayWindow.from),
        lt(scheduledEventsTable.scheduledAt, todayWindow.to),
      ),
    );
  const [activeMedicationCount] = await db
    .select({ value: count() })
    .from(medicationsTable)
    .where(and(eq(medicationsTable.patientId, patient.id), eq(medicationsTable.active, true)));
  const recentRows = await db
    .select({ event: scheduledEventsTable, medication: medicationsTable })
    .from(scheduledEventsTable)
    .leftJoin(medicationsTable, eq(scheduledEventsTable.medicationId, medicationsTable.id))
    .where(eq(scheduledEventsTable.patientId, patient.id))
    .orderBy(desc(scheduledEventsTable.scheduledAt))
    .limit(8);

  res.json(
    GetDashboardResponse.parse({
      patientName: patient.displayName,
      todayScheduled: todayRows.length,
      confirmed: todayRows.filter((event) => event.status === "CONFIRMED").length,
      declaredOmissions: todayRows.filter((event) => event.status === "DECLARED_OMISSION").length,
      pending: todayRows.filter((event) => event.status === "PENDING").length,
      activeMedications: activeMedicationCount?.value ?? 0,
      lastSyncedAt: patient.lastSyncedAt?.toISOString() ?? null,
      recentEvents: recentRows.map(({ event, medication }) =>
        eventPayload(
          event,
          medication?.name ?? "Medicamento eliminado",
          medication?.prescribedDose ?? "",
          viewer.role === "CAREGIVER" ? patient.displayName : null,
        ),
      ),
    }),
  );
});

router.get("/events", async (req, res): Promise<void> => {
  const query = ListEventsQueryParams.safeParse(req.query);
  if (!query.success) {
    sendBadRequest(res, "Los filtros del historial no son válidos.");
    return;
  }
  const viewer = await getProfileOrRespond(getClerkUserId(res), res);
  if (!viewer) return;
  const patient = await getPatientForViewer(viewer, query.data.patientId, res);
  if (!patient) return;

  const today = localDateKey(new Date(), patient.timezone);
  const from = query.data.from ? dateKeyFromInput(query.data.from) : shiftDate(today, -30);
  const to = query.data.to ? dateKeyFromInput(query.data.to) : shiftDate(today, 8);
  const fromWindow = dateWindow(from, patient.timezone);
  const toWindow = dateWindow(to, patient.timezone);
  if (from > to) {
    sendBadRequest(res, "La fecha inicial debe ser anterior o igual a la fecha final.");
    return;
  }

  await ensureUpcomingEvents(patient);
  const conditions = [
    eq(scheduledEventsTable.patientId, patient.id),
    gte(scheduledEventsTable.scheduledAt, fromWindow.from),
    lt(scheduledEventsTable.scheduledAt, toWindow.to),
  ];
  if (query.data.status) conditions.push(eq(scheduledEventsTable.status, query.data.status));
  if (query.data.medicationId) conditions.push(eq(scheduledEventsTable.medicationId, query.data.medicationId));

  const rows = await db
    .select({ event: scheduledEventsTable, medication: medicationsTable })
    .from(scheduledEventsTable)
    .leftJoin(medicationsTable, eq(scheduledEventsTable.medicationId, medicationsTable.id))
    .where(and(...conditions))
    .orderBy(desc(scheduledEventsTable.scheduledAt))
    .limit(200);

  res.json(
    ListEventsResponse.parse(
      rows.map(({ event, medication }) =>
        eventPayload(
          event,
          medication?.name ?? "Medicamento eliminado",
          medication?.prescribedDose ?? "",
          viewer.role === "CAREGIVER" ? patient.displayName : null,
        ),
      ),
    ),
  );
});

router.post("/events", async (req, res): Promise<void> => {
  const parsed = RecordEventBody.safeParse(req.body);
  if (!parsed.success) {
    sendBadRequest(res, "El registro del evento no es válido.");
    return;
  }
  const viewer = await getProfileOrRespond(getClerkUserId(res), res);
  if (!viewer) return;
  if (viewer.role !== "PATIENT") {
    res.status(403).json({ error: "Solo la persona titular puede registrar una toma u omisión." });
    return;
  }

  try {
    const result = await recordEventForPatient(viewer.id, parsed.data, "web");
    const [medication] = result.event.medicationId
      ? await db
          .select()
          .from(medicationsTable)
          .where(eq(medicationsTable.id, result.event.medicationId))
          .limit(1)
      : [];
    if (!result.duplicate) {
      await writeAudit(
        viewer.id,
        viewer.id,
        parsed.data.status === "CONFIRMED" ? "event.confirmed" : "event.omission_declared",
        "medication_event",
        String(result.event.id),
      );
    }
    res.json(
      RecordEventResponse.parse(
        eventPayload(
          result.event,
          medication?.name ?? "Medicamento eliminado",
          medication?.prescribedDose ?? "",
          null,
        ),
      ),
    );
  } catch (error) {
    if (error instanceof EventWriteError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    throw error;
  }
});

router.post("/sync", async (req, res): Promise<void> => {
  const parsed = SyncEventsBody.safeParse(req.body);
  if (!parsed.success) {
    sendBadRequest(res, "La cola de sincronización no es válida.");
    return;
  }
  const viewer = await getProfileOrRespond(getClerkUserId(res), res);
  if (!viewer) return;
  if (viewer.role !== "PATIENT") {
    res.status(403).json({ error: "La sincronización de eventos pertenece a la cuenta de la persona titular." });
    return;
  }

  let processed = 0;
  let duplicates = 0;
  try {
    for (const event of parsed.data.events) {
      const result = await recordEventForPatient(viewer.id, event, "mobile");
      if (result.duplicate) {
        duplicates += 1;
      } else {
        processed += 1;
        await writeAudit(
          viewer.id,
          viewer.id,
          event.status === "CONFIRMED" ? "event.confirmed" : "event.omission_declared",
          "medication_event",
          String(result.event.id),
        );
      }
    }
  } catch (error) {
    await db.insert(syncLogsTable).values({
      userId: viewer.id,
      processed,
      duplicates,
      success: false,
    });
    if (error instanceof EventWriteError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    throw error;
  }

  const lastSyncedAt = new Date();
  await db
    .update(medicaremUsersTable)
    .set({ lastSyncedAt })
    .where(eq(medicaremUsersTable.id, viewer.id));
  await db.insert(syncLogsTable).values({ userId: viewer.id, processed, duplicates, success: true });
  res.json(SyncEventsResponse.parse({ processed, duplicates, lastSyncedAt: lastSyncedAt.toISOString() }));
});

export default router;
