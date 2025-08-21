import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get embedding for text
export async function getEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) return [];

  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return response.data[0].embedding;
}
