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

export const icons = pgTable("icons", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  ...timestamps,
});
