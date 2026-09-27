import {
  customType,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const multiPolygon = customType<{ data: string; driverData: string }>({
  dataType() {
    return "geometry(MultiPolygon,4326)";
  },
});

export const osmAreas = pgTable(
  "osm_areas",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    /** "w123"（way）/ "r456"（relation） */
    osmId: text("osm_id").notNull(),
    name: text("name").notNull(),
    nameEn: text("name_en"),
    kind: text("kind").notNull(),
    area: multiPolygon("area").notNull(),
  },
  (t) => [
    uniqueIndex("osm_areas_osm_id_unique").on(t.osmId),
    index("osm_areas_area_gist_index").using("gist", t.area),
  ],
);
