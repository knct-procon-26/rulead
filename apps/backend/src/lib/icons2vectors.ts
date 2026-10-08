import OpenAI from "openai";
import iconsData from "@react-native-vector-icons/material-design-icons/glyphmaps/MaterialDesignIcons.json";
import { LABEL } from "./label";

function split(arr: string[], size: number) {
  return arr.flatMap((_, i, a) => (i % size ? [] : [arr.slice(i, i + size)]));
}

const llmClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function embedIcons() {
  const file = Bun.file("icon_embeddings.json");
  if (await file.exists()) {
    console.log("既にあるよ");
    return;
  }

  const icons = Object.keys(iconsData)
    .filter((i) => !i.includes("-off"))
    .filter((i) => !i.includes("-outline"));
  console.log(icons);

  const iconsToRequest = split(icons, 1000);

  console.log(iconsToRequest);

  const result: { [key: string]: number[] } = {};

  for (const i in iconsToRequest) {
    const { data, usage } = await llmClient.embeddings.create({
      model: "text-embedding-3-small",
      input: iconsToRequest[i],
    });

    console.log(usage);

    for (const j in data) {
      result[iconsToRequest[i][j]] = data[j].embedding;
    }
  }

  await Bun.write("icon_embeddings.json", JSON.stringify(result));
}

async function savedLabelsMatch(file: ReturnType<typeof Bun.file>) {
  try {
    const saved = (await file.json()) as {
      [key: string]: { vector: number[]; text: string };
    };
    const keys = Object.keys(LABEL);
    return (
      Object.keys(saved).length === keys.length &&
      keys.every(
        (i) =>
          saved[i]?.text === LABEL[i].en && Array.isArray(saved[i]?.vector),
      )
    );
  } catch {
    return false;
  }
}

export async function embedLabel() {
  const file = Bun.file("label_embeddings.json");
  if ((await file.exists()) && (await savedLabelsMatch(file))) {
    console.log("既にあるよ");
    return;
  }

  const labels = Object.keys(LABEL).map((i) => [i, LABEL[i].en]);

  console.log(labels);

  const result: { [key: string]: { vector: number[]; text: string } } = {};

  const { data, usage } = await llmClient.embeddings.create({
    model: "text-embedding-3-small",
    input: labels.map((i) => i[1]),
  });

  console.log(usage);

  for (const j in data) {
    result[labels[j][0]] = { vector: data[j].embedding, text: labels[j][1] };
  }

  await Bun.write("label_embeddings.json", JSON.stringify(result));
}

await embedIcons();
await embedLabel();
