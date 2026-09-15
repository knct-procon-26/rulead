import WKB from "ol/format/WKB";
import GeoJSON from "ol/format/GeoJSON";
import { customType } from "drizzle-orm/pg-core";
import type { Polygon } from "geojson";
import { sql } from "drizzle-orm";

const wkb = new WKB();
const geojson = new GeoJSON();

export const polygon = customType<{ data: Polygon; driverData: string }>({
  dataType() {
    return "geometry(Polygon,4326)";
  },
  toDriver(data) {
    return sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(data)}), 4326)`;
  },
  fromDriver(value: unknown) {
    if (typeof value === "object" && value !== null) return value as Polygon;
    const str = String(value);
    if (str.startsWith("{")) return JSON.parse(str) as Polygon;
    const geom = wkb.readGeometry(str);
    if (geom.getType() !== "Polygon") {
      throw new Error(`Polygon ではなく ${geom.getType()} でした`);
    }
    return geojson.writeGeometryObject(geom) as Polygon;
  },
});
