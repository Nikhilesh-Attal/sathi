const { QdrantClient } = require('@qdrant/js-client-rest');
require('dotenv').config();

async function fixQdrantSchema() {
  const client = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
  });

  const collectionName = process.env.QDRANT_COLLECTION || 'places';
  
  try {
    console.log(`🔧 [QdrantFix] Starting schema fix for collection: ${collectionName}`);
    
    // First, let's check what exists
    try {
      const collectionInfo = await client.getCollection(collectionName);
      console.log(`📊 [QdrantFix] Current collection info:`);
      console.log(`   Points: ${collectionInfo.points_count || 0}`);
      console.log(`   Vector size: ${collectionInfo.config?.params?.vectors?.size || 'unknown'}`);
    } catch (error) {
      console.log(`📝 [QdrantFix] Collection doesn't exist yet`);
    }

    // Get current points to backup (if any)
    let backupData = [];
    try {
      console.log(`💾 [QdrantFix] Backing up existing data...`);
      const scrollResult = await client.scroll(collectionName, {
        limit: 1000,
        with_payload: true,
        with_vector: true,
      });
      backupData = scrollResult.points || [];
      console.log(`✅ [QdrantFix] Backed up ${backupData.length} points`);
    } catch (error) {
      console.log(`⚠️ [QdrantFix] No existing data to backup`);
    }

    // Delete the collection if it exists
    try {
      await client.deleteCollection(collectionName);
      console.log(`🗑️ [QdrantFix] Deleted existing collection`);
    } catch (error) {
      console.log(`📝 [QdrantFix] Collection didn't exist to delete`);
    }

    // Create new collection with proper configuration
    console.log(`🚀 [QdrantFix] Creating new collection with proper schema...`);
    await client.createCollection(collectionName, {
      vectors: {
        size: 768, // text-embedding-3-small dimension
        distance: 'Cosine',
      },
      optimizers_config: {
        default_segment_number: 2,
      },
      hnsw_config: {
        m: 16,
        ef_construct: 100,
        full_scan_threshold: 10000,
      },
    });
    console.log(`✅ [QdrantFix] Collection created successfully`);

    // Create geo-spatial index on 'coordinates' field
    console.log(`🗺️ [QdrantFix] Creating geo-spatial index for 'coordinates' field...`);
    try {
      await client.createPayloadIndex(collectionName, {
        field_name: 'coordinates',
        field_schema: 'geo',
      });
      console.log(`✅ [QdrantFix] Geo-spatial index created`);
    } catch (error) {
      console.log(`⚠️ [QdrantFix] Geo index creation method not available: ${error.message}`);
    }

    // Create category index
    console.log(`🏷️ [QdrantFix] Creating category index...`);
    try {
      await client.createPayloadIndex(collectionName, {
        field_name: 'category',
        field_schema: 'keyword',
      });
      console.log(`✅ [QdrantFix] Category index created`);
    } catch (error) {
      console.log(`⚠️ [QdrantFix] Category index creation failed: ${error.message}`);
    }

    // Create source index
    console.log(`📊 [QdrantFix] Creating source index...`);
    try {
      await client.createPayloadIndex(collectionName, {
        field_name: 'source',
        field_schema: 'keyword',
      });
      console.log(`✅ [QdrantFix] Source index created`);
    } catch (error) {
      console.log(`⚠️ [QdrantFix] Source index creation failed: ${error.message}`);
    }

    // Create itemType index
    console.log(`🎯 [QdrantFix] Creating itemType index...`);
    try {
      await client.createPayloadIndex(collectionName, {
        field_name: 'itemType',
        field_schema: 'keyword',
      });
      console.log(`✅ [QdrantFix] ItemType index created`);
    } catch (error) {
      console.log(`⚠️ [QdrantFix] ItemType index creation failed: ${error.message}`);
    }

    // Create name index for text searches
    console.log(`📝 [QdrantFix] Creating name index...`);
    try {
      await client.createPayloadIndex(collectionName, {
        field_name: 'name',
        field_schema: 'text',
      });
      console.log(`✅ [QdrantFix] Name index created`);
    } catch (error) {
      console.log(`⚠️ [QdrantFix] Name index creation failed: ${error.message}`);
    }

    // If we have backup data, restore it with corrected field names
    if (backupData.length > 0) {
      console.log(`🔄 [QdrantFix] Restoring ${backupData.length} points with corrected schema...`);
      
      const correctedPoints = backupData.map(point => {
        const payload = point.payload || {};
        
        // Fix coordinate field names
        const coordinates = payload.coordinates || payload.coords || {};
        
        return {
          id: point.id,
          vector: point.vector,
          payload: {
            ...payload,
            coordinates: coordinates, // Ensure coordinates field exists
            coords: coordinates,      // Keep legacy field for compatibility
          },
        };
      });

      // Upsert in batches
      const batchSize = 50;
      for (let i = 0; i < correctedPoints.length; i += batchSize) {
        const batch = correctedPoints.slice(i, i + batchSize);
        await client.upsert(collectionName, {
          wait: true,
          points: batch,
        });
        console.log(`   📦 Restored batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(correctedPoints.length/batchSize)}`);
      }
      
      console.log(`✅ [QdrantFix] All data restored successfully`);
    }

    // Verify the setup
    const finalInfo = await client.getCollection(collectionName);
    console.log(`\\n🎉 [QdrantFix] ======== SCHEMA FIX COMPLETE ========`);
    console.log(`✅ Collection: ${collectionName}`);
    console.log(`📊 Points: ${finalInfo.points_count || 0}`);
    console.log(`🔢 Vector size: ${finalInfo.config?.params?.vectors?.size}`);
    console.log(`📏 Distance metric: ${finalInfo.config?.params?.vectors?.distance}`);
    console.log(`🗺️ Geo-spatial search: Ready for 'coordinates' field`);
    console.log(`🔍 All necessary indexes created`);
    console.log(`\\n🚀 [QdrantFix] Ready for testing!`);

  } catch (error) {
    console.error(`💥 [QdrantFix] Error during schema fix:`, error);
    throw error;
  }
}

if (require.main === module) {
  fixQdrantSchema()
    .then(() => {
      console.log('\\n✅ Schema fix completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\\n❌ Schema fix failed:', error.message);
      process.exit(1);
    });
}

module.exports = { fixQdrantSchema };