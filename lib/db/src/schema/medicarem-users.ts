import { createInsertSchema } from "drizzle-zod";
import { boolean, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const medicaremUsersTable = pgTable(
  "medicarem_users",
  {
    id: serial("id").primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    displayName: text("display_name").notNull(),
    role: text("role").notNull().default("PATIENT"),
    timezone: text("timezone").notNull().default("America/Bogota"),
    largeText: boolean("large_text").notNull().default(true),
    notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("medicarem_users_clerk_user_unique").on(table.clerkUserId)],
);

export const insertMedicaremUserSchema = createInsertSchema(medicaremUsersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMedicaremUser = z.infer<typeof insertMedicaremUserSchema>;
export type MedicaremUser = typeof medicaremUsersTable.$inferSelect;
