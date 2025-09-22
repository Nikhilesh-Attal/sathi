
/**
 * Enhanced Embedding Configuration
 * Optimized for 384D vectors for better performance and storage efficiency
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configuration for vector dimensions
const VECTOR_DIMENSION = process.env.EMBEDDING_DIM ? parseInt(process.env.EMBEDDING_DIM) : 384;

/**
 * Generate embeddings with configurable dimensions
 * Supports both 384D (full) and 384D (truncated) vectors
 */
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    console.log(`[Embedding] Generating ${VECTOR_DIMENSION}D embedding for: "${text.substring(0, 50)}..."`);
    
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small', // Produces 384D by default
      input: text.trim(),
    });

    const fullEmbedding = response.data[0].embedding;
    
    // If we need 384D, truncate the 384D vector
    if (VECTOR_DIMENSION === 384 && fullEmbedding.length === 384) {
      const truncatedEmbedding = fullEmbedding.slice(0, 384);
      console.log(`[Embedding] Truncated ${fullEmbedding.length}D → ${truncatedEmbedding.length}D`);
      return truncatedEmbedding;
    }
    
    // Otherwise return full embedding
    console.log(`[Embedding] Generated ${fullEmbedding.length}D embedding`);
    return fullEmbedding;
    
  } catch (error: any) {
    console.error('[Embedding] Error generating embedding:', error.message);
    
    // Return zero vector as fallback
    const fallback = new Array(VECTOR_DIMENSION).fill(0);
    console.warn(`[Embedding] Using fallback ${VECTOR_DIMENSION}D zero vector`);
    return fallback;
  }
}

/**
 * Batch generate embeddings for multiple texts
 */
export async function getBatchEmbeddings(texts: string[]): Promise<number[][]> {
  console.log(`[Embedding] Generating batch embeddings for ${texts.length} texts`);
  
  const embeddings: number[][] = [];
  
  // Process in batches to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    
    try {
      const batchEmbeddings = await Promise.all(
        batch.map(text => getEmbedding(text))
      );
      embeddings.push(...batchEmbeddings);
      
      console.log(`[Embedding] Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(texts.length/batchSize)}`);
      
      // Small delay to respect rate limits
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error: any) {
      console.error(`[Embedding] Batch ${Math.floor(i/batchSize) + 1} failed:, error.message`);
      
      // Add fallback vectors for failed batch
      const fallbackBatch = batch.map(() => new Array(VECTOR_DIMENSION).fill(0));
      embeddings.push(...fallbackBatch);
    }
  }
  
  console.log(`[Embedding] Generated ${embeddings.length} embeddings`);
  return embeddings;
}

/**
 * Get current vector dimension setting
 */
export function getVectorDimension(): number {
  return VECTOR_DIMENSION;
}

/**
 * Truncate existing 384D vector to 384D
 */
export function truncateVector(vector: number[], targetDim: number = 384): number[] {
  if (vector.length <= targetDim) return vector;
  return vector.slice(0, targetDim);
}

/**
 * Validate vector dimensions
 */
export function validateVectorDimensions(vector: number[], expectedDim: number): boolean {
  return vector.length === expectedDim && vector.every(v => typeof v === 'number' && !isNaN(v));
}
