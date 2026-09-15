import {
  geometry,
  index,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const spots = pgTable(
  "spots",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),

    location: geometry("location", {
      type: "point",
      mode: "xy",
      srid: 4326,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("spots_location_gist").using("gist", t.location)],
);
