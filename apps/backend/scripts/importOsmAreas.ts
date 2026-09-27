import { createReadStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";
import { Client } from "pg";

const KINDS: [key: string, values: string[]][] = [
  [
    "leisure",
    ["park", "playground", "garden", "dog_park", "common", "recreation_ground"],
  ],
  ["landuse", ["recreation_ground", "village_green"]],
];

const BATCH_SIZE = 500;
const MIN_KEEP_RATIO = 0.5;

type Row = {
  osmId: string;
  name: string;
  nameEn: string | null;
  kind: string;
  geojson: string;
};
const GEOM_SQL = `ST_Multi(ST_CollectionExtract(ST_ReducePrecision(ST_CollectionExtract(
  ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(t.geojson), 4326)), 3), 1e-7), 3))`;

function insertSql(count: number): string {
  const values = Array.from({ length: count }, (_, i) => {
    const p = i * 5;
    return `($${p + 1}::text, $${p + 2}::text, $${p + 3}::text, $${p + 4}::text, $${p + 5}::text)`;
  }).join(",\n");
  return `INSERT INTO osm_areas (osm_id, name, name_en, kind, area)
SELECT v.osm_id, v.name, v.name_en, v.kind, v.g FROM (
  SELECT t.osm_id, t.name, t.name_en, t.kind, ${GEOM_SQL} AS g
  FROM (VALUES ${values}) AS t(osm_id, name, name_en, kind, geojson)
) v
WHERE NOT ST_IsEmpty(v.g) AND ST_IsValid(v.g)
ON CONFLICT (osm_id) DO NOTHING`;
}

function kindOf(props: Record<string, unknown>): string | null {
  for (const [key, values] of KINDS) {
    const v = props[key];
    if (typeof v === "string" && values.includes(v)) return `${key}=${v}`;
  }
  return null;
}

function osmIdOf(id: unknown): string | null {
  if (typeof id !== "string") return null;
  const m = /^([awr])([0-9]+)$/.exec(id);
  if (!m) return null;
  if (m[1] !== "a") return id;
  const n = BigInt(m[2]);
  return n % 2n === 0n ? `w${n / 2n}` : `r${(n - 1n) / 2n}`;
}

function isRing(ring: unknown): boolean {
  return (
    Array.isArray(ring) &&
    ring.length >= 4 &&
    ring.every(
      (p) =>
        Array.isArray(p) &&
        p.length >= 2 &&
        Number.isFinite(p[0]) &&
        Number.isFinite(p[1]),
    )
  );
}

function isPolygonCoords(c: unknown): boolean {
  return Array.isArray(c) && c.length >= 1 && c.every(isRing);
}

function geometryOk(g: unknown): boolean {
  if (typeof g !== "object" || g === null) return false;
  const { type, coordinates } = g as { type?: unknown; coordinates?: unknown };
  if (type === "Polygon") return isPolygonCoords(coordinates);
  if (type === "MultiPolygon")
    return (
      Array.isArray(coordinates) &&
      coordinates.length >= 1 &&
      coordinates.every(isPolygonCoords)
    );
  return false;
}

function toRow(line: string): Row | null {
  const f = JSON.parse(line) as {
    id?: unknown;
    geometry?: unknown;
    properties?: Record<string, unknown> | null;
  };
  const props = f.properties ?? {};
  const kind = kindOf(props);
  const osmId = osmIdOf(f.id);
  if (kind === null || osmId === null || !geometryOk(f.geometry)) return null;
  const name = typeof props.name === "string" ? props.name : "";
  const nameEn =
    typeof props["name:en"] === "string" ? (props["name:en"] as string) : null;
  return { osmId, name, nameEn, kind, geojson: JSON.stringify(f.geometry) };
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const path = args.find((a) => !a.startsWith("--"));
  if (!path || !existsSync(path)) {
    console.error(
      "usage: bun run scripts/importOsmAreas.ts <file.geojsonseq[.gz]> [--force]",
    );
    process.exit(2);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(2);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  let read = 0;
  let skipped = 0;
  let broken = 0;
  let failed = 0;
  let dropped = 0;
  let batch: Row[] = [];

  const insertBatch = async (rows: Row[]) => {
    if (rows.length === 0) return;
    const params = rows.flatMap((r) => [
      r.osmId,
      r.name,
      r.nameEn,
      r.kind,
      r.geojson,
    ]);
    await client.query("SAVEPOINT batch");
    try {
      const res = await client.query(insertSql(rows.length), params);
      await client.query("RELEASE SAVEPOINT batch");
      dropped += rows.length - (res.rowCount ?? 0);
      return;
    } catch {
      await client.query("ROLLBACK TO SAVEPOINT batch");
      await client.query("RELEASE SAVEPOINT batch");
    }
    for (const r of rows) {
      await client.query("SAVEPOINT one");
      try {
        const res = await client.query(insertSql(1), [
          r.osmId,
          r.name,
          r.nameEn,
          r.kind,
          r.geojson,
        ]);
        await client.query("RELEASE SAVEPOINT one");
        dropped += 1 - (res.rowCount ?? 0);
      } catch (e) {
        await client.query("ROLLBACK TO SAVEPOINT one");
        await client.query("RELEASE SAVEPOINT one");
        failed++;
        console.warn(`skip ${r.osmId}: ${e instanceof Error ? e.message : e}`);
      }
    }
  };

  try {
    const [{ count: before }] = (
      await client.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM osm_areas",
      )
    ).rows;

    await client.query("BEGIN");
    await client.query("DELETE FROM osm_areas");

    const raw = createReadStream(path);
    const input = path.endsWith(".gz") ? raw.pipe(createGunzip()) : raw;
    raw.on("error", (e) => input.destroy(e));
    const lines = createInterface({ input, crlfDelay: Infinity });

    for await (const rawLine of lines) {
      const line = rawLine.replace(/^\u001e/, "").trim();
      if (line === "") continue;
      read++;
      let row: Row | null;
      try {
        row = toRow(line);
      } catch {
        broken++;
        continue;
      }
      if (row === null) {
        skipped++;
        continue;
      }
      batch.push(row);
      if (batch.length >= BATCH_SIZE) {
        await insertBatch(batch);
        batch = [];
      }
      if (read % 50_000 === 0) console.log(`read ${read} ...`);
    }
    await insertBatch(batch);

    const [{ count: after }] = (
      await client.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM osm_areas",
      )
    ).rows;
    console.log(
      `read=${read} imported=${after} skipped(tag/geometry)=${skipped} broken(json)=${broken} failed(postgis)=${failed} dropped(empty/duplicate)=${dropped} before=${before}`,
    );

    if (after === 0 || (!force && after < before * MIN_KEEP_RATIO)) {
      await client.query("ROLLBACK");
      console.error(
        `aborted: ${after} rows (was ${before}). Wrong file? Use --force to import anyway.`,
      );
      process.exitCode = 1;
      return;
    }
    await client.query("COMMIT");
    console.log("committed");
    await client.query("VACUUM ANALYZE osm_areas");
    console.log("done");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("import failed; nothing was changed", e);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

await main();
