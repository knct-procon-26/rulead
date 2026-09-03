import { QdrantClient } from "@qdrant/js-client-rest";

const COLLECTION_NAME = "rules";
const VECTOR_SIZE = 1536;

export async function ensureRulesCollection(client: QdrantClient) {
  const { collections } = await client.getCollections();
  const exists = collections.some((c) => c.name === COLLECTION_NAME);

  if (exists) {
    console.log(
      `[qdrant] collection "${COLLECTION_NAME}" は既に存在しています。`,
    );
    return;
  }

  await client.createCollection(COLLECTION_NAME, {
    vectors: {
      size: VECTOR_SIZE,
      distance: "Cosine",
    },
  });

  console.log(`[qdrant] collection "${COLLECTION_NAME}" を作成しました。`);
}
