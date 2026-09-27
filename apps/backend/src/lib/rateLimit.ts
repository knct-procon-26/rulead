import { eq, sql } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { db } from "../db/client";
import { users } from "../db/schema";
import type { AuthContext } from "../auth";

function envInt(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isInteger(v) && v > 0 ? v : fallback;
}

export const DAILY_API_LIMIT = envInt("API_DAILY_LIMIT", 3000);
export const SCAN_COST = envInt("API_SCAN_COST", 30);

export const DEBUG_API_ENABLED = process.env.ENABLE_DEBUG_API === "true";
export const DEBUG_RESET_PATH = "/api/debug/reset-api-count";

const isNewDay = sql`(${users.apiCountResetAt} AT TIME ZONE 'Asia/Tokyo')::date < (now() AT TIME ZONE 'Asia/Tokyo')::date`;

export async function consumeApi(
  userId: string,
  cost: number,
): Promise<number> {
  const [row] = await db
    .update(users)
    .set({
      apiCallCount: sql`CASE WHEN ${isNewDay} THEN ${cost}::int ELSE ${users.apiCallCount} + ${cost}::int END`,
      apiCountResetAt: sql`CASE WHEN ${isNewDay} THEN now() ELSE ${users.apiCountResetAt} END`,
    })
    .where(eq(users.id, userId))
    .returning({ count: users.apiCallCount });
  return row?.count ?? 0;
}

export async function getApiUsage(userId: string): Promise<number> {
  const [row] = await db
    .select({
      count: sql<number>`CASE WHEN ${isNewDay} THEN 0 ELSE ${users.apiCallCount} END`,
    })
    .from(users)
    .where(eq(users.id, userId));
  return Number(row?.count ?? 0);
}

export async function resetApiUsage(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ apiCallCount: 0, apiCountResetAt: sql`now()` })
    .where(eq(users.id, userId));
}

export const rateLimit = createMiddleware<AuthContext>(async (c, next) => {
  const path = c.req.path.replace(/\/+$/, "");
  if (DEBUG_API_ENABLED && path === DEBUG_RESET_PATH) {
    await next();
    return;
  }
  const cost = c.req.method === "POST" && path === "/api/scan" ? SCAN_COST : 1;
  const used = await consumeApi(c.var.userId, cost);
  if (used > DAILY_API_LIMIT) {
    throw new HTTPException(429, {
      message: "本日の利用上限に達しました。明日また使ってください。",
    });
  }
  await next();
});

const REGISTER_WINDOW_MS = 10 * 60 * 1000;
const REGISTER_MAX_PER_WINDOW = envInt("REGISTER_LIMIT_PER_10MIN", 100);
const registerHits = new Map<string, number[]>();

export function allowRegister(ip: string | null): boolean {
  if (!ip) return true;
  const now = Date.now();
  if (registerHits.size > 10_000) {
    for (const [key, times] of registerHits) {
      if (times.every((t) => now - t >= REGISTER_WINDOW_MS))
        registerHits.delete(key);
    }
  }
  const recent = (registerHits.get(ip) ?? []).filter(
    (t) => now - t < REGISTER_WINDOW_MS,
  );
  if (recent.length >= REGISTER_MAX_PER_WINDOW) {
    registerHits.set(ip, recent);
    return false;
  }
  recent.push(now);
  registerHits.set(ip, recent);
  return true;
}
