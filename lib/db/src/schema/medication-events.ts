import { createInsertSchema } from "drizzle-zod";
import { index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { medicaremUsersTable } from "./medicarem-users";
import { medicationsTable, medicationSchedulesTable } from "./medications";

export const scheduledEventsTable = pgTable(
  "scheduled_events",
  {
    id: serial("id").primaryKey(),
    externalId: text("external_id").notNull(),
    patientId: integer("patient_id").notNull().references(() => medicaremUsersTable.id, { onDelete: "cascade" }),
    medicationId: integer("medication_id").references(() => medicationsTable.id, { onDelete: "set null" }),
    scheduleId: integer("schedule_id").references(() => medicationSchedulesTable.id, { onDelete: "set null" }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("PENDING"),
    reportedAt: timestamp("reported_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("scheduled_events_external_id_unique").on(table.externalId),
    index("scheduled_events_patient_time_idx").on(table.patientId, table.scheduledAt),
  ],
);

export const medicationEventRecordsTable = pgTable(
  "medication_event_records",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull().references(() => scheduledEventsTable.id, { onDelete: "cascade" }),
    clientEventId: text("client_event_id").notNull(),
    status: text("status").notNull(),
    reportedAt: timestamp("reported_at", { withTimezone: true }).notNull(),
    source: text("source").notNull().default("web"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("medication_event_records_client_event_unique").on(table.clientEventId),
    index("medication_event_records_event_idx").on(table.eventId),
  ],
);

export const notificationLogsTable = pgTable(
  "notification_logs",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull().references(() => scheduledEventsTable.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    status: text("status").notNull(),
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("notification_logs_event_idx").on(table.eventId)],
);

export const insertScheduledEventSchema = createInsertSchema(scheduledEventsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertMedicationEventRecordSchema = createInsertSchema(medicationEventRecordsTable).omit({
  id: true,
  createdAt: true,
});
export const insertNotificationLogSchema = createInsertSchema(notificationLogsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertScheduledEvent = z.infer<typeof insertScheduledEventSchema>;
export type InsertMedicationEventRecord = z.infer<typeof insertMedicationEventRecordSchema>;
export type InsertNotificationLog = z.infer<typeof insertNotificationLogSchema>;
export type ScheduledEvent = typeof scheduledEventsTable.$inferSelect;
