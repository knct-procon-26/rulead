import OpenAI from "openai";
import { qdrantClient as DBClient } from "./qdrantClient";
import z from "zod";
import { zodTextFormat } from "openai/helpers/zod.js";

const llmClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const outputSchema = z.object({
  isRulesSign: z.boolean(),
  rules: z.array(
    z.object({
      content: z.string().describe("in English"),
    }),
  ),
});

export default async function img2rules(base64Image: string) {
  const response = await llmClient.responses.parse({
    model: "gpt-5.4",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `画像からルールだけを抽出し、英語で教えて。\
            ですが、ルールを抽出するための条件である、\
            1.画像に映っている文字が公園のルールを示していること、\
            2.ディスプレイ越しではなく、直接看板やそれに準ずる掲示物を撮影した写真であること、\
            の二つをどちらも満たしている場合のみ、ルールの抽出を行ってください。\
            もし、いずれかの条件を満たしていない場合は、ルールの抽出は行わず、\
            「This is not rule sign.」とだけ返してください。\
          ただし、「野球やサッカーを禁止します」といった複数のルールが一文になっているものは、\
          それぞれ、最小単位のルールに分割してください。`,
          },
          {
            type: "input_image",
            image_url: `data:image/jpeg;base64,${base64Image}`,
            detail: "auto",
          },
        ],
      },
    ],
    text: {
      format: zodTextFormat(outputSchema, "rules"),
    },
  });

  const output = response.output_parsed;
  if (output?.isRulesSign === undefined || output.isRulesSign === false) {
    return Promise.reject("This is not rule sign.");
  }

  const rules = output.rules.map((i) => i.content);

  const embeddings = await llmClient.embeddings.create({
    model: "text-embedding-3-small",
    input: rules,
  });

  const ruleVectors = embeddings.data.map((i) => i.embedding);
  const resultPromises = [];

  for (const i in ruleVectors) {
    const result = (async () => {
      const searchResults = await DBClient.query("rules", {
        query: ruleVectors[i],
        limit: 3,
        with_payload: true,
        score_threshold: 0.4,
      });
      const scores = searchResults.points.map((i) => i.score);
      const selections: { id: string; text: string }[] =
        searchResults.points.map((i) => {
          return {
            id: i.id as string,
            text: i.payload!.text as string,
          };
        });

      if (selections.length >= 1) {
        const needlessToAsk = scores[0] > 0.9 && (scores[1] ?? 0) < 0.9;
        let index;
        if (needlessToAsk) {
          index = 0;
        } else {
          const response = await llmClient.responses.parse({
            model: "gpt-5.4-mini",
            input: `${selections
              .map((v, i) => {
                return `${i}. ${v.text}`;
              })
              .join("\n")}\n Select the same rules as "${rules[i]}".\
          If none of them are suitable, select 9.`,
            text: {
              format: zodTextFormat(z.object({ index: z.number() }), "rule"),
            },
          });
          index = response.output_parsed?.index;
        }

        if (index != null && index !== 9) {
          if (selections[index].id !== "nothing") {
            return selections[index];
          }
        }
      }
      const uuid = crypto.randomUUID();
      await DBClient.upsert("rules", {
        wait: true,
        points: [
          {
            id: uuid,
            vector: ruleVectors[i],
            payload: {
              text: rules[i],
            },
          },
        ],
      });
      return { id: uuid, text: rules[i] };
    })();
    resultPromises.push(result);
  }

  const results = await Promise.all(resultPromises);
  return results;
}
