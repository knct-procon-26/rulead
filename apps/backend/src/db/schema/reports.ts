import {
  geometry,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps, timestampsWithDeletedAt } from "./_timestamps";
import { users } from "./users";
import { parks } from "./parks";
import { rules } from "./rules";

export const reports = pgTable("reports", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  reporterId: uuid("reporter_id")
    .notNull()
    .references(() => users.id),
  parkId: integer("park_id").references(() => parks.id),
  ruleId: uuid("rule_id").references(() => rules.id),
  reason: text("reason").notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  ...timestamps,
});
