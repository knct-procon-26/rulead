import { choice } from "@typesafe-ai/sdk";
import { askJevChoice, jevClient } from "./jevClient";
import { qdrantClient } from "./qdrantClient";
import { log, logs } from "./logger";
import { db } from "../db/client";
import { and, eq, inArray, or } from "drizzle-orm";
import {
  icons,
  keywords,
  ruleKeywords,
  rules as rulesTable,
} from "../db/schema";

type Keyword = { id: number; label: string; index: number };
type KeywordCandidate = { index: number; label: string };
export type IconType = "prohibition" | "caution" | "information";

export type RuleResult = {
  id: string;
  text: string;
  iconId: number;
  iconName: string;
  iconType: IconType;
  keywords: Keyword[];
};

function iconKey(name: string, iconType: string) {
  return JSON.stringify([name, iconType]);
}

// export type newRule = {
//   id: string;
//   text: string;
//   keywords: {
//     id: string;
//     name: string;
//   }[];
//   icon: string;
//   iconType: string;
// };

type RuleInput = { vector: number[]; text: string };
const KEYWORD_GROUPS = 3;

const ICON_TYPES: { value: IconType; label: string }[] = [
  { value: "prohibition", label: "Prohibition: something is forbidden" },
  { value: "caution", label: "Caution: a warning to be careful" },
  { value: "information", label: "Information: a neutral notice or guidance" },
];

// export async function createRules(rules: RuleInput[]): Promise<newRule[]> {
//   const ids = rules.map(() => crypto.randomUUID());
//   // let newRules: newRule[] = [];

//   // await qdrantClient.upsert("rules", {
//   //   wait: true,
//   //   points: rules.map((rule) => {
//   //     const uuid = crypto.randomUUID();
//   //     newRules.push({
//   //       id: uuid,
//   //       text: rule.text,
//   //       keywords: [],
//   //       icon: "",
//   //       iconType: "",
//   //     });
//   //     return {
//   //       id: uuid,
//   //       vector: rule.vector,
//   //       payload: {
//   //         text: rule.text,
//   //       },
//   //     };
//   //   }),
//   // });
//   await qdrantClient.upsert("rules", {
//     wait: true,
//     points: rules.map((r, i) => ({
//       id: ids[i],
//       vector: r.vector,
//       payload: { text: r.text },
//     })),
//   });

//   const [keywords, icons, iconTypes] = await Promise.all([
//     chooseKeywords(rules),
//     chooseIcons(rules),
//     chooseIconTypes(rules),
//   ]);

//   return rules.map((r, i) => ({
//     id: ids[i],
//     text: r.text,
//     keywords: keywords[i],
//     icon: icons[i],
//     iconType: iconTypes[i],
//   }));

//   // 適したkeywordを選択する
//   // {
//   //   const searches = rules.map((i) => ({
//   //     query: i.vector,
//   //     limit: 30,
//   //     with_payload: true,
//   //   }));
//   //   const res = await qdrantClient.queryBatch("labels", { searches });
//   //   const selectionsList: { uuid: string; id: string; name: string }[][] = [];

//   //   for (const i in res) {
//   //     const selections = res[i].points.map((p) => {
//   //       return {
//   //         uuid: p.id as string,
//   //         id: p.payload!.id as string,
//   //         name: p.payload!.name as string,
//   //       };
//   //     });
//   //     selectionsList.push(selections);
//   //   }

//   //   const chosen = await askJevChoice({
//   //     instruction: "Choose a keyword suitable for the given text.",
//   //     background:
//   //       "The system will notify you of the rule when that keyword appears on camera.",
//   //     questions: rules.map((r, i) => ({
//   //       key: i,
//   //       text: r.text,
//   //       options: selectionsList[i].map((s) => s.name),
//   //     })),
//   //   });

//   //   rules.forEach((_, i) => {
//   //     const c = chosen.get(i);
//   //     newRules[i].keywords = c == null ? [] : [selectionsList[i][c]];
//   //   });
//   // }
//   // const jevRes = await jevClient.systemOne({
//   //   state: {
//   //     common_instruction: "Choose a keyword suitable for the given text.",
//   //     background:
//   //       "The system will notify you of the rule when that keyword appears on camera.",
//   //   },
//   //   questions: Object.fromEntries(
//   //     rules.entries().map(([i, v]) => [
//   //       i.toString(),
//   //       choice(v.text, {
//   //         ...Object.fromEntries(
//   //           selectionsList[i]
//   //             .entries()
//   //             .map(([index, selection]) => [
//   //               index.toString(),
//   //               `"${selection.name}"`,
//   //             ]),
//   //         ),
//   //         none_of_the_above: "none of the above",
//   //       }),
//   //     ]),
//   //   ),
//   // });

//   // log(
//   //   "jev",
//   //   `入力トークン：${jevRes.usage.input_tokens} 出力トークン：${jevRes.usage.output_tokens}`,
//   // );

//   // const chosenIndexes: number[] = [];

//   // for (const stringI in jevRes.answers) {
//   //   const answer = jevRes.answers[stringI];
//   //   const i = Number(stringI);

//   //   log("jev", `${rules[i]} を確かめました。`);
//   //   logs(
//   //     "jev",
//   //     Object.entries(answer.probabilities).map(([key, p]) =>
//   //       key === "none_of_the_above"
//   //         ? `none of the above: ${p * 100}%`
//   //         : `${selectionsList[i][Number(key)].name}: ${p * 100}%`,
//   //     ),
//   //   );
//   //   log("jev", `confidence: ${answer.confidence * 100}`);

//   //   if (answer.choice === "none_of_the_above") {
//   //     chosenIndexes.push(-1);
//   //   } else {
//   //     chosenIndexes.push(Number(answer.choice));
//   //   }
//   // }

//   // for (const i in rules) {
//   //   newRules[i].keywords = [selectionsList[i][chosenIndexes[i]]];
//   // }

//   // 適したiconを選択する
//   // {
//   //   const searches = rules.map((i) => ({
//   //     query: i.vector,
//   //     limit: 50,
//   //     with_payload: true,
//   //   }));
//   //   const res = await qdrantClient.queryBatch("icons", { searches });
//   //   const selectionsList: { uuid: string; name: string }[][] = [];

//   //   for (const i in res) {
//   //     const selections = res[i].points.map((p) => {
//   //       return {
//   //         uuid: p.id as string,
//   //         name: p.payload!.name as string,
//   //       };
//   //     });
//   //     selectionsList.push(selections);
//   //   }

//   //   const chosen = await askJevChoice({
//   //     instruction:
//   //       "Choose the name of the vector icon best suited to the given text.",
//   //     background: "The vector icon will be used as a pictogram for the rule.",
//   //     questions: rules.map((r, i) => ({
//   //       key: i,
//   //       text: r.text,
//   //       options: selectionsList[i].map((s) => s.name),
//   //     })),
//   //   });

//   //   rules.forEach((_, i) => {
//   //     const c = chosen.get(i);
//   //     newRules[i].icon = c == null ? "" : selectionsList[i][c].name;
//   //   });
//   // }
//   // return newRules;
// }

async function chooseKeywords(
  rules: RuleInput[],
): Promise<KeywordCandidate[][]> {
  const res = await qdrantClient.queryBatch("labels", {
    searches: rules.map((r) => ({
      query: r.vector,
      limit: 30,
      with_payload: true,
    })),
  });

  const groupsList: KeywordCandidate[][][] = res.map((r) => {
    const groups: KeywordCandidate[][] = Array.from(
      { length: KEYWORD_GROUPS },
      () => [],
    );
    r.points.forEach((p, idx) => {
      groups[idx % KEYWORD_GROUPS].push({
        index: Number(p.payload!.id),
        label: p.payload!.name as string,
      });
    });
    return groups;
  });

  const chosen = await askJevChoice({
    instruction: "Choose a keyword suitable for the given text.",
    background:
      "The system will notify you of the rule when that keyword appears on camera.",
    questions: groupsList.flatMap((groups, i) =>
      groups.map((group, g) => ({
        key: `${i}-${g}`,
        text: rules[i].text,
        options: group.map((k) => k.label),
      })),
    ),
  });

  return groupsList.map((groups, i) => {
    const picked = groups.flatMap((group, g) => {
      const c = chosen.get(`${i}-${g}`);
      return c == null ? [] : [group[c]];
    });
    return [...new Map(picked.map((k) => [k.index, k])).values()];
  });
}

async function chooseIcons(rules: RuleInput[]): Promise<(string | null)[]> {
  const res = await qdrantClient.queryBatch("icons", {
    searches: rules.map((r) => ({
      query: r.vector,
      limit: 50,
      with_payload: true,
    })),
  });

  const namesList = res.map((r) =>
    r.points.map((p) => p.payload!.name as string),
  );

  const chosen = await askJevChoice({
    instruction:
      "Choose the name of the vector icon best suited to the given text.",
    background: "The vector icon will be used as a pictogram for the rule.",
    questions: rules.map((r, i) => ({
      key: i,
      text: r.text,
      options: namesList[i],
      allowNone: false,
    })),
  });

  return rules.map((_, i) => {
    const c = chosen.get(i);
    return c == null ? null : namesList[i][c];
  });
}

// 禁止/注意/情報 のどれかを選択する
async function chooseIconTypes(
  rules: RuleInput[],
): Promise<(IconType | null)[]> {
  const chosen = await askJevChoice({
    instruction: "Choose the category that best describes the given rule.",
    background:
      "The category determines the pictogram style (e.g. red prohibition sign, yellow caution sign, blue information sign).",
    questions: rules.map((r, i) => ({
      key: i,
      text: r.text,
      options: ICON_TYPES.map((t) => t.label),
      allowNone: false,
    })),
  });

  return rules.map((_, i) => {
    const c = chosen.get(i);
    return c == null ? null : ICON_TYPES[c].value;
  });
}

export async function createRules(inputs: RuleInput[]): Promise<RuleResult[]> {
  if (inputs.length === 0) return [];

  const [keywordsList, iconNames, iconTypes] = await Promise.all([
    chooseKeywords(inputs),
    chooseIcons(inputs),
    chooseIconTypes(inputs),
  ]);

  const drafts = inputs.map((r, i) => {
    const iconName = iconNames[i];
    if (iconName === null) throw new Error("icons コレクションが空です。");
    return {
      id: crypto.randomUUID(),
      text: r.text,
      iconName,
      iconType: iconTypes[i] ?? "information",
      // keywordIndexes: keywordsList[i].map((k) => k.index),
      keywordCandidates: keywordsList[i],
    };
  });

  await db.transaction(async (tx) => {
    const pairs = [
      ...new Map(
        drafts.map((d) => [
          iconKey(d.iconName, d.iconType),
          { name: d.iconName, iconType: d.iconType },
        ]),
      ).values(),
    ];
    await tx
      .insert(icons)
      .values(pairs)
      .onConflictDoNothing({ target: [icons.name, icons.iconType] });
    const iconRows = await tx
      .select({ id: icons.id, name: icons.name, iconType: icons.iconType })
      .from(icons)
      .where(
        or(
          ...pairs.map((p) =>
            and(eq(icons.name, p.name), eq(icons.iconType, p.iconType)),
          ),
        ),
      );
    const iconIdOf = new Map(
      iconRows.map((r) => [iconKey(r.name, r.iconType), r.id]),
    );

    // const allIndexes = [...new Set(drafts.flatMap((d) => d.keywordIndexes))];
    // const kwRows =
    //   allIndexes.length === 0
    //     ? []
    //     : await tx
    //         .select({ id: keywords.id, index: keywords.index })
    //         .from(keywords)
    //         .where(inArray(keywords.index, allIndexes));
    // const keywordIdOf = new Map(kwRows.map((k) => [k.index, k.id]));
    const candidates = [
      ...new Map(
        drafts.flatMap((d) => d.keywordCandidates).map((k) => [k.index, k]),
      ).values(),
    ];
    if (candidates.length > 0) {
      await tx
        .insert(keywords)
        .values(candidates.map((k) => ({ index: k.index, label: k.label })))
        .onConflictDoNothing({ target: keywords.index });
    }
    const kwRows =
      candidates.length === 0
        ? []
        : await tx
            .select({ id: keywords.id, index: keywords.index })
            .from(keywords)
            .where(
              inArray(
                keywords.index,
                candidates.map((k) => k.index),
              ),
            );
    const keywordIdOf = new Map(kwRows.map((k) => [k.index, k.id]));

    await tx.insert(rulesTable).values(
      drafts.map((d) => ({
        id: d.id,
        textEn: d.text,
        iconId: iconIdOf.get(iconKey(d.iconName, d.iconType))!,
      })),
    );

    const links = drafts.flatMap((d) =>
      // d.keywordIndexes.flatMap((idx) => {
      //   const keywordId = keywordIdOf.get(idx);
      //   return keywordId === undefined ? [] : [{ ruleId: d.id, keywordId }];
      // }),
      d.keywordCandidates.map((k) => ({
        ruleId: d.id,
        keywordId: keywordIdOf.get(k.index)!,
      })),
    );
    if (links.length > 0) await tx.insert(ruleKeywords).values(links);

    await qdrantClient.upsert("rules", {
      wait: true,
      points: drafts.map((d, i) => ({
        id: d.id,
        vector: inputs[i].vector,
        payload: { text: d.text },
      })),
    });
  });

  const loaded = await loadRules(drafts.map((d) => d.id));
  return drafts.map((d) => loaded.get(d.id)!);
}

export async function loadRules(
  ids: string[],
): Promise<Map<string, RuleResult>> {
  const result = new Map<string, RuleResult>();
  if (ids.length === 0) return result;

  const rows = await db
    .select({
      id: rulesTable.id,
      text: rulesTable.textEn,
      iconId: rulesTable.iconId,
      iconName: icons.name,
      iconType: icons.iconType,
    })
    .from(rulesTable)
    .innerJoin(icons, eq(rulesTable.iconId, icons.id))
    .where(inArray(rulesTable.id, ids));

  const kwRows = await db
    .select({
      ruleId: ruleKeywords.ruleId,
      id: keywords.id,
      label: keywords.label,
      index: keywords.index,
    })
    .from(ruleKeywords)
    .innerJoin(keywords, eq(ruleKeywords.keywordId, keywords.id))
    .where(inArray(ruleKeywords.ruleId, ids));

  for (const r of rows) {
    result.set(r.id, { ...r, iconType: r.iconType as IconType, keywords: [] });
  }
  for (const k of kwRows) {
    result
      .get(k.ruleId)
      ?.keywords.push({ id: k.id, label: k.label, index: k.index });
  }
  return result;
}
