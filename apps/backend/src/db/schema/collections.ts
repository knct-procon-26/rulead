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
import { rules } from "./rules";
import { users } from "./users";

export const collections = pgTable(
  "collections",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    ruleId: uuid("rule_id")
      .notNull()
      .references(() => rules.id),
    count: integer("count").notNull().default(0),
    lastCollectedAt: timestamp("last_collected_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ...timestamps,
  },
  (t) => [uniqueIndex("collections_user_rule_unique").on(t.userId, t.ruleId)],
);
