import { createInsertSchema } from "drizzle-zod";
import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { medicaremUsersTable } from "./medicarem-users";

export const syncLogsTable = pgTable(
  "sync_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => medicaremUsersTable.id, { onDelete: "cascade" }),
    processed: integer("processed").notNull(),
    duplicates: integer("duplicates").notNull(),
    success: boolean("success").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sync_logs_user_created_idx").on(table.userId, table.createdAt)],
);

export const auditLogsTable = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    actorUserId: integer("actor_user_id").notNull().references(() => medicaremUsersTable.id, { onDelete: "cascade" }),
    subjectUserId: integer("subject_user_id").references(() => medicaremUsersTable.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, string | number | boolean | null>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_logs_subject_created_idx").on(table.subjectUserId, table.createdAt)],
);

export const insertSyncLogSchema = createInsertSchema(syncLogsTable).omit({
  id: true,
  createdAt: true,
});
export const insertAuditLogSchema = createInsertSchema(auditLogsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSyncLog = z.infer<typeof insertSyncLogSchema>;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
