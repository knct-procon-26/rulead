import { choice, TypeSafeClient } from "@typesafe-ai/sdk";
import { log, logs } from "./logger";

export const jevClient = new TypeSafeClient({
  apiKey: process.env.JEV_API_KEY,
});

const NONE = "none_of_the_above";

type JevChoiceQuestion<K extends string | number> = {
  key: K;
  text: string;
  options: string[];
  allowNone?: boolean;
};

export async function askJevChoice<K extends string | number>(opts: {
  instruction: string;
  background?: string;
  questions: JevChoiceQuestion<K>[];
}): Promise<Map<K, number | null>> {
  const result = new Map<K, number | null>();

  const asked = opts.questions.filter((q) => q.options.length > 0);
  for (const q of opts.questions) {
    if (q.options.length === 0) result.set(q.key, null);
  }
  if (asked.length === 0) return result;

  const jevRes = await jevClient.systemOne({
    state: {
      common_instruction: opts.instruction,
      ...(opts.background ? { background: opts.background } : {}),
    },
    questions: Object.fromEntries(
      asked.map((q) => [
        String(q.key),
        choice(q.text, {
          ...Object.fromEntries(
            q.options.map((o, idx) => [idx.toString(), `"${o}"`]),
          ),
          ...((q.allowNone ?? true) ? { [NONE]: "none of the above" } : {}),
        }),
      ]),
    ),
  });

  log(
    "jev",
    `入力トークン：${jevRes.usage.input_tokens} 出力トークン：${jevRes.usage.output_tokens}`,
  );

  const byKey = new Map(asked.map((q) => [String(q.key), q]));

  for (const [key, answer] of Object.entries(jevRes.answers)) {
    const q = byKey.get(key);
    if (!q) continue;

    log("jev", `${q.text} を確かめました。`);
    logs(
      "jev",
      Object.entries(answer.probabilities).map(
        ([k, p]) =>
          `${k === NONE ? "none of the above" : q.options[Number(k)]}: ${p * 100}%`,
      ),
    );
    log("jev", `confidence: ${answer.confidence * 100}`);

    result.set(q.key, answer.choice === NONE ? null : Number(answer.choice));
  }

  return result;
}
