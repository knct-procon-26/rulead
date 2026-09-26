import { v2 } from "@google-cloud/translate";

const translator = new v2.Translate({
  key: process.env.GOOGLE_TRANSLATION_API_KEY,
});
const CHUNK_SIZE = 128;

export async function googleTranslate(
  texts: string[],
  from: string,
  to: string,
) {
  if (texts.length === 0) return [];

  const results: string[] = [];
  for (let i = 0; i < texts.length; i += CHUNK_SIZE) {
    const chunk = texts.slice(i, i + CHUNK_SIZE);

    const [translations] = await translator.translate(chunk, {
      from,
      to,
      format: "text",
    });

    results.push(
      ...(Array.isArray(translations) ? translations : [translations]),
    );
  }

  return results;
}

// console.log(
//   await googleTranslate(
//     ["Don't be afraid.", "skateboarding is prohibited.", "WOW! DUDE!"],
//     "en",
//     "ja",
//   ),
// );
