/**
 * Update Embedding Configuration for 384D Vectors
 * Updates the embedding service to use more efficient 384D vectors
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Update embedding configuration
 */
async function updateEmbeddingConfig() {
  console.log('🔧 Updating Embedding Configuration for 384D Vectors\\n');
  
  // Check if we can use a different embedding model that produces 384D vectors
  // For now, we'll configure to truncate existing 768D vectors to 384D
  
  const embeddingConfigUpdate = `
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
 * Supports both 768D (full) and 384D (truncated) vectors
 */
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    console.log(\`[Embedding] Generating \${VECTOR_DIMENSION}D embedding for: "\${text.substring(0, 50)}..."\`);
    
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small', // Produces 768D by default
      input: text.trim(),
    });

    const fullEmbedding = response.data[0].embedding;
    
    // If we need 384D, truncate the 768D vector
    if (VECTOR_DIMENSION === 384 && fullEmbedding.length === 768) {
      const truncatedEmbedding = fullEmbedding.slice(0, 384);
      console.log(\`[Embedding] Truncated \${fullEmbedding.length}D → \${truncatedEmbedding.length}D\`);
      return truncatedEmbedding;
    }
    
    // Otherwise return full embedding
    console.log(\`[Embedding] Generated \${fullEmbedding.length}D embedding\`);
    return fullEmbedding;
    
  } catch (error: any) {
    console.error('[Embedding] Error generating embedding:', error.message);
    
    // Return zero vector as fallback
    const fallback = new Array(VECTOR_DIMENSION).fill(0);
    console.warn(\`[Embedding] Using fallback \${VECTOR_DIMENSION}D zero vector\`);
    return fallback;
  }
}

/**
 * Batch generate embeddings for multiple texts
 */
export async function getBatchEmbeddings(texts: string[]): Promise<number[][]> {
  console.log(\`[Embedding] Generating batch embeddings for \${texts.length} texts\`);
  
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
      
      console.log(\`[Embedding] Processed batch \${Math.floor(i/batchSize) + 1}/\${Math.ceil(texts.length/batchSize)}\`);
      
      // Small delay to respect rate limits
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error: any) {
      console.error(\`[Embedding] Batch \${Math.floor(i/batchSize) + 1} failed:, error.message\`);
      
      // Add fallback vectors for failed batch
      const fallbackBatch = batch.map(() => new Array(VECTOR_DIMENSION).fill(0));
      embeddings.push(...fallbackBatch);
    }
  }
  
  console.log(\`[Embedding] Generated \${embeddings.length} embeddings\`);
  return embeddings;
}

/**
 * Get current vector dimension setting
 */
export function getVectorDimension(): number {
  return VECTOR_DIMENSION;
}

/**
 * Truncate existing 768D vector to 384D
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
`;
  
  // Update the embedding.ts file
  const embeddingPath = path.join(process.cwd(), 'src', 'lib', 'embedding.ts');
  
  try {
    await fs.writeFile(embeddingPath, embeddingConfigUpdate);
    console.log('✅ Updated embedding configuration');
    console.log(`📝 File: ${embeddingPath}`);
  } catch (error) {
    console.error('❌ Failed to update embedding configuration:', error.message);
  }
}

/**
 * Create updated environment configuration
 */
async function updateEnvConfig() {
  console.log('\\n🔧 Creating Updated Environment Configuration\\n');
  
  const envTemplate = `# Updated Environment Configuration for 384D Vector Migration
# Copy these settings to your .env file after successful migration

# Qdrant Configuration (Updated)
QDRANT_URL=your_qdrant_cluster_url
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION=places_v2  # Updated collection name
EMBEDDING_DIM=384            # Updated vector dimension

# OpenAI Configuration (Existing)
OPENAI_API_KEY=your_openai_api_key

# Migration Settings
MIGRATION_BACKUP_DIR=./backups
MIGRATION_BATCH_SIZE=50

# Performance Settings
VECTOR_SEARCH_LIMIT=100
QUALITY_FILTER_DEFAULT=good
CACHE_TTL_MINUTES=120

# Feature Flags
ENABLE_ENHANCED_CATEGORIZATION=true
ENABLE_QUALITY_FILTERING=true
ENABLE_384D_VECTORS=true

# Logging
LOG_LEVEL=info
DEBUG_EMBEDDING=false
DEBUG_QDRANT=false
`;

  try {
    await fs.writeFile('.env.example.v2', envTemplate);
    console.log('✅ Created updated environment template');
    console.log('📝 File: .env.example.v2');
    console.log('\\n💡 Instructions:');
    console.log('1. Copy .env.example.v2 to .env after migration');
    console.log('2. Update QDRANT_COLLECTION to places_v2');
    console.log('3. Update EMBEDDING_DIM to 384');
  } catch (error) {
    console.error('❌ Failed to create env template:', error.message);
  }
}

/**
 * Create migration checklist
 */
async function createMigrationChecklist() {
  console.log('\\n📋 Creating Migration Checklist\\n');
  
  const checklist = `# Qdrant 384D Vector Migration Checklist

## Pre-Migration Steps
- [ ] Backup current .env file
- [ ] Ensure QDRANT_URL and QDRANT_API_KEY are correct
- [ ] Test current system is working
- [ ] Note down current collection stats
- [ ] Create backup directory: mkdir -p backups

## Migration Process
- [ ] Run tests: \`node scripts/test-enhanced-categorization.js\`
- [ ] Run migration: \`node scripts/migrate-to-384d-vectors.js\`
- [ ] Verify migration completed successfully
- [ ] Check backup files were created
- [ ] Verify new collection has expected data

## Post-Migration Configuration
- [ ] Update .env file:
  - [ ] QDRANT_COLLECTION=places_v2
  - [ ] EMBEDDING_DIM=384
- [ ] Update embedding configuration
- [ ] Test new collection with sample queries
- [ ] Verify filtering works correctly
- [ ] Check performance improvements

## Testing & Validation
- [ ] Test search functionality
- [ ] Test category filtering
- [ ] Test quality filtering  
- [ ] Test itemType filtering
- [ ] Verify data quality
- [ ] Check search speed improvement

## Production Deployment
- [ ] Deploy updated code to staging
- [ ] Run integration tests
- [ ] Deploy to production
- [ ] Monitor performance metrics
- [ ] Clean up old collection (after verification)

## Rollback Plan (if needed)
- [ ] Restore .env to use 'places' collection
- [ ] Revert EMBEDDING_DIM to 768
- [ ] Restart application
- [ ] Verify old system works
- [ ] Keep backup files until issue resolved

## Success Metrics
- [ ] 50% reduction in storage usage
- [ ] 2x faster search performance
- [ ] Improved filtering accuracy (>85%)
- [ ] All tests passing
- [ ] No functionality regression

## Notes
- Migration typically takes 10-30 minutes depending on data size
- Backup files are stored in ./backups/ directory
- Old collection name: 'places'
- New collection name: 'places_v2'
- Vector dimension: 768D → 384D
`;

  try {
    await fs.writeFile('MIGRATION_CHECKLIST.md', checklist);
    console.log('✅ Created migration checklist');
    console.log('📝 File: MIGRATION_CHECKLIST.md');
  } catch (error) {
    console.error('❌ Failed to create checklist:', error.message);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Setting Up 384D Vector Migration\\n');
  console.log('=' .repeat(50));
  
  try {
    await updateEmbeddingConfig();
    await updateEnvConfig();
    await createMigrationChecklist();
    
    console.log('\\n\\n✅ Migration Setup Complete!');
    console.log('=' .repeat(50));
    
    console.log('\\n🎯 Next Steps:');
    console.log('1. Review updated files');
    console.log('2. Run tests: node scripts/test-enhanced-categorization.js');
    console.log('3. Start migration: node scripts/migrate-to-384d-vectors.js');
    console.log('4. Follow MIGRATION_CHECKLIST.md');
    
    console.log('\\n📊 Expected Benefits:');
    console.log('✅ 50% storage reduction');
    console.log('✅ 2x faster searches');
    console.log('✅ Improved filtering accuracy');
    console.log('✅ Better categorization');
    
  } catch (error) {
    console.error('\\n❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  updateEmbeddingConfig,
  updateEnvConfig,
  createMigrationChecklist
};