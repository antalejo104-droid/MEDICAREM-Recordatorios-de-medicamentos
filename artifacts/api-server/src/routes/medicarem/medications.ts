import { and, eq, gt } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateMedicationBody,
  CreateMedicationResponse,
  DeactivateMedicationParams,
  DeactivateMedicationResponse,
  ListMedicationsQueryParams,
  ListMedicationsResponse,
  UpdateMedicationBody,
  UpdateMedicationParams,
  UpdateMedicationResponse,
} from "@workspace/api-zod";
import {
  db,
  medicationSchedulesTable,
  medicationsTable,
  scheduledEventsTable,
} from "@workspace/db";
import { getClerkUserId } from "../../middlewares/requireAuth";
import {
  getPatientForViewer,
  getProfileOrRespond,
  dateKeyFromInput,
  isValidDate,
  isValidTime,
  loadMedicationResponse,
  loadMedicationResponses,
  sendBadRequest,
  writeAudit,
} from "./common";

const router: IRouter = Router();

function scheduleErrors(
  schedules: Array<{
    time: string;
    weekdays: number[];
    startDate: string;
    endDate?: string | null;
  }>,
  medicationStart: string,
  medicationEnd?: string | null,
): string | null {
  for (const schedule of schedules) {
    if (!isValidTime(schedule.time)) return "Usa horarios válidos en formato de 24 horas.";
    if (schedule.weekdays.length === 0 || new Set(schedule.weekdays).size !== schedule.weekdays.length) {
      return "Selecciona al menos un día y evita repetirlo.";
    }
    if (!isValidDate(schedule.startDate) || (schedule.endDate && !isValidDate(schedule.endDate))) {
      return "Revisa las fechas del horario.";
    }
    if (schedule.endDate && schedule.endDate < schedule.startDate) {
      return "La fecha final del horario debe ser igual o posterior a la inicial.";
    }
    if (schedule.startDate < medicationStart || (medicationEnd && schedule.startDate > medicationEnd)) {
      return "El horario debe estar dentro de las fechas del medicamento.";
    }
  }
  return null;
}

async function removeFuturePendingEvents(medicationId: number): Promise<void> {
  await db
    .delete(scheduledEventsTable)
    .where(
      and(
        eq(scheduledEventsTable.medicationId, medicationId),
        eq(scheduledEventsTable.status, "PENDING"),
        gt(scheduledEventsTable.scheduledAt, new Date()),
      ),
    );
}

router.get("/medications", async (req, res): Promise<void> => {
  const query = ListMedicationsQueryParams.safeParse(req.query);
  if (!query.success) {
    sendBadRequest(res, "Los filtros de medicamentos no son válidos.");
    return;
  }
  const viewer = await getProfileOrRespond(getClerkUserId(res), res);
  if (!viewer) return;
  const patient = await getPatientForViewer(viewer, query.data.patientId, res);
  if (!patient) return;

  const medications = await loadMedicationResponses(patient.id, query.data.includeInactive ?? false);
  res.json(ListMedicationsResponse.parse(medications));
});

router.post("/medications", async (req, res): Promise<void> => {
  const parsed = CreateMedicationBody.safeParse(req.body);
  if (!parsed.success) {
    sendBadRequest(res, "Completa el nombre, la dosis y al menos un horario.");
    return;
  }
  const startDate = dateKeyFromInput(parsed.data.startDate);
  const endDate = parsed.data.endDate ? dateKeyFromInput(parsed.data.endDate) : null;
  const schedules = parsed.data.schedules.map((schedule) => ({
    ...schedule,
    startDate: dateKeyFromInput(schedule.startDate),
    endDate: schedule.endDate ? dateKeyFromInput(schedule.endDate) : schedule.endDate,
  }));
  if (!isValidDate(startDate) || (endDate && !isValidDate(endDate))) {
    sendBadRequest(res, "Revisa las fechas del medicamento.");
    return;
  }
  if (endDate && endDate < startDate) {
    sendBadRequest(res, "La fecha final debe ser igual o posterior a la inicial.");
    return;
  }
  const scheduleError = scheduleErrors(schedules, startDate, endDate);
  if (scheduleError) {
    sendBadRequest(res, scheduleError);
    return;
  }

  const viewer = await getProfileOrRespond(getClerkUserId(res), res);
  if (!viewer) return;
  if (viewer.role !== "PATIENT") {
    res.status(403).json({ error: "Solo la persona titular puede modificar sus medicamentos." });
    return;
  }

  const medicationId = await db.transaction(async (tx) => {
    const [medication] = await tx
      .insert(medicationsTable)
      .values({
        patientId: viewer.id,
        name: parsed.data.name.trim(),
        presentation: parsed.data.presentation.trim(),
        prescribedDose: parsed.data.prescribedDose.trim(),
        notes: parsed.data.notes?.trim() || null,
        startDate,
        endDate,
      })
      .returning({ id: medicationsTable.id });
    if (!medication) throw new Error("Medication insert did not return an id.");

    await tx.insert(medicationSchedulesTable).values(
      schedules.map((schedule) => ({
        medicationId: medication.id,
        time: schedule.time,
        weekdays: schedule.weekdays,
        startDate: schedule.startDate,
        endDate: schedule.endDate ?? null,
      })),
    );
    return medication.id;
  });

  await writeAudit(viewer.id, viewer.id, "medication.created", "medication", String(medicationId));
  const response = await loadMedicationResponse(medicationId);
  if (!response) {
    res.status(500).json({ error: "No se pudo recuperar el medicamento creado." });
    return;
  }
  res.status(201).json(CreateMedicationResponse.parse(response));
});

router.patch("/medications/:id", async (req, res): Promise<void> => {
  const params = UpdateMedicationParams.safeParse(req.params);
  const parsed = UpdateMedicationBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    sendBadRequest(res, "Revisa la información del medicamento.");
    return;
  }
  const startDate = parsed.data.startDate === undefined ? undefined : dateKeyFromInput(parsed.data.startDate);
  const endDate =
    parsed.data.endDate === undefined || parsed.data.endDate === null
      ? parsed.data.endDate
      : dateKeyFromInput(parsed.data.endDate);
  const schedules = parsed.data.schedules?.map((schedule) => ({
    ...schedule,
    startDate: dateKeyFromInput(schedule.startDate),
    endDate: schedule.endDate ? dateKeyFromInput(schedule.endDate) : schedule.endDate,
  }));
  if (startDate && !isValidDate(startDate)) {
    sendBadRequest(res, "La fecha inicial no es válida.");
    return;
  }
  if (endDate && !isValidDate(endDate)) {
    sendBadRequest(res, "La fecha final no es válida.");
    return;
  }
  if (
    startDate &&
    endDate &&
    endDate < startDate
  ) {
    sendBadRequest(res, "La fecha final debe ser igual o posterior a la inicial.");
    return;
  }
  if (schedules) {
    const scheduleError = scheduleErrors(
      schedules,
      startDate ?? "0000-01-01",
      endDate,
    );
    if (scheduleError) {
      sendBadRequest(res, scheduleError);
      return;
    }
  }

  const viewer = await getProfileOrRespond(getClerkUserId(res), res);
  if (!viewer) return;
  if (viewer.role !== "PATIENT") {
    res.status(403).json({ error: "Solo la persona titular puede modificar sus medicamentos." });
    return;
  }

  const [existing] = await db
    .select()
    .from(medicationsTable)
    .where(and(eq(medicationsTable.id, params.data.id), eq(medicationsTable.patientId, viewer.id)))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "No se encontró ese medicamento." });
    return;
  }

  const scheduleError = schedules
    ? scheduleErrors(
        schedules,
        startDate ?? existing.startDate,
        endDate === undefined ? existing.endDate : endDate,
      )
    : null;
  if (scheduleError) {
    sendBadRequest(res, scheduleError);
    return;
  }

  const updates: Partial<typeof medicationsTable.$inferInsert> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name.trim();
  if (parsed.data.presentation !== undefined) updates.presentation = parsed.data.presentation.trim();
  if (parsed.data.prescribedDose !== undefined) updates.prescribedDose = parsed.data.prescribedDose.trim();
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes?.trim() || null;
  if (parsed.data.active !== undefined) updates.active = parsed.data.active;
  if (startDate !== undefined) updates.startDate = startDate;
  if (endDate !== undefined) updates.endDate = endDate;

  await db.transaction(async (tx) => {
    if (Object.keys(updates).length > 0) {
      await tx.update(medicationsTable).set(updates).where(eq(medicationsTable.id, existing.id));
    }
    if (schedules) {
      await tx
        .delete(medicationSchedulesTable)
        .where(eq(medicationSchedulesTable.medicationId, existing.id));
      await tx.insert(medicationSchedulesTable).values(
        schedules.map((schedule) => ({
          medicationId: existing.id,
          time: schedule.time,
          weekdays: schedule.weekdays,
          startDate: schedule.startDate,
          endDate: schedule.endDate ?? null,
        })),
      );
    }
  });
  if (parsed.data.active === false) await removeFuturePendingEvents(existing.id);

  await writeAudit(viewer.id, viewer.id, "medication.updated", "medication", String(existing.id));
  const response = await loadMedicationResponse(existing.id);
  if (!response) {
    res.status(404).json({ error: "No se encontró ese medicamento." });
    return;
  }
  res.json(UpdateMedicationResponse.parse(response));
});

router.delete("/medications/:id", async (req, res): Promise<void> => {
  const params = DeactivateMedicationParams.safeParse(req.params);
  if (!params.success) {
    sendBadRequest(res, "El identificador del medicamento no es válido.");
    return;
  }
  const viewer = await getProfileOrRespond(getClerkUserId(res), res);
  if (!viewer) return;
  if (viewer.role !== "PATIENT") {
    res.status(403).json({ error: "Solo la persona titular puede desactivar sus medicamentos." });
    return;
  }
  const [medication] = await db
    .update(medicationsTable)
    .set({ active: false })
    .where(and(eq(medicationsTable.id, params.data.id), eq(medicationsTable.patientId, viewer.id)))
    .returning({ id: medicationsTable.id });
  if (!medication) {
    res.status(404).json({ error: "No se encontró ese medicamento." });
    return;
  }
  await removeFuturePendingEvents(medication.id);
  await writeAudit(viewer.id, viewer.id, "medication.deactivated", "medication", String(medication.id));
  res.status(204).send(DeactivateMedicationResponse.parse(undefined));
});

export default router;
