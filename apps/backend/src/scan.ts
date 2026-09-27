import { zValidator } from "@hono/zod-validator";
import img2rules from "./lib/img2rules";
import { Hono } from "hono";
import z, { number } from "zod";
import { db } from "./db/client";
import { parks } from "./db/schema/parks";
import { eq, sql } from "drizzle-orm"
import { Result } from "pg";

const app = new Hono();

const extractRulesSchema = z.object({
  base64Image: z.base64(),
});

const scan = app.post(
  "/",
  zValidator("json", extractRulesSchema),
  async (c) => {
    const data = c.req.valid("json");
    const result = await img2rules(data.base64Image);
    return c.json({
      success: true,
      rules: result,
    });
  },
);

app.get("/api/parks/search", async(c) => {
  const lat = Number(c.req.query("lat"));
  const lng = Number(c.req.query("lng"));
  if (!lat || !lng){
    return c.json({error: "latitude or longitude is null"}, 400);
  }
  try {
      const mapdate = await db.select().from(parks).
      where(sql`ST_Contains(${parks.area}, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))`).limit(1);
    if (mapdate.length == 0){
      return c.json(null);
    }
    return c.json(mapdate[0]);
  } catch(error){
    console.error(error);
    return c.json({error: "Server Error"}, 500);
  }
})
export default scan;
