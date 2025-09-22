import { NextRequest, NextResponse } from 'next/server';
import { debugQdrantConfig, isQdrantReady, generateEnvTemplate } from '@/lib/qdrant-debug';

export async function GET(request: NextRequest) {
  try {
    console.log('\n🧪 [QdrantTest] Testing Qdrant Cloud connection via API route...');
    
    // Run debug check
    const isReady = await isQdrantReady();
    
    if (isReady) {
      // If ready, run full debug to show details
      await debugQdrantConfig();
      
      return NextResponse.json({
        success: true,
        message: 'Qdrant Cloud is properly configured and accessible',
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      // If not ready, provide configuration guidance
      console.log('❌ [QdrantTest] Qdrant Cloud not ready');
      await debugQdrantConfig();
      
      return NextResponse.json({
        success: false,
        message: 'Qdrant Cloud is not properly configured',
        status: 'not_configured',
        envTemplate: generateEnvTemplate(),
        instructions: [
          '1. Create a .env.local file in your project root',
          '2. Add your Qdrant Cloud credentials',
          '3. Restart your development server',
          '4. Test again by visiting this endpoint'
        ],
        timestamp: new Date().toISOString()
      }, { status: 422 });
    }
    
  } catch (error: any) {
    console.error('💥 [QdrantTest] Test failed:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to test Qdrant Cloud connection',
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('\n🧪 [QdrantTest] Testing custom Qdrant configuration...');
    
    if (!body.url || !body.apiKey) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: url and apiKey'
      }, { status: 400 });
    }
    
    // Test custom configuration
    const { QdrantClient } = await import('@qdrant/js-client-rest');
    
    const client = new QdrantClient({
      url: body.url,
      apiKey: body.apiKey,
    });
    
    const collections = await client.getCollections();
    
    console.log(`✅ [QdrantTest] Custom configuration works!`);
    console.log(`📋 [QdrantTest] Found ${collections.collections.length} collections`);
    
    return NextResponse.json({
      success: true,
      message: 'Custom Qdrant configuration is working',
      collections: collections.collections.map(col => ({
        name: col.name,
        status: col.status
      })),
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('💥 [QdrantTest] Custom test failed:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Custom Qdrant configuration failed',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}