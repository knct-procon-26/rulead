import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { SOURCE_LANGUAGE, type LanguageCode } from "@/lib/language";

type SourceRule = { id: string; text: string };
export type TranslationStatus = "idle" | "loading" | "error";

const cache = new Map<string, string>();
const cacheKey = (language: LanguageCode, ruleId: string) =>
  `${language}\n${ruleId}`;

export function useTranslatedTexts(
  rules: SourceRule[],
  language: LanguageCode,
) {
  const [status, setStatus] = useState<TranslationStatus>("idle");
  const idsKey = rules.map((r) => r.id).join(",");

  useEffect(() => {
    if (language === SOURCE_LANGUAGE) {
      setStatus("idle");
      return;
    }
    const missing = rules.filter((r) => !cache.has(cacheKey(language, r.id)));
    if (missing.length === 0) {
      setStatus("idle");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    (async () => {
      try {
        const res = await api.api.translate.$post({
          json: {
            rules: missing.map((r) => ({ id: r.id, text: r.text })),
            to: language,
          },
        });
        if (!res.ok) throw new Error(`translate failed: ${res.status}`);
        const data = await res.json();
        for (const r of data.rules) {
          if (r.text) cache.set(cacheKey(language, r.id), r.text);
        }
        if (!cancelled) setStatus("idle");
      } catch (e) {
        console.warn(e);
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [idsKey, language]);

  const textOf = useCallback(
    (rule: SourceRule) =>
      language === SOURCE_LANGUAGE
        ? rule.text
        : (cache.get(cacheKey(language, rule.id)) ?? rule.text),
    [language, status],
  );

  return { textOf, status };
}

export function cachedText(rule: SourceRule, language: LanguageCode): string {
  return language === SOURCE_LANGUAGE
    ? rule.text
    : (cache.get(cacheKey(language, rule.id)) ?? rule.text);
}
