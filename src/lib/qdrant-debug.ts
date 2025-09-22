export async function debugQdrantConfig() {
  console.log('\n🔧 [QdrantDebug] ======== QDRANT CONFIGURATION DEBUG ========');
  
  // Check environment variables
  console.log('📋 [QdrantDebug] Environment Variables:');
  console.log(`   QDRANT_URL: ${process.env.QDRANT_URL || '❌ NOT SET'}`);
  console.log(`   QDRANT_API_KEY: ${process.env.QDRANT_API_KEY ? '✅ SET (hidden for security)' : '❌ NOT SET'}`);
  console.log(`   QDRANT_COLLECTION: ${process.env.QDRANT_COLLECTION || '❌ NOT SET (will use default: unified_places)'}`);
  
  // Check if all required variables are present
  const requiredVars = ['QDRANT_URL', 'QDRANT_API_KEY'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log('\n❌ [QdrantDebug] CONFIGURATION ISSUE FOUND:');
    console.log(`   Missing environment variables: [${missingVars.join(', ')}]`);
    console.log('\n🔧 [QdrantDebug] TO FIX THIS:');
    console.log('   1. Create a .env.local file in your project root');
    console.log('   2. Add the following lines to .env.local:');
    console.log('      QDRANT_URL=https://your-cluster.qdrant.io');
    console.log('      QDRANT_API_KEY=your-api-key-here');
    console.log('      QDRANT_COLLECTION=unified_places');
    console.log('   3. Restart your development server');
    console.log('\n💡 [QdrantDebug] Get your Qdrant Cloud credentials from: https://cloud.qdrant.io');
    return false;
  }
  
  console.log('\n✅ [QdrantDebug] Environment variables are configured');
  
  // Try to connect
  try {
    console.log('\n🔍 [QdrantDebug] Testing Qdrant Cloud connection...');
    
    const { QdrantClient } = await import('@qdrant/js-client-rest');
    
    const client = new QdrantClient({
      url: process.env.QDRANT_URL!,
      apiKey: process.env.QDRANT_API_KEY!,
    });
    
    const collections = await client.getCollections();
    console.log(`✅ [QdrantDebug] Connection successful!`);
    console.log(`📋 [QdrantDebug] Found ${collections.collections.length} collections:`);
    collections.collections.forEach((col, index) => {
      console.log(`   ${index + 1}. ${col.name}`);
    });
    
    // Check if our target collection exists
    const targetCollection = process.env.QDRANT_COLLECTION || 'unified_places';
    const collectionExists = collections.collections.some(col => col.name === targetCollection);
    
    if (collectionExists) {
      console.log(`✅ [QdrantDebug] Target collection '${targetCollection}' exists`);
      
      // Get collection info
      try {
        const collectionInfo = await client.getCollection(targetCollection);
        console.log(`📊 [QdrantDebug] Collection info:`);
        console.log(`   📈 Points count: ${collectionInfo.points_count || 0}`);
        console.log(`   🔧 Vector size: ${collectionInfo.config?.params?.vectors?.size || 'unknown'}`);
        console.log(`   📏 Distance metric: ${collectionInfo.config?.params?.vectors?.distance || 'unknown'}`);
        
        if (collectionInfo.points_count === 0) {
          console.log(`⚠️  [QdrantDebug] Collection is empty - no data has been stored yet`);
        }
      } catch (error) {
        console.warn(`⚠️  [QdrantDebug] Could not fetch collection details:`, error);
      }
    } else {
      console.log(`⚠️  [QdrantDebug] Target collection '${targetCollection}' does not exist yet`);
      console.log(`💡 [QdrantDebug] It will be created automatically when data is first stored`);
    }
    
    return true;
    
  } catch (error: any) {
    console.error('\n❌ [QdrantDebug] CONNECTION FAILED:');
    console.error(`   Error: ${error.message}`);
    console.error('\n🔧 [QdrantDebug] TROUBLESHOOTING:');
    console.error('   1. Check that your QDRANT_URL is correct');
    console.error('   2. Verify your QDRANT_API_KEY is valid');
    console.error('   3. Ensure you have internet connectivity');
    console.error('   4. Check if your Qdrant cluster is running');
    return false;
  }
}

// Quick configuration helper
export function generateEnvTemplate() {
  const template = `# Qdrant Cloud Configuration
# Get these values from https://cloud.qdrant.io
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your-api-key-here
QDRANT_COLLECTION=unified_places

# Other API keys (if needed)
OPENAI_API_KEY=your-openai-key-here
RAPIDAPI_KEY=your-rapidapi-key-here
GEOAPIFY_API_KEY=your-geoapify-key-here
OPENTRIPMAP_API_KEY=your-opentripmap-key-here`;

  return template;
}

// Utility to check if Qdrant is ready
export async function isQdrantReady(): Promise<boolean> {
  try {
    const requiredVars = ['QDRANT_URL', 'QDRANT_API_KEY'];
    const hasRequiredVars = requiredVars.every(varName => process.env[varName]);
    
    if (!hasRequiredVars) {
      return false;
    }

    const { QdrantClient } = await import('@qdrant/js-client-rest');
    
    const client = new QdrantClient({
      url: process.env.QDRANT_URL!,
      apiKey: process.env.QDRANT_API_KEY!,
    });
    
    await client.getCollections();
    return true;
    
  } catch (error) {
    return false;
  }
}