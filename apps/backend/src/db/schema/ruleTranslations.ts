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

export const ruleTranslations = pgTable(
  "rule_translations",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    ruleId: uuid("rule_id")
      .notNull()
      .references(() => rules.id),
    languageCode: text("language_code").notNull(),
    text: text("text").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("rule_translations_rule_language_unique").on(
      t.ruleId,
      t.languageCode,
    ),
  ],
);
