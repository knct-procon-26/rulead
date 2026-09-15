import {
  check,
  geometry,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps, timestampsWithDeletedAt } from "./_timestamps";
import { users } from "./users";
import { polygon } from "./_postgis";
import { sql } from "drizzle-orm";

export const parks = pgTable(
  "parks",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: text("name").notNull(),
    address: text("address").notNull(),
    area: polygon("area").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    ...timestampsWithDeletedAt,
  },
  (t) => [
    index("parks_area_gist_index").using("gist", t.area),
    check("parks_area_valid", sql`ST_IsValid(${t.area})`),
  ],
);
