import { createInsertSchema } from "drizzle-zod";
import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { medicaremUsersTable } from "./medicarem-users";

export const caregiverAuthorizationsTable = pgTable(
  "caregiver_authorizations",
  {
    id: serial("id").primaryKey(),
    patientId: integer("patient_id").notNull().references(() => medicaremUsersTable.id, { onDelete: "cascade" }),
    caregiverId: integer("caregiver_id").references(() => medicaremUsersTable.id, { onDelete: "cascade" }),
    inviteCodeHash: text("invite_code_hash").unique(),
    status: text("status").notNull().default("PENDING"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("caregiver_authorizations_patient_status_idx").on(table.patientId, table.status),
    index("caregiver_authorizations_caregiver_status_idx").on(table.caregiverId, table.status),
  ],
);

export const insertCaregiverAuthorizationSchema = createInsertSchema(caregiverAuthorizationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCaregiverAuthorization = z.infer<typeof insertCaregiverAuthorizationSchema>;
export type CaregiverAuthorization = typeof caregiverAuthorizationsTable.$inferSelect;
