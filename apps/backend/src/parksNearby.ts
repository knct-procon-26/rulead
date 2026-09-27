import { Hono } from "hono";
import z from "zod";
import { and, asc, inArray, isNull, sql } from "drizzle-orm";
import glyphMap from "@react-native-vector-icons/material-design-icons/glyphmaps/MaterialDesignIcons.json";
import { db } from "./db/client";
import { parkRules, parks } from "./db/schema";
import { AuthContext } from "./auth";
import { loadRules, type RuleResult } from "./lib/createRule";
import { zValidator } from "./lib/validator";
import {
  LANGUAGE_CODE_RE,
  RULE_SOURCE_LANGUAGE,
  translateRuleTexts,
} from "./lib/ruleTranslate";

const GLYPHS = glyphMap as Record<string, number>;

export type NearbyRule = RuleResult & {
  iconCode: number;
  textLocal?: string;
};

const querySchema = z.object({
  lat: z.string(),
  lng: z.string(),
  lang: z.string().optional(),
});

const RADIUS_M = 1000;

const BBOX_DEG = 0.02;

const app = new Hono<AuthContext>();

const parksRoute = app.get(
  "/nearby",
  zValidator("query", querySchema),
  async (c) => {
    const query = c.req.valid("query");
    const lat = Number.parseFloat(query.lat);
    const lng = Number.parseFloat(query.lng);
    const lang =
      query.lang !== undefined &&
      LANGUAGE_CODE_RE.test(query.lang) &&
      query.lang !== RULE_SOURCE_LANGUAGE
        ? query.lang
        : null;
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
        address: parks.address,
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

    const parkIds = rows.map((r) => r.id);
    const links =
      parkIds.length === 0
        ? []
        : await db
            .select({ parkId: parkRules.parkId, ruleId: parkRules.ruleId })
            .from(parkRules)
            .where(
              and(
                inArray(parkRules.parkId, parkIds),
                isNull(parkRules.hiddenAt),
              ),
            )
            .orderBy(asc(parkRules.createdAt), asc(parkRules.id));

    const loaded = await loadRules([...new Set(links.map((l) => l.ruleId))]);

    let translated = new Map<string, string>();
    if (lang !== null && loaded.size > 0) {
      try {
        translated = await translateRuleTexts(
          [...loaded.values()].map((r) => ({ id: r.id, text: r.text })),
          lang,
        );
      } catch (e) {
        console.error("nearby translate failed", e);
      }
    }
    const enriched = new Map<string, NearbyRule>();
    for (const [id, rule] of loaded) {
      const code = GLYPHS[rule.iconName];
      const local = translated.get(id);
      enriched.set(id, {
        ...rule,
        iconCode: typeof code === "number" ? code : -1,
        ...(local ? { textLocal: local } : {}),
      });
    }

    const rulesOf = new Map<number, NearbyRule[]>();
    for (const l of links) {
      const rule = enriched.get(l.ruleId);
      if (!rule) continue;
      const list = rulesOf.get(l.parkId);
      if (list) list.push(rule);
      else rulesOf.set(l.parkId, [rule]);
    }

    return c.json(
      {
        type: "FeatureCollection",
        features: rows.map((r) => ({
          type: "Feature",
          id: r.id,
          properties: {
            name: r.name,
            address: r.address,
            rules: rulesOf.get(r.id) ?? [],
          },
          geometry: JSON.parse(r.geometry) as unknown,
        })),
      },
      200,
    );
  },
);

export default parksRoute;
