/**
 * 参考実装：アプリの ParkApi.kt が呼ぶ API（Hono + drizzle + PostGIS）
 *
 *   GET /parks/nearby?lat=<セル中心の緯度>&lng=<セル中心の経度>
 *   → GeoJSON FeatureCollection（features[].id = parks.id, properties.name = parks.name）
 *
 * 組み込み例:
 *   import { parksRoute } from "./routes/parksNearby";
 *   app.route("/parks", parksRoute);   // 認証ミドルウェアの後ろに置く
 */
import { Hono } from "hono";
import { and, isNull, sql } from "drizzle-orm";
import { db } from "./db/client";
import { parks } from "./db/schema";
import { AuthContext } from "./auth";

/**
 * セル中心からこの距離（メートル）以内に一部でもかかる公園を返す。
 * 1km セルの中心から角までは約 707m なので、セル内のどこにいても
 * その周りの公園を取りこぼさないよう余裕を持たせている。
 */
const RADIUS_M = 1000;

/**
 * GiST インデックス（parks_area_gist_index）を効かせるための粗い絞り込み（度）。
 * 緯度 60° までなら RADIUS_M を含む大きさ。
 */
const BBOX_DEG = 0.02;

const app = new Hono<AuthContext>();

const parksRoute = app.get("/nearby", async (c) => {
  const lat = Number.parseFloat(c.req.query("lat") ?? "");
  const lng = Number.parseFloat(c.req.query("lng") ?? "");
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return c.json({ error: "invalid lat/lng" }, 400);
  }

  const center = sql`ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)`;

  const rows = await db
    .select({
      id: parks.id,
      name: parks.name,
      // 小数点以下 6 桁（約 10cm）に丸めて転送量を減らす
      geometry: sql<string>`ST_AsGeoJSON(${parks.area}, 6)`,
    })
    .from(parks)
    .where(
      and(
        isNull(parks.deletedAt),
        sql`${parks.area} && ST_Expand(${center}, ${BBOX_DEG}::float8)`,
        sql`ST_DWithin(${parks.area}::geography, ${center}::geography, ${RADIUS_M}::float8)`,
      ),
    );

  return c.json({
    type: "FeatureCollection",
    features: rows.map((r) => ({
      type: "Feature",
      id: r.id, // アプリ側では "12" のような文字列として扱う。日をまたいでも変わらないこと
      properties: { name: r.name },
      geometry: JSON.parse(r.geometry),
    })),
  });
});

export default parksRoute;
