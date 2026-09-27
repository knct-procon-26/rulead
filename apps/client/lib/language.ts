import { useSyncExternalStore } from "react";

export const LANGUAGES = [
  { code: "ja", label: "日本語", english: "Japanese" },
  { code: "en", label: "English", english: "English" },

  { code: "zh-CN", label: "简体中文", english: "Chinese (Simplified)" },
  { code: "zh-TW", label: "繁體中文", english: "Chinese (Traditional)" },
  { code: "ko", label: "한국어", english: "Korean" },
  { code: "mn", label: "Монгол", english: "Mongolian" },

  { code: "vi", label: "Tiếng Việt", english: "Vietnamese" },
  { code: "th", label: "ไทย", english: "Thai" },
  { code: "id", label: "Bahasa Indonesia", english: "Indonesian" },
  { code: "ms", label: "Bahasa Melayu", english: "Malay" },
  { code: "tl", label: "Filipino", english: "Filipino" },
  { code: "my", label: "မြန်မာ", english: "Burmese" },
  { code: "km", label: "ខ្មែរ", english: "Khmer" },
  { code: "lo", label: "ລາວ", english: "Lao" },

  { code: "hi", label: "हिन्दी", english: "Hindi" },
  { code: "bn", label: "বাংলা", english: "Bengali" },
  { code: "ur", label: "اردو", english: "Urdu" },
  { code: "ne", label: "नेपाली", english: "Nepali" },
  { code: "si", label: "සිංහල", english: "Sinhala" },
  { code: "ta", label: "தமிழ்", english: "Tamil" },
  { code: "te", label: "తెలుగు", english: "Telugu" },
  { code: "ml", label: "മലയാളം", english: "Malayalam" },
  { code: "kn", label: "ಕನ್ನಡ", english: "Kannada" },
  { code: "mr", label: "मराठी", english: "Marathi" },
  { code: "gu", label: "ગુજરાતી", english: "Gujarati" },
  { code: "pa", label: "ਪੰਜਾਬੀ", english: "Punjabi" },

  { code: "kk", label: "Қазақ тілі", english: "Kazakh" },
  { code: "uz", label: "Oʻzbekcha", english: "Uzbek" },
  { code: "fa", label: "فارسی", english: "Persian" },
  { code: "ar", label: "العربية", english: "Arabic" },
  { code: "he", label: "עברית", english: "Hebrew" },
  { code: "tr", label: "Türkçe", english: "Turkish" },

  { code: "es", label: "Español", english: "Spanish" },
  { code: "fr", label: "Français", english: "French" },
  { code: "de", label: "Deutsch", english: "German" },
  { code: "it", label: "Italiano", english: "Italian" },
  { code: "pt", label: "Português", english: "Portuguese" },
  { code: "ru", label: "Русский", english: "Russian" },
  { code: "uk", label: "Українська", english: "Ukrainian" },
  { code: "pl", label: "Polski", english: "Polish" },
  { code: "nl", label: "Nederlands", english: "Dutch" },
  { code: "sv", label: "Svenska", english: "Swedish" },
  { code: "el", label: "Ελληνικά", english: "Greek" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const SOURCE_LANGUAGE: LanguageCode = "en";

export function isLanguageCode(value: string): value is LanguageCode {
  return LANGUAGES.some((l) => l.code === value);
}

const LOCALE_ALIASES: Record<string, LanguageCode> = {
  iw: "he",
  in: "id",
  fil: "tl",
};

function detectLanguage(): LanguageCode {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const [lang, ...rest] = locale.toLowerCase().split(/[-_]/);

    if (lang === "zh") {
      const traditional = rest.some(
        (p) => p === "hant" || p === "tw" || p === "hk" || p === "mo",
      );
      return traditional ? "zh-TW" : "zh-CN";
    }

    const code = LOCALE_ALIASES[lang] ?? lang;
    return isLanguageCode(code) ? code : "en";
  } catch {
    return "ja";
  }
}

let current: LanguageCode = detectLanguage();
const listeners = new Set<() => void>();

export function setLanguage(code: LanguageCode) {
  if (code === current) return;
  current = code;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return current;
}

export function useLanguage(): [LanguageCode, (code: LanguageCode) => void] {
  const language = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return [language, setLanguage];
}
