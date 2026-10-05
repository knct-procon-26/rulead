import OpenAI from "openai";
import { qdrantClient as DBClient } from "./qdrantClient";
import z from "zod";
import { zodTextFormat } from "openai/helpers/zod.js";
import { choice, TypeSafeClient } from "@typesafe-ai/sdk";
import { log, logs } from "./logger";
import { llmClient } from "./llmClient";
import { askJevChoice, jevClient } from "./jevClient";
import { createRules, loadRules, type RuleResult } from "./createRule";

const outputSchema = z.object({
  isRulesSign: z.boolean(),
  rules: z.array(
    z.object({
      content: z.string().describe("in English"),
    }),
  ),
});

// export class NotRuleSignError extends Error {
//   constructor() {
//     super("This is not rule sign.");
//   }
// }

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
  if (rules.length === 0) {
    return Promise.reject("This is not rule sign.");
  }

  const embeddings = await llmClient.embeddings.create({
    model: "text-embedding-3-small",
    input: rules,
  });

  const ruleVectors = embeddings.data.map((i) => i.embedding);
  // const resultPromises = [];

  // 一致する rule の検索。

  const res = await DBClient.queryBatch("rules", {
    searches: ruleVectors.map((v) => ({
      query: v,
      limit: 5,
      with_payload: true,
      score_threshold: 0.3,
    })),
  });

  const selectionsList = res.map((r) =>
    r.points.map((p) => ({
      id: p.id as string,
      text: p.payload!.text as string,
    })),
  );

  const state: ("new" | "check" | number)[] = res.map((r, i) => {
    const [s0, s1] = r.points.map((p) => p.score);
    const selections = selectionsList[i];

    if (selections.length === 0) {
      log("embedding", `${rules[i]} は新規ルールです。`);
      return "new";
    }
    if (s0 > 0.9 && (s1 ?? 0) < 0.85) {
      log(
        "embedding",
        `${rules[i]} と ${selections[0].text} は同じで、${selections[1]?.text ?? "NoData"} とは異なります。`,
      );
      return 0;
    }
    log("embedding", `${rules[i]} は確認が必要です。`);
    return "check";
  });

  // for (const i in res) {
  //   state.push("check");

  //   const scores = res[i].points.map((p) => p.score);

  //   const selections: { id: string; text: string }[] = res[i].points.map(
  //     (p) => {
  //       return {
  //         id: p.id as string,
  //         text: p.payload!.text as string,
  //       };
  //     },
  //   );
  //   selectionsList.push(selections);

  //   if (selections.length >= 1) {
  //     const needlessToAsk = scores[0] > 0.9 && (scores[1] ?? 0) < 0.85;
  //     if (needlessToAsk) {
  //       log(
  //         "embedding",
  //         `${rules[i]} と ${selections[0].text} は同じで、${selections[1]?.text ?? "NoData"} とは異なります。`,
  //       );
  //       state[i] = 0;
  //     } else {
  //       log("embedding", `${rules[i]} は確認が必要です。`);
  //       state[i] = "check";
  //     }
  //   } else {
  //     log("embedding", `${rules[i]} は新規ルールです。`);
  //     state[i] = "new";
  //   }
  // }

  // 怪しいものをjevでまとめて検索
  // if (state.includes("check")) {
  //   const jevRes = await jevClient.systemOne({
  //     state: {
  //       common_instruction:
  //         "Choose a sentence that has almost the same meaning as the given text.",
  //     },
  //     questions: Object.fromEntries(
  //       rules
  //         .entries()
  //         .filter(([i, v]) => state[i] === "check")
  //         .map(([i, v]) => [
  //           i.toString(),
  //           choice(v, {
  //             ...Object.fromEntries(
  //               selectionsList[i]
  //                 .entries()
  //                 .map(([index, selection]) => [
  //                   index.toString(),
  //                   `"${selection.text}"`,
  //                 ]),
  //             ),
  //             none_of_the_above: "none of the above",
  //           }),
  //         ]),
  //     ),
  //   });

  //   log(
  //     "jev",
  //     `入力トークン：${jevRes.usage.input_tokens} 出力トークン：${jevRes.usage.output_tokens}`,
  //   );

  //   for (const stringI in jevRes.answers) {
  //     const answer = jevRes.answers[stringI];
  //     const i = Number(stringI);

  //     log("jev", `${rules[i]} を確かめました。`);
  //     logs(
  //       "jev",
  //       Object.entries(answer.probabilities).map(([key, p]) =>
  //         key === "none_of_the_above"
  //           ? `none of the above: ${p * 100}%`
  //           : `${selectionsList[i][Number(key)].text}: ${p * 100}%`,
  //       ),
  //     );
  //     log("jev", `confidence: ${answer.confidence * 100}`);

  //     if (answer.choice === "none_of_the_above") {
  //       state[i] = "new";
  //     } else {
  //       state[i] = Number(answer.choice);
  //     }
  //   }
  // }
  const chosen = await askJevChoice({
    instruction:
      "Choose a sentence that has almost the same meaning as the given text.",
    questions: rules.flatMap((r, i) =>
      state[i] === "check"
        ? [{ key: i, text: r, options: selectionsList[i].map((s) => s.text) }]
        : [],
    ),
  });
  for (const [i, c] of chosen) state[i] = c ?? "new";

  const matchedIds = state.flatMap((s, i) =>
    typeof s === "number" ? [selectionsList[i][s].id] : [],
  );
  const existing = await loadRules(matchedIds);

  const orphanIds = matchedIds.filter((id) => !existing.has(id));
  if (orphanIds.length > 0) {
    await DBClient.delete("rules", { wait: true, points: orphanIds });
  }
  state.forEach((s, i) => {
    if (typeof s === "number" && !existing.has(selectionsList[i][s].id)) {
      log("embedding", `${rules[i]} の一致先が DB に無いため新規扱いに。`);
      state[i] = "new";
    }
  });

  // const newIndexes: number[] = [];
  // const aliasOf = new Map<number, number>();
  // rules.forEach((_, i) => {
  //   if (state[i] !== "new") return;
  //   const rep = newIndexes.find(
  //     (j) => dot(ruleVectors[i], ruleVectors[j]) > 0.9,
  //   );
  //   if (rep === undefined) newIndexes.push(i);
  //   else aliasOf.set(i, rep);
  // });
  const newIndexes = rules.flatMap((_, i) => (state[i] === "new" ? [i] : []));

  const created = await createRules(
    newIndexes.map((i) => ({ vector: ruleVectors[i], text: rules[i] })),
  );
  const createdByIndex = new Map(
    newIndexes.map((ruleI, k) => [ruleI, created[k]]),
  );

  const results: RuleResult[] = rules.map((_, i) => {
    const s = state[i];
    if (s === "check") throw new Error("起こりえないエラー");
    // if (s === "new") return createdByIndex.get(aliasOf.get(i) ?? i)!;
    if (s === "new") return createdByIndex.get(i)!;
    return existing.get(selectionsList[i][s].id)!;
  });

  return [...new Map(results.map((r) => [r.id, r])).values()];
}

// // state: new を生成
// // let newRules: { id: string; text: string }[] = [];
// // if (state.includes("new")) {
// //   newRules = await createRules(
// //     rules
// //       .entries()
// //       .filter(([i, v]) => state[i] === "new")
// //       .map(([i, v]) => {
// //         return {
// //           vector: ruleVectors[i],
// //           text: v,
// //         };
// //       })
// //       .toArray(),
// //   );
// // }
// // newRules.reverse();
// const newIndexes = rules.flatMap((_, i) => (state[i] === "new" ? [i] : []));
// const created =
//   newIndexes.length > 0
//     ? await createRules(
//         newIndexes.map((i) => ({ vector: ruleVectors[i], text: rules[i] })),
//       )
//     : [];
// const createdByIndex = new Map(
//   newIndexes.map((ruleI, k) => [ruleI, created[k]]),
// );

// // rules 総まとめ
// // const results: { id: string; text: string }[] = [];
// // for (const i in rules) {
// //   if (state[i] === "check") {
// //     throw new Error("起こりえないエラー");
// //   } else if (state[i] === "new") {
// //     results.push(newRules.pop()!);
// //   } else {
// //     results.push(selectionsList[i][state[i]]);
// //   }
// // }
// const results: newRule[] = rules.map((_, i) => {
//   const s = state[i];
//   if (s === "new") return createdByIndex.get(i)!;
//   if (s === "check") throw new Error("起こりえないエラー");
//   return selectionsList[i][s];
// });

// // 重複は許さへんよ～
// const uniqueResults = [...new Map(results.map((r) => [r.id, r])).values()];

// // for (const i in ruleVectors) {
// //   const result = (async () => {
// // const searchResults = await DBClient.query("rules", {
// //   query: ruleVectors[i],
// //   limit: 3,
// //   with_payload: true,
// //   score_threshold: 0.4,
// // });
// // const scores = searchResults.points.map((i) => i.score);
// // const selections: { id: string; text: string }[] =
// //   searchResults.points.map((i) => {
// //     return {
// //       id: i.id as string,
// //       text: i.payload!.text as string,
// //     };
// //   });

// // if (selections.length >= 1) {
// //   const needlessToAsk = scores[0] > 0.9 && (scores[1] ?? 0) < 0.9;
// //   let index;
// //   if (needlessToAsk) {
// //     index = 0;
// //   } else {
// //     const response = await llmClient.responses.parse({
// //       model: "gpt-5.4-mini",
// //       input: `${selections
// //         .map((v, i) => {
// //           return `${i}. ${v.text}`;
// //         })
// //         .join("\n")}\n Select the same rules as "${rules[i]}".\
// //     If none of them are suitable, select 9.`,
// //       text: {
// //         format: zodTextFormat(z.object({ index: z.number() }), "rule"),
// //       },
// //     });
// //     index = response.output_parsed?.index;
// //   }

// //   if (index != null && index !== 9) {
// //     if (selections[index].id !== "nothing") {
// //       return selections[index];
// //     }
// //   }
// // }
// // const uuid = crypto.randomUUID();
// // await DBClient.upsert("rules", {
// //   wait: true,
// //   points: [
// //     {
// //       id: uuid,
// //       vector: ruleVectors[i],
// //       payload: {
// //         text: rules[i],
// //       },
// //     },
// //   ],
// // });
// //   return { id: uuid, text: rules[i] };
// // })();
// // resultPromises.push(result);
// // }

// // const results = await Promise.all(resultPromises);
// return uniqueResults;
// }
