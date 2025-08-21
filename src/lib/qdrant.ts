import { QdrantClient, type Filter } from "@qdrant/js-client-rest";

export const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL as string,
  apiKey: process.env.QDRANT_API_KEY,
});

export async function searchPlaces(query: string, vector: number[], limit = 10) {
  const collectionName = process.env.QDRANT_COLLECTION;
  if (!collectionName) {
    throw new Error(
      "QDRANT_COLLECTION not defined. Use server-side QDRANT_* vars (no REACT_APP_ / NEXT_PUBLIC_)."
    );
  }

  try {
    await qdrantClient.getCollection(collectionName);
  } catch {
    throw new Error(
      `Qdrant collection '${collectionName}' not found or not accessible. Check QDRANT_URL/API_KEY and the collection name.`
    );
  }

  const results = await qdrantClient.search(collectionName, {
    vector,
    limit,
    with_payload: true,
  });

  return results.map((res: any) => ({
    id: res.id,
    score: res.score,
    ...res.payload,
  }));
}

// Optional: geo + vector search variant
export async function searchPlacesGeoVector(
  vector: number[],
  center: { lat: number; lon: number },
  radiusMeters = 50000,
  limit = 20
) {
  const collectionName = process.env.QDRANT_COLLECTION!;
  const filter: Filter = {
    must: [
      {
        key: "coords",
        geo_radius: { center, radius: radiusMeters },
      },
    ],
  };

  const results = await qdrantClient.search(collectionName, {
    vector,
    filter,
    limit,
    with_payload: true,
  });

  return results.map((res: any) => ({ id: res.id, score: res.score, ...res.payload }));
}
