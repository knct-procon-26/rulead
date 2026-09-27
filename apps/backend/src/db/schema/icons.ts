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

export const icons = pgTable(
  "icons",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: text("name").notNull(),
    iconType: text("icon_type").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("icons_name_type_unique").on(t.name, t.iconType)],
);
