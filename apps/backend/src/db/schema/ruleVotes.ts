import {
  boolean,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./_timestamps";
import { parks } from "./parks";
import { rules } from "./rules";
import { users } from "./users";

export const ruleVotes = pgTable(
  "rule_votes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    parkId: integer("park_id")
      .notNull()
      .references(() => parks.id),
    ruleId: uuid("rule_id")
      .notNull()
      .references(() => rules.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    vote: boolean("vote"),
    source: text("source").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("rule_votes_park_rule_user_unique").on(
      t.parkId,
      t.ruleId,
      t.userId,
    ),
  ],
);
