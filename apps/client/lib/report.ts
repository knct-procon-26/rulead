import { api } from "./client";

export async function report(reason: string, ruleId?: string, parkId?: number) {
  await api.api.report.$post({
    json: { reason, ruleId: ruleId ?? null, parkId: parkId ?? null },
  });
}
