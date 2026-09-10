import {
  geometry,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps, timestampsWithDeletedAt } from "./_timestamps";
import { parks } from "./parks";
import { rules } from "./rules";
import { users } from "./users";

export const parkRules = pgTable(
  "park_rules",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    parkId: integer("park_id")
      .notNull()
      .references(() => parks.id),
    ruleId: integer("rule_id")
      .notNull()
      .references(() => rules.id),
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    ...timestamps,
  },
  (t) => [uniqueIndex("park_rules_park_rule_unique").on(t.parkId, t.ruleId)],
);
