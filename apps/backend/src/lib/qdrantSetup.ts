import { QdrantClient, Schemas } from "@qdrant/js-client-rest";
import { embedIcons, embedLabel } from "./icons2vectors";
import { LABEL } from "./label";

type Distance = "Cosine" | "Euclid" | "Dot" | "Manhattan";
type Point = Schemas["PointStruct"];

export type CollectionConfig = {
  name: string;
  vectorSize: number;
  distance?: Distance;
  seed?: () => Point[] | Promise<Point[]>;
  expectedCount?: number;
};

export async function ensureCollection(
  client: QdrantClient,
  {
    name,
    vectorSize,
    distance = "Cosine",
    seed,
    expectedCount,
  }: CollectionConfig,
) {
  const { exists } = await client.collectionExists(name);

  if (exists) {
    if (!seed) {
      console.log(`[qdrant] collection "${name}" は既に存在しています。`);
      return;
    }
    const { count } = await client.count(name, { exact: true });
    if (
      count !== 0 &&
      (expectedCount === undefined || count === expectedCount)
    ) {
      console.log(`[qdrant] collection "${name}" は既に存在しています。`);
      return;
    }
    await client.deleteCollection(name);
  }

  await client.createCollection(name, {
    vectors: {
      size: vectorSize,
      distance,
    },
  });

  console.log(`[qdrant] collection "${name}" を作成しました。`);

  if (!seed) return;

  try {
    const points = await seed();
    await upsertInBatches(client, name, points);
    console.log(
      `[qdrant] collection "${name}" に ${points.length} 件の初期データを投入しました。`,
    );
  } catch (err) {
    // 投入に失敗したら作りかけのコレクションを消す。
    // 残すと次回は「既に存在」扱いになり、seed が二度と走らないため。
    await client.deleteCollection(name);
    console.error(
      `[qdrant] collection "${name}" の初期データ投入に失敗したため削除しました。`,
    );
    throw err;
  }
}

const SEED_BATCH_SIZE = 100;
async function upsertInBatches(
  client: QdrantClient,
  name: string,
  points: Point[],
) {
  for (let i = 0; i < points.length; i += SEED_BATCH_SIZE) {
    await client.upsert(name, {
      wait: true,
      points: points.slice(i, i + SEED_BATCH_SIZE),
    });
  }
}

export async function ensureCollections(
  client: QdrantClient,
  configs: CollectionConfig[],
) {
  for (const config of configs) {
    await ensureCollection(client, config);
  }
}

async function defaultIcons(): Promise<Point[]> {
  await embedIcons();
  const file = Bun.file("icon_embeddings.json");
  if (!(await file.exists())) {
    throw new Error("起こりえないエラー");
  }
  const vectors = (await file.json()) as { [key: string]: number[] };
  const points: Point[] = [];

  for (const i in vectors) {
    const uuid = crypto.randomUUID();
    points.push({
      id: uuid,
      vector: vectors[i],
      payload: {
        name: i,
      },
    });
  }

  return points;
}

async function defaultLabels(): Promise<Point[]> {
  await embedLabel();
  const file = Bun.file("label_embeddings.json");
  if (!(await file.exists())) {
    throw new Error("起こりえないエラー");
  }
  const vectors = (await file.json()) as {
    [key: string]: { vector: number[]; text: string };
  };
  const points: Point[] = [];

  for (const i in vectors) {
    const uuid = crypto.randomUUID();
    points.push({
      id: uuid,
      vector: vectors[i].vector,
      payload: {
        id: i,
        name: vectors[i].text,
      },
    });
  }

  return points;
}

export const COLLECTIONS = {
  rules: { name: "rules", vectorSize: 1536 },
  icons: { name: "icons", vectorSize: 1536, seed: defaultIcons },
  labels: {
    name: "labels",
    vectorSize: 1536,
    seed: defaultLabels,
    expectedCount: Object.keys(LABEL).length,
  },
} satisfies Record<string, CollectionConfig>;
