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
import { icons } from "./icons";

export const keywords = pgTable(
  "keywords",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    index: integer("index").notNull(),
    label: text("label").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("keywords_index_unique").on(t.index)],
);
