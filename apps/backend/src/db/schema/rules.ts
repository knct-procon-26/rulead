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
import { icons } from "./icons";

export const rules = pgTable("rules", {
  id: uuid("id").primaryKey(),
  textEn: text("text_en").notNull(),
  iconId: integer("icon_id")
    .notNull()
    .references(() => icons.id),
  ...timestamps,
});
