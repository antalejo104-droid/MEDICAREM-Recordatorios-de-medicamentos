import { and, eq, inArray, lt } from "drizzle-orm";
import type { Response } from "express";
import { db } from "@workspace/db";
import {
  auditLogsTable,
  caregiverAuthorizationsTable,
  medicaremUsersTable,
  medicationSchedulesTable,
  medicationsTable,
  scheduledEventsTable,
  type MedicaremUser,
} from "@workspace/db";
import {
  dateWindow,
  localDateKey,
  localTimeToInstant,
  shiftDate,
  localWeekdayForDate,
} from "./time";

export {
  dateKeyFromInput,
  dateWindow,
  isValidDate,
  isValidTime,
  localDateKey,
  localTimeToInstant,
  shiftDate,
} from "./time";

export async function findUser(clerkUserId: string): Promise<MedicaremUser | undefined> {
  const [user] = await db
    .select()
    .from(medicaremUsersTable)
    .where(eq(medicaremUsersTable.clerkUserId, clerkUserId))
    .limit(1);
  return user;
}

export async function getProfileOrRespond(
  clerkUserId: string,
  res: Response,
): Promise<MedicaremUser | null> {
  const user = await findUser(clerkUserId);
  if (!user) {
    res.status(404).json({ error: "Completa tu perfil para continuar." });
    return null;
  }
  return user;
}

export async function getPatientForViewer(
  viewer: MedicaremUser,
  requestedPatientId: number | undefined,
  res: Response,
): Promise<MedicaremUser | null> {
  if (viewer.role === "PATIENT") {
    if (requestedPatientId !== undefined && requestedPatientId !== viewer.id) {
      res.status(403).json({ error: "No tienes autorización para consultar este perfil." });
      return null;
    }
    return viewer;
  }

  if (requestedPatientId === undefined) {
    res.status(400).json({ error: "Selecciona una persona autorizada." });
    return null;
  }

  const [authorization] = await db
    .select({ id: caregiverAuthorizationsTable.id })
    .from(caregiverAuthorizationsTable)
    .where(
      and(
        eq(caregiverAuthorizationsTable.patientId, requestedPatientId),
        eq(caregiverAuthorizationsTable.caregiverId, viewer.id),
        eq(caregiverAuthorizationsTable.status, "ACTIVE"),
      ),
    )
    .limit(1);
  if (!authorization) {
    res.status(403).json({ error: "No tienes autorización para consultar este perfil." });
    return null;
  }

  const [patient] = await db
    .select()
    .from(medicaremUsersTable)
    .where(eq(medicaremUsersTable.id, requestedPatientId))
    .limit(1);
  if (!patient || patient.role !== "PATIENT") {
    res.status(404).json({ error: "No se encontró el perfil solicitado." });
    return null;
  }
  return patient;
}

export async function ensureUpcomingEvents(patient: MedicaremUser): Promise<void> {
  const schedules = await db
    .select({ schedule: medicationSchedulesTable, medication: medicationsTable })
    .from(medicationSchedulesTable)
    .innerJoin(medicationsTable, eq(medicationSchedulesTable.medicationId, medicationsTable.id))
    .where(and(eq(medicationsTable.patientId, patient.id), eq(medicationsTable.active, true)));
  if (schedules.length === 0) return;

  const today = localDateKey(new Date(), patient.timezone);
  const eventRows: Array<{
    externalId: string;
    patientId: number;
    medicationId: number;
    scheduleId: number;
    scheduledAt: Date;
  }> = [];

  for (const { schedule, medication } of schedules) {
    for (let offset = -1; offset <= 8; offset += 1) {
      const dateKey = shiftDate(today, offset);
      if (!schedule.weekdays.includes(localWeekdayForDate(dateKey))) continue;
      if (dateKey < schedule.startDate || (schedule.endDate && dateKey > schedule.endDate)) continue;
      if (dateKey < medication.startDate || (medication.endDate && dateKey > medication.endDate)) continue;
      eventRows.push({
        externalId: `schedule-${schedule.id}:${dateKey}:${schedule.time}`,
        patientId: patient.id,
        medicationId: medication.id,
        scheduleId: schedule.id,
        scheduledAt: localTimeToInstant(dateKey, schedule.time, patient.timezone),
      });
    }
  }

  if (eventRows.length > 0) {
    await db.insert(scheduledEventsTable).values(eventRows).onConflictDoNothing();
  }

  const unconfirmedBefore = new Date(Date.now() - 60 * 60 * 1000);
  await db
    .update(scheduledEventsTable)
    .set({ status: "UNCONFIRMED" })
    .where(
      and(
        eq(scheduledEventsTable.patientId, patient.id),
        eq(scheduledEventsTable.status, "PENDING"),
        lt(scheduledEventsTable.scheduledAt, unconfirmedBefore),
      ),
    );
}

export async function writeAudit(
  actorUserId: number,
  subjectUserId: number | null,
  action: string,
  entityType: string,
  entityId: string | null,
): Promise<void> {
  await db.insert(auditLogsTable).values({
    actorUserId,
    subjectUserId,
    action,
    entityType,
    entityId,
  });
}

export async function loadSchedules(medicationId: number) {
  return db
    .select()
    .from(medicationSchedulesTable)
    .where(eq(medicationSchedulesTable.medicationId, medicationId))
    .orderBy(medicationSchedulesTable.time);
}

export async function loadMedicationResponse(medicationId: number) {
  const [medication] = await db
    .select()
    .from(medicationsTable)
    .where(eq(medicationsTable.id, medicationId))
    .limit(1);
  if (!medication) return undefined;
  const schedules = await loadSchedules(medicationId);
  return {
    id: medication.id,
    name: medication.name,
    presentation: medication.presentation,
    prescribedDose: medication.prescribedDose,
    notes: medication.notes,
    active: medication.active,
    startDate: medication.startDate,
    endDate: medication.endDate,
    createdAt: medication.createdAt.toISOString(),
    schedules: schedules.map((schedule) => ({
      id: schedule.id,
      time: schedule.time,
      weekdays: schedule.weekdays,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
    })),
  };
}

export async function loadMedicationResponses(patientId: number, includeInactive: boolean) {
  const medications = await db
    .select()
    .from(medicationsTable)
    .where(
      includeInactive
        ? eq(medicationsTable.patientId, patientId)
        : and(eq(medicationsTable.patientId, patientId), eq(medicationsTable.active, true)),
    )
    .orderBy(medicationsTable.name);
  if (medications.length === 0) return [];
  const schedules = await db
    .select()
    .from(medicationSchedulesTable)
    .where(inArray(medicationSchedulesTable.medicationId, medications.map((medication) => medication.id)))
    .orderBy(medicationSchedulesTable.time);
  const byMedication = new Map<number, typeof schedules>();
  for (const schedule of schedules) {
    const existing = byMedication.get(schedule.medicationId) ?? [];
    existing.push(schedule);
    byMedication.set(schedule.medicationId, existing);
  }
  return medications.map((medication) => ({
    id: medication.id,
    name: medication.name,
    presentation: medication.presentation,
    prescribedDose: medication.prescribedDose,
    notes: medication.notes,
    active: medication.active,
    startDate: medication.startDate,
    endDate: medication.endDate,
    createdAt: medication.createdAt.toISOString(),
    schedules: (byMedication.get(medication.id) ?? []).map((schedule) => ({
      id: schedule.id,
      time: schedule.time,
      weekdays: schedule.weekdays,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
    })),
  }));
}

export function sendBadRequest(res: Response, message: string): void {
  res.status(400).json({ error: message });
}
