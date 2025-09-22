/**
 * Qdrant Collection Migration Script
 * Migrates from 768D to 384D vectors with enhanced place categorization
 */

// Load environment variables first
require('dotenv').config();

const { QdrantClient } = require('@qdrant/js-client-rest');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const OLD_COLLECTION = 'places';
const NEW_COLLECTION = 'places_v2';
const BACKUP_DIR = './backups';
const BATCH_SIZE = 50;

// Vector dimension migration
const OLD_VECTOR_SIZE = 768;
const NEW_VECTOR_SIZE = 384;

// Enhanced categorization - simplified for migration script
const CATEGORY_MAPPINGS = {
  // Hotels and accommodation
  'hotel': { category: 'accommodation', itemType: 'hotel' },
  'resort': { category: 'accommodation', itemType: 'hotel' },
  'lodge': { category: 'accommodation', itemType: 'hotel' },
  'hostel': { category: 'accommodation', itemType: 'hotel' },
  'guest': { category: 'accommodation', itemType: 'hotel' },
  'accommodation': { category: 'accommodation', itemType: 'hotel' },
  'palace': { category: 'accommodation', itemType: 'hotel' }, // heritage hotels
  'haveli': { category: 'accommodation', itemType: 'hotel' },

  // Restaurants and food
  'restaurant': { category: 'food', itemType: 'restaurant' },
  'cafe': { category: 'food', itemType: 'restaurant' },
  'dhaba': { category: 'food', itemType: 'restaurant' },
  'food': { category: 'food', itemType: 'restaurant' },
  'dining': { category: 'food', itemType: 'restaurant' },
  'bar': { category: 'food', itemType: 'restaurant' },
  'bistro': { category: 'food', itemType: 'restaurant' },

  // Attractions - Religious
  'temple': { category: 'attraction', itemType: 'place', subcategory: 'religious' },
  'mandir': { category: 'attraction', itemType: 'place', subcategory: 'religious' },
  'mosque': { category: 'attraction', itemType: 'place', subcategory: 'religious' },
  'masjid': { category: 'attraction', itemType: 'place', subcategory: 'religious' },
  'church': { category: 'attraction', itemType: 'place', subcategory: 'religious' },
  'gurudwara': { category: 'attraction', itemType: 'place', subcategory: 'religious' },

  // Attractions - Historical
  'fort': { category: 'attraction', itemType: 'place', subcategory: 'historical' },
  'monument': { category: 'attraction', itemType: 'place', subcategory: 'historical' },
  'museum': { category: 'attraction', itemType: 'place', subcategory: 'cultural' },
  'gallery': { category: 'attraction', itemType: 'place', subcategory: 'cultural' },

  // Attractions - Natural
  'park': { category: 'attraction', itemType: 'place', subcategory: 'natural' },
  'garden': { category: 'attraction', itemType: 'place', subcategory: 'natural' },
  'lake': { category: 'attraction', itemType: 'place', subcategory: 'natural' },
  'hill': { category: 'attraction', itemType: 'place', subcategory: 'natural' },
  'waterfall': { category: 'attraction', itemType: 'place', subcategory: 'natural' },
  'beach': { category: 'attraction', itemType: 'place', subcategory: 'natural' },

  // Shopping
  'market': { category: 'shopping', itemType: 'place', subcategory: 'traditional' },
  'bazaar': { category: 'shopping', itemType: 'place', subcategory: 'traditional' },
  'mall': { category: 'shopping', itemType: 'place', subcategory: 'modern' },

  // Default fallback
  'default': { category: 'attraction', itemType: 'place', subcategory: 'general' }
};

class QdrantMigration {
  constructor() {
    this.client = new QdrantClient({
      url: QDRANT_URL,
      apiKey: QDRANT_API_KEY,
    });
    this.stats = {
      totalPoints: 0,
      migrated: 0,
      errors: 0,
      enhanced: 0,
      startTime: Date.now()
    };
  }

  /**
   * Main migration flow
   */
  async migrate() {
    console.log('🚀 Starting Qdrant Collection Migration');
    console.log(`📊 Migrating from ${OLD_VECTOR_SIZE}D to ${NEW_VECTOR_SIZE}D vectors`);
    console.log(`🗄️ ${OLD_COLLECTION} → ${NEW_COLLECTION}`);
    
    try {
      // Step 1: Backup existing data
      console.log('\\n📦 Step 1: Backing up existing data...');
      await this.backupCollection();
      
      // Step 2: Create new collection with 384D vectors
      console.log('\\n🏗️ Step 2: Creating new collection with 384D vectors...');
      await this.createNewCollection();
      
      // Step 3: Migrate data with enhanced categorization
      console.log('\\n🔄 Step 3: Migrating data with enhanced types...');
      await this.migrateData();
      
      // Step 4: Verify migration
      console.log('\\n✅ Step 4: Verifying migration...');
      await this.verifyMigration();
      
      // Step 5: Cleanup (optional)
      console.log('\\n🧹 Step 5: Cleanup options...');
      await this.showCleanupOptions();
      
    } catch (error) {
      console.error('💥 Migration failed:', error);
      throw error;
    }
  }

  /**
   * Backup existing collection data
   */
  async backupCollection() {
    try {
      // Ensure backup directory exists
      await fs.mkdir(BACKUP_DIR, { recursive: true });
      
      // Get collection info
      const collectionInfo = await this.client.getCollection(OLD_COLLECTION);
      const pointsCount = collectionInfo.points_count || 0;
      this.stats.totalPoints = pointsCount;
      
      console.log(`📊 Collection has ${pointsCount} points`);
      
      if (pointsCount === 0) {
        console.log('⚠️ No data to backup');
        return;
      }
      
      // Export all points
      const backupFile = path.join(BACKUP_DIR, `${OLD_COLLECTION}_backup_${Date.now()}.json`);
      const allPoints = [];
      
      let offset = null;
      let batch = 0;
      
      while (true) {
        batch++;
        console.log(`📥 Backing up batch ${batch}...`);
        
        const response = await this.client.scroll(OLD_COLLECTION, {
          limit: BATCH_SIZE,
          offset,
          with_payload: true,
          with_vector: true
        });
        
        if (!response.points || response.points.length === 0) break;
        
        allPoints.push(...response.points);
        offset = response.next_page_offset;
        
        if (!offset) break;
      }
      
      // Save backup
      await fs.writeFile(backupFile, JSON.stringify({
        collection: OLD_COLLECTION,
        vector_size: OLD_VECTOR_SIZE,
        timestamp: new Date().toISOString(),
        points_count: allPoints.length,
        points: allPoints
      }, null, 2));
      
      console.log(`✅ Backup saved: ${backupFile}`);
      console.log(`📊 Backed up ${allPoints.length} points`);
      
    } catch (error) {
      console.error('❌ Backup failed:', error);
      throw error;
    }
  }

  /**
   * Create new collection with 384D vectors
   */
  async createNewCollection() {
    try {
      // Check if new collection already exists
      try {
        await this.client.getCollection(NEW_COLLECTION);
        console.log(`⚠️ Collection ${NEW_COLLECTION} already exists. Deleting...`);
        await this.client.deleteCollection(NEW_COLLECTION);
      } catch (error) {
        // Collection doesn't exist, which is good
      }
      
      // Create new collection
      await this.client.createCollection(NEW_COLLECTION, {
        vectors: {
          size: NEW_VECTOR_SIZE,
          distance: 'Cosine',
        },
        optimizers_config: {
          default_segment_number: 2,
          max_segment_size: 20000,
          memmap_threshold: 10000,
          indexing_threshold: 20000,
        },
        hnsw_config: {
          m: 16,
          ef_construct: 100,
          full_scan_threshold: 10000,
        },
      });
      
      console.log(`✅ Created collection: ${NEW_COLLECTION} with ${NEW_VECTOR_SIZE}D vectors`);
      
      // Create indexes for efficient filtering
      const indexes = [
        { field_name: 'coordinates', field_schema: 'geo' },
        { field_name: 'category', field_schema: 'keyword' },
        { field_name: 'itemType', field_schema: 'keyword' },
        { field_name: 'subcategory', field_schema: 'keyword' },
        { field_name: 'source', field_schema: 'keyword' },
      ];
      
      for (const index of indexes) {
        try {
          await this.client.createPayloadIndex(NEW_COLLECTION, index);
          console.log(`✅ Created index: ${index.field_name} (${index.field_schema})`);
        } catch (error) {
          console.warn(`⚠️ Index creation failed for ${index.field_name}:`, error.message);
        }
      }
      
    } catch (error) {
      console.error('❌ Collection creation failed:', error);
      throw error;
    }
  }

  /**
   * Migrate data with enhanced categorization
   */
  async migrateData() {
    try {
      let offset = null;
      let batch = 0;
      
      while (true) {
        batch++;
        console.log(`\\n🔄 Processing batch ${batch}...`);
        
        // Get batch from old collection
        const response = await this.client.scroll(OLD_COLLECTION, {
          limit: BATCH_SIZE,
          offset,
          with_payload: true,
          with_vector: true
        });
        
        if (!response.points || response.points.length === 0) break;
        
        // Process and enhance each point
        const enhancedPoints = [];
        
        for (const point of response.points) {
          try {
            const enhancedPoint = await this.enhancePoint(point);
            if (enhancedPoint) {
              enhancedPoints.push(enhancedPoint);
            }
          } catch (error) {
            console.error(`❌ Error enhancing point ${point.id}:`, error.message);
            this.stats.errors++;
          }
        }
        
        // Insert enhanced points into new collection
        if (enhancedPoints.length > 0) {
          await this.client.upsert(NEW_COLLECTION, {
            wait: true,
            points: enhancedPoints
          });
          
          this.stats.migrated += enhancedPoints.length;
          console.log(`✅ Batch ${batch}: ${enhancedPoints.length} points migrated`);
        }
        
        offset = response.next_page_offset;
        if (!offset) break;
      }
      
      console.log('\\n🎉 Data migration completed!');
      console.log(`📊 Total migrated: ${this.stats.migrated} points`);
      console.log(`📊 Enhanced: ${this.stats.enhanced} points with better categorization`);
      console.log(`📊 Errors: ${this.stats.errors} points`);
      
    } catch (error) {
      console.error('❌ Data migration failed:', error);
      throw error;
    }
  }

  /**
   * Enhance a single point with better categorization and smaller vector
   */
  async enhancePoint(point) {
    try {
      const payload = point.payload || {};
      const originalVector = point.vector;
      
      // Convert 768D to 384D vector (simple truncation for now)
      // In production, you'd want to re-generate embeddings with a 384D model
      const newVector = originalVector ? originalVector.slice(0, NEW_VECTOR_SIZE) : null;
      
      if (!newVector || newVector.length !== NEW_VECTOR_SIZE) {
        console.warn(`⚠️ Skipping point ${point.id} - invalid vector`);
        return null;
      }
      
      // Enhanced categorization
      const enhancedCategories = this.detectEnhancedCategories(payload);
      
      // Create enhanced payload
      const enhancedPayload = {
        // Keep original fields
        name: payload.name || 'Unknown Place',
        description: payload.description || '',
        address: payload.address || '',
        coordinates: payload.coordinates || payload.coords || { lat: 0, lon: 0 },
        rating: payload.rating || null,
        source: payload.source || 'unknown',
        addedAt: payload.addedAt || new Date().toISOString(),
        
        // Enhanced fields
        category: enhancedCategories.category,
        itemType: enhancedCategories.itemType,
        subcategory: enhancedCategories.subcategory,
        
        // Enhanced types array for better filtering
        types: this.generateTypesArray(payload, enhancedCategories),
        
        // Keep legacy field for backward compatibility
        coords: payload.coordinates || payload.coords || { lat: 0, lon: 0 },
      };
      
      if (enhancedCategories.enhanced) {
        this.stats.enhanced++;
      }
      
      return {
        id: point.id,
        vector: newVector,
        payload: enhancedPayload
      };
      
    } catch (error) {
      console.error(`❌ Error enhancing point ${point.id}:`, error);
      return null;
    }
  }

  /**
   * Detect enhanced categories from existing data
   */
  detectEnhancedCategories(payload) {
    const name = (payload.name || '').toLowerCase();
    const description = (payload.description || '').toLowerCase();
    const source = (payload.source || '').toLowerCase();
    
    let enhanced = false;
    let category = 'attraction';
    let itemType = 'place';
    let subcategory = 'general';
    
    // Try to match against our category mappings
    for (const [keyword, mapping] of Object.entries(CATEGORY_MAPPINGS)) {
      if (keyword === 'default') continue;
      
      if (name.includes(keyword) || description.includes(keyword)) {
        category = mapping.category;
        itemType = mapping.itemType;
        subcategory = mapping.subcategory || 'general';
        enhanced = true;
        break;
      }
    }
    
    // Special source-based detection
    if (source.includes('hotel') || source.includes('booking')) {
      category = 'accommodation';
      itemType = 'hotel';
      enhanced = true;
    } else if (source.includes('restaurant') || source.includes('zomato')) {
      category = 'food';
      itemType = 'restaurant';
      enhanced = true;
    }
    
    return { category, itemType, subcategory, enhanced };
  }

  /**
   * Generate comprehensive types array for filtering
   */
  generateTypesArray(payload, categories) {
    const types = new Set();
    
    // Add category-based types
    types.add(categories.category);
    types.add(categories.itemType);
    if (categories.subcategory !== 'general') {
      types.add(categories.subcategory);
    }
    
    // Add original types if they exist
    if (payload.types && Array.isArray(payload.types)) {
      payload.types.forEach(type => types.add(type));
    }
    
    // Add name-based types
    const name = (payload.name || '').toLowerCase();
    if (name.includes('hotel')) types.add('hotel');
    if (name.includes('restaurant')) types.add('restaurant');
    if (name.includes('temple')) types.add('temple');
    if (name.includes('fort')) types.add('fort');
    if (name.includes('palace')) types.add('palace');
    if (name.includes('park')) types.add('park');
    if (name.includes('market')) types.add('market');
    
    return Array.from(types).slice(0, 10); // Limit to 10 types max
  }

  /**
   * Verify migration success
   */
  async verifyMigration() {
    try {
      const oldInfo = await this.client.getCollection(OLD_COLLECTION);
      const newInfo = await this.client.getCollection(NEW_COLLECTION);
      
      const oldCount = oldInfo.points_count || 0;
      const newCount = newInfo.points_count || 0;
      
      console.log(`📊 Original collection: ${oldCount} points`);
      console.log(`📊 New collection: ${newCount} points`);
      console.log(`📊 Migration rate: ${((newCount / oldCount) * 100).toFixed(1)}%`);
      
      // Sample some points to verify structure
      console.log('\\n🔍 Sampling migrated data...');
      const sample = await this.client.scroll(NEW_COLLECTION, {
        limit: 3,
        with_payload: true
      });
      
      if (sample.points && sample.points.length > 0) {
        sample.points.forEach((point, index) => {
          const p = point.payload;
          console.log(`Sample ${index + 1}:`);
          console.log(`  Name: ${p.name}`);
          console.log(`  Category: ${p.category}`);
          console.log(`  Item Type: ${p.itemType}`);
          console.log(`  Types: [${(p.types || []).join(', ')}]`);
        });
      }
      
      console.log('\\n✅ Migration verification completed');
      
    } catch (error) {
      console.error('❌ Verification failed:', error);
      throw error;
    }
  }

  /**
   * Show cleanup options
   */
  async showCleanupOptions() {
    const duration = Date.now() - this.stats.startTime;
    
    console.log('\\n🎉 Migration Summary:');
    console.log(`⏱️ Duration: ${Math.round(duration / 1000)}s`);
    console.log(`📊 Migrated: ${this.stats.migrated} points`);
    console.log(`🎯 Enhanced: ${this.stats.enhanced} points`);
    console.log(`❌ Errors: ${this.stats.errors} points`);
    console.log(`🗄️ New collection: ${NEW_COLLECTION}`);
    console.log(`📏 Vector size: ${OLD_VECTOR_SIZE}D → ${NEW_VECTOR_SIZE}D`);
    
    console.log('\\n🧹 Next Steps:');
    console.log('1. Test the new collection thoroughly');
    console.log('2. Update your application to use the new collection');
    console.log('3. Update environment variables:');
    console.log(`   QDRANT_COLLECTION=${NEW_COLLECTION}`);
    console.log(`   EMBEDDING_DIM=${NEW_VECTOR_SIZE}`);
    console.log('4. Once satisfied, you can delete the old collection:');
    console.log(`   node -e "require('@qdrant/js-client-rest').QdrantClient({url: '${QDRANT_URL}', apiKey: '${QDRANT_API_KEY}'}).deleteCollection('${OLD_COLLECTION}')"`);
  }
}

// Main execution
async function main() {
  if (!QDRANT_URL || !QDRANT_API_KEY) {
    console.error('❌ Missing QDRANT_URL or QDRANT_API_KEY environment variables');
    process.exit(1);
  }
  
  const migration = new QdrantMigration();
  
  try {
    await migration.migrate();
    console.log('\\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('\\n💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { QdrantMigration };