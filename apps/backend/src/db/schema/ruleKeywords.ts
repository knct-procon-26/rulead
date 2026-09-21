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
import { keywords } from "./keywords";

export const ruleKeywords = pgTable(
  "rule_keywords",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    ruleId: uuid("rule_id")
      .notNull()
      .references(() => rules.id),
    keywordId: integer("keyword_id")
      .notNull()
      .references(() => keywords.id),
    ...timestamps,
  },
  (t) => [uniqueIndex("rule_keywords_unique").on(t.ruleId, t.keywordId)],
);
