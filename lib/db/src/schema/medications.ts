import { createInsertSchema } from "drizzle-zod";
import { date, index, integer, pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { medicaremUsersTable } from "./medicarem-users";

export const medicationsTable = pgTable(
  "medications",
  {
    id: serial("id").primaryKey(),
    patientId: integer("patient_id").notNull().references(() => medicaremUsersTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    presentation: text("presentation").notNull().default(""),
    prescribedDose: text("prescribed_dose").notNull(),
    notes: text("notes"),
    active: boolean("active").notNull().default(true),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [index("medications_patient_active_idx").on(table.patientId, table.active)],
);

export const medicationSchedulesTable = pgTable(
  "medication_schedules",
  {
    id: serial("id").primaryKey(),
    medicationId: integer("medication_id").notNull().references(() => medicationsTable.id, { onDelete: "cascade" }),
    time: text("time").notNull(),
    weekdays: integer("weekdays").array().notNull().default([0, 1, 2, 3, 4, 5, 6]),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [index("medication_schedules_medication_idx").on(table.medicationId)],
);

export const insertMedicationSchema = createInsertSchema(medicationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertMedicationScheduleSchema = createInsertSchema(medicationSchedulesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMedication = z.infer<typeof insertMedicationSchema>;
export type InsertMedicationSchedule = z.infer<typeof insertMedicationScheduleSchema>;
export type Medication = typeof medicationsTable.$inferSelect;
export type MedicationSchedule = typeof medicationSchedulesTable.$inferSelect;
