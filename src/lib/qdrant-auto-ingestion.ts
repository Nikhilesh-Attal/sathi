/**
 * Qdrant Auto-Ingestion Service
 * Automatically stores successful API results to Qdrant Cloud with comprehensive logging
 * This creates a self-improving system that reduces API calls over time
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import { getEmbedding } from './embedding';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import type { Place } from './types';
import { dataQualityMonitor } from './data-quality-monitor';
import { detectPlaceCategory, getAllCategories, getCategoryById } from './place-categories';

export interface QdrantPlace {
  id: string;
  name: string;
  description?: string;
  category: string;
  address: string;
  coords: {
    lat: number;
    lon: number;
  };
  rating?: number;
  types: string[];
  source: string;
  photoUrl?: string;
  addedAt: string;
  itemType: 'place' | 'hotel' | 'restaurant';
  // Enhanced fields for better categorization
  subcategory?: string;
  keywords?: string[];
}

export interface IngestionResult {
  success: boolean;
  stored: number;
  updated: number;
  duplicatesSkipped: number;
  errors: number;
  totalProcessed: number;
  processingTime: number;
  errorDetails: string[];
}

export interface IngestionMetrics {
  totalIngestedToday: number;
  totalIngestedThisWeek: number;
  successRate: number;
  averageProcessingTime: number;
  sourceBreakdown: Record<string, number>;
  lastIngestionTime: number;
}

export class QdrantAutoIngestion {
  private static instance: QdrantAutoIngestion;
  private client: QdrantClient | null = null;
  private isInitialized = false;
  private metrics: IngestionMetrics = {
    totalIngestedToday: 0,
    totalIngestedThisWeek: 0,
    successRate: 0,
    averageProcessingTime: 0,
    sourceBreakdown: {},
    lastIngestionTime: 0
  };

  private readonly COLLECTION_NAME = 'places'; // Single collection as per .env config

  private constructor() {
    this.initializeClient();
  }

  public static getInstance(): QdrantAutoIngestion {
    if (!QdrantAutoIngestion.instance) {
      QdrantAutoIngestion.instance = new QdrantAutoIngestion();
    }
    return QdrantAutoIngestion.instance;
  }

  /**
   * Initialize Qdrant client with environment variables
   */
  private async initializeClient(): Promise<void> {
    try {
      const qdrantUrl = process.env.QDRANT_URL;
      const qdrantApiKey = process.env.QDRANT_API_KEY;

      if (!qdrantUrl || !qdrantApiKey) {
        console.warn('[QdrantAutoIngestion] ⚠️ Qdrant configuration missing. Auto-ingestion disabled.');
        return;
      }

      this.client = new QdrantClient({
        url: qdrantUrl,
        apiKey: qdrantApiKey,
      });

      // Test connection and ensure collection exists
      await this.ensureCollectionExists();
      
      this.isInitialized = true;
      console.log('[QdrantAutoIngestion] ✅ Initialized successfully');
      
    } catch (error: any) {
      console.error('[QdrantAutoIngestion] ❌ Failed to initialize:', error.message);
      this.client = null;
      this.isInitialized = false;
    }
  }

  /**
   * Ensure the 'places' collection exists in Qdrant
   */
  private async ensureCollectionExists(): Promise<void> {
    if (!this.client) return;

    try {
      const collections = await this.client.getCollections();
      const existingNames = collections.collections.map(c => c.name);

      if (!existingNames.includes(this.COLLECTION_NAME)) {
        console.log(`[QdrantAutoIngestion] 🔧 Creating collection: ${this.COLLECTION_NAME}`);
        
        await this.client.createCollection(this.COLLECTION_NAME, {
          vectors: {
            size: 384, // default expected dimension (can be adjusted by env)
            distance: 'Cosine',
          },
          optimizers_config: {
            deleted_threshold: 0.2,
            vacuum_min_vector_number: 1000,
            default_segment_number: 0,
            max_segment_size: 20000,
            memmap_threshold: 10000,
            indexing_threshold: 20000,
            flush_interval_sec: 5,
          },
        });

        // Create useful field indexes for efficient filtering & geo queries
        try {
          await this.client.createFieldIndex(this.COLLECTION_NAME, {
            field_name: 'coords',
            field_type: 'geo',
          });
          await this.client.createFieldIndex(this.COLLECTION_NAME, {
            field_name: 'category',
            field_type: 'keyword',
          });
          await this.client.createFieldIndex(this.COLLECTION_NAME, {
            field_name: 'source',
            field_type: 'keyword',
          });
          console.log(`[QdrantAutoIngestion] ✅ Created field indexes: coords (geo), category, source`);
        } catch (indexErr: any) {
          console.warn('[QdrantAutoIngestion] ⚠️ Failed creating one or more field indexes:', indexErr.message);
        }

        // Set embedding dimension to match newly created collection
        try {
          const info = await this.client.getCollection(this.COLLECTION_NAME);
          const size = (info as any)?.config?.params?.vectors?.size || 768;
          process.env.EMBEDDING_DIM = String(size);
          console.log(`[QdrantAutoIngestion] 📏 Embedding dimension set to ${size}`);
        } catch {}

        console.log(`[QdrantAutoIngestion] ✅ Created collection: ${this.COLLECTION_NAME}`);
      } else {
        console.log(`[QdrantAutoIngestion] ✅ Collection '${this.COLLECTION_NAME}' already exists`);
        // Read existing vector size and set embedding dim accordingly
        try {
          const info = await this.client.getCollection(this.COLLECTION_NAME);
          const size = (info as any)?.config?.params?.vectors?.size;
          if (typeof size === 'number' && size > 0) {
            process.env.EMBEDDING_DIM = String(size);
            console.log(`[QdrantAutoIngestion] 📏 Detected vector size: ${size} (aligning embeddings)`);
          }
        } catch (err) {
          console.warn('[QdrantAutoIngestion] ⚠️ Failed to detect collection vector size');
        }
        // Best-effort: ensure indexes exist (ignore errors if already created)
        try { await this.client.createFieldIndex(this.COLLECTION_NAME, { field_name: 'coords', field_type: 'geo' }); } catch {}
        try { await this.client.createFieldIndex(this.COLLECTION_NAME, { field_name: 'category', field_type: 'keyword' }); } catch {}
        try { await this.client.createFieldIndex(this.COLLECTION_NAME, { field_name: 'source', field_type: 'keyword' }); } catch {}
      }
    } catch (error: any) {
      console.error('[QdrantAutoIngestion] ❌ Error ensuring collection exists:', error.message);
      throw error;
    }
  }

  /**
   * Main method to automatically ingest data from API results
   */
  public async ingestAPIResults(
    places: Place[],
    source: string,
    latitude: number,
    longitude: number,
    radius: number
  ): Promise<IngestionResult> {
    const startTime = Date.now();
    console.log(`[QdrantAutoIngestion] 🚀 Starting auto-ingestion from ${source}`);
    console.log(`[QdrantAutoIngestion] 📍 Location: lat=${latitude}, lon=${longitude}, radius=${radius}m`);
    console.log(`[QdrantAutoIngestion] 📦 Processing ${places.length} places from ${source}`);
    
    // 🔍 ASSESS DATA QUALITY BEFORE INGESTION
    console.log(`[QdrantAutoIngestion] 🔍 Assessing data quality for ${source}...`);
    const qualityMetrics = dataQualityMonitor.assessDataQuality(places, source);
    console.log(`[QdrantAutoIngestion] 🎖️ Quality Score: ${qualityMetrics.overallQualityScore.toFixed(1)}/100 (Valid: ${qualityMetrics.validRecords}/${qualityMetrics.totalRecords})`);
    
    if (qualityMetrics.overallQualityScore < 30) {
      console.warn(`[QdrantAutoIngestion] ⚠️ Data quality too poor for ingestion (${qualityMetrics.overallQualityScore.toFixed(1)}/100)`);
      return {
        success: false,
        stored: 0,
        updated: 0,
        duplicatesSkipped: 0,
        errors: places.length,
        totalProcessed: places.length,
        processingTime: Date.now() - startTime,
        errorDetails: [`Data quality score too low: ${qualityMetrics.overallQualityScore.toFixed(1)}/100`]
      };
    }

    if (!this.isInitialized || !this.client) {
      console.warn('[QdrantAutoIngestion] ⚠️ Service not initialized. Skipping ingestion.');
      return {
        success: false,
        stored: 0,
        updated: 0,
        duplicatesSkipped: 0,
        errors: places.length,
        totalProcessed: places.length,
        processingTime: Date.now() - startTime,
        errorDetails: ['Service not initialized']
      };
    }

    const result: IngestionResult = {
      success: true,
      stored: 0,
      updated: 0,
      duplicatesSkipped: 0,
      errors: 0,
      totalProcessed: places.length,
      processingTime: 0,
      errorDetails: []
    };

    // Process all places in the single 'places' collection
    console.log(`[QdrantAutoIngestion] 🔄 Processing ${places.length} places for unified storage`);
    
    try {
      const processingResult = await this.ingestAllPlaces(places, source);

      result.stored = processingResult.stored;
      result.updated = processingResult.updated;
      result.duplicatesSkipped = processingResult.duplicatesSkipped;
      result.errors = processingResult.errors;
      result.errorDetails = processingResult.errorDetails;

      console.log(`[QdrantAutoIngestion] ✅ Unified storage: stored=${result.stored}, updated=${result.updated}, duplicates=${result.duplicatesSkipped}, errors=${result.errors}`);
      
    } catch (error: any) {
      console.error(`[QdrantAutoIngestion] ❌ Error in unified processing:`, error.message);
      result.errors = places.length;
      result.errorDetails.push(`Unified processing: ${error.message}`);
      result.success = false;
    }

    result.processingTime = Date.now() - startTime;
    
    // Update metrics
    this.updateMetrics(result, source);

    // Final logging with quality insights
    console.log(`[QdrantAutoIngestion] 🏁 Ingestion completed in ${result.processingTime}ms`);
    console.log(`[QdrantAutoIngestion] 📊 Final Results:`);
    console.log(`  ✅ Stored: ${result.stored}`);
    console.log(`  🔄 Updated: ${result.updated}`);
    console.log(`  ⏭️ Duplicates Skipped: ${result.duplicatesSkipped}`);
    console.log(`  ❌ Errors: ${result.errors}`);
    console.log(`  📈 Success Rate: ${((result.stored + result.updated) / result.totalProcessed * 100).toFixed(1)}%`);
    console.log(`  🎖️ Data Quality: ${qualityMetrics.overallQualityScore.toFixed(1)}/100`);
    
    if (qualityMetrics.issues.length > 0) {
      console.log(`[QdrantAutoIngestion] 🚨 Quality Issues Found:`);
      qualityMetrics.issues.slice(0, 3).forEach(issue => {
        console.log(`  - ${issue.severity.toUpperCase()}: ${issue.message}`);
      });
      if (qualityMetrics.issues.length > 3) {
        console.log(`  ... and ${qualityMetrics.issues.length - 3} more issues`);
      }
    }

    if (result.errors > 0) {
      console.warn(`[QdrantAutoIngestion] ⚠️ Error Details:`, result.errorDetails);
    }

    return result;
  }

  /**
   * Ingest all places into the unified 'places' collection
   */
  private async ingestAllPlaces(
    places: Place[],
    source: string
  ): Promise<IngestionResult> {
    const result: IngestionResult = {
      success: true,
      stored: 0,
      updated: 0,
      duplicatesSkipped: 0,
      errors: 0,
      totalProcessed: places.length,
      processingTime: 0,
      errorDetails: []
    };

    // Process places in batches for better performance
    const batchSize = 10;
    for (let i = 0; i < places.length; i += batchSize) {
      const batch = places.slice(i, i + batchSize);
      
      try {
        const batchResult = await this.processBatch(batch, source);
        
        result.stored += batchResult.stored;
        result.updated += batchResult.updated;
        result.duplicatesSkipped += batchResult.duplicatesSkipped;
        result.errors += batchResult.errors;
        result.errorDetails.push(...batchResult.errorDetails);

      } catch (error: any) {
        console.error(`[QdrantAutoIngestion] ❌ Batch processing error:`, error.message);
        result.errors += batch.length;
        result.errorDetails.push(`Batch error: ${error.message}`);
      }
    }

    return result;
  }

  /**
   * Process a batch of places
   */
  private async processBatch(
    places: Place[],
    source: string
  ): Promise<IngestionResult> {
    const result: IngestionResult = {
      success: true,
      stored: 0,
      updated: 0,
      duplicatesSkipped: 0,
      errors: 0,
      totalProcessed: places.length,
      processingTime: 0,
      errorDetails: []
    };

    for (const place of places) {
      try {
        // Validate coordinates before processing
        const lat = place.point?.lat || place.geometry?.location?.lat || place.latitude || 0;
        const lon = place.point?.lon || place.geometry?.location?.lng || place.longitude || 0;
        
        if (lat === 0 && lon === 0) {
          console.log(`[QdrantAutoIngestion] ⚠️ Skipping ${place.name} - missing valid coordinates`);
          result.errors++;
          result.errorDetails.push(`${place.name}: Missing valid coordinates`);
          continue;
        }

        // Check if place already exists
        console.log(`[QdrantAutoIngestion] 🔍 Checking for duplicates: ${place.name} at (${lat}, ${lon})`);
        const existingPlace = await this.findExistingPlace(place);
        
        if (existingPlace) {
          console.log(`[QdrantAutoIngestion] ⏭️ Duplicate found: ${place.name} (${source})`);
          result.duplicatesSkipped++;
          continue;
        } else {
          console.log(`[QdrantAutoIngestion] ✅ No duplicate found for: ${place.name} - proceeding to store`);
        }

        // Generate embedding for the place
        const embedding = await this.generatePlaceEmbedding(place);
        
        // Convert to Qdrant format with intelligent itemType detection
        const qdrantPlace = this.convertToQdrantPlace(place, source);
        
        // Store in unified 'places' collection
        // Create simplified payload compatible with Qdrant - using basic types only
        const simplifiedPayload = {
          name: qdrantPlace.name,
          description: qdrantPlace.description || '',
          category: qdrantPlace.category,
          address: qdrantPlace.address,
          coordinates: qdrantPlace.coords,  // Use 'coordinates' to match the geo index
          coords: qdrantPlace.coords,       // Keep legacy field for backward compatibility
          rating: qdrantPlace.rating || 0,
          source: qdrantPlace.source,
          addedAt: qdrantPlace.addedAt,
          itemType: qdrantPlace.itemType
        };
        
        // Log the data being sent for debugging
        console.log(`[QdrantAutoIngestion] 🔄 Attempting to store: ${qdrantPlace.name}`);
        console.log(`[QdrantAutoIngestion] 📝 ID: ${qdrantPlace.id}, Vector Length: ${embedding.length}`);
        
        // Test with ultra-minimal payload first
        const testPayload = {
          name: qdrantPlace.name,
          coordinates: qdrantPlace.coords,  // Use 'coordinates' to match the geo index
          coords: qdrantPlace.coords        // Keep legacy field for backward compatibility
        };
        
        await this.client!.upsert(this.COLLECTION_NAME, {
          wait: true,
          points: [{
            id: qdrantPlace.id,
            vector: embedding,
            payload: testPayload
          }]
        });

        console.log(`[QdrantAutoIngestion] ✅ Stored: ${place.name} → ${this.COLLECTION_NAME} (${qdrantPlace.itemType}, ${source})`);
        result.stored++;

      } catch (error: any) {
        console.error(`[QdrantAutoIngestion] ❌ Error storing place: ${place.name}`, error.message);
        result.errors++;
        result.errorDetails.push(`${place.name}: ${error.message}`);
      }
    }

    return result;
  }

  /**
   * Find existing place in collection to avoid duplicates
   */
  private async findExistingPlace(place: Place): Promise<boolean> {
    try {
      // Get coordinates with multiple fallbacks
      const lat = place.point?.lat || place.geometry?.location?.lat || place.latitude || 0;
      const lon = place.point?.lon || place.geometry?.location?.lng || place.longitude || 0;
      
      if (lat === 0 && lon === 0) {
        // Can't check duplicates without coordinates
        return false;
      }
      
      // Simple name-based duplicate check first (faster)
      const nameFilter = {
        must: [
          {
            key: 'name',
            match: {
              value: place.name
            }
          }
        ]
      };
      
      // Prefer geo-based duplicate detection to avoid text matching issues
      const geoFilter = (field: string) => ({
        must: [
          {
            key: field,
            geo_radius: {
              center: { lat, lon },
              radius: 100, // 100 meters
            },
          },
        ],
      });

      // Try coordinates field first (matches the geo index)
      let points: any[] = [];
      try {
        const res = await this.client!.scroll(this.COLLECTION_NAME, {
          filter: geoFilter('coordinates'),
          limit: 5,
          with_payload: true,
        });
        points = res.points || [];
      } catch (e1: any) {
        // Fallback to legacy coords field
        try {
          const res2 = await this.client!.scroll(this.COLLECTION_NAME, {
            filter: geoFilter('coords'),
            limit: 5,
            with_payload: true,
          });
          points = res2.points || [];
        } catch (e2: any) {
          // As a final fallback, try name match (may fail on some payload configs)
          try {
            const nameFilter = {
              must: [
                {
                  key: 'name',
                  match: { value: place.name },
                },
              ],
            };
            const byName = await this.client!.scroll(this.COLLECTION_NAME, {
              filter: nameFilter,
              limit: 5,
              with_payload: true,
            });
            points = byName.points || [];
          } catch (e3: any) {
            // If all attempts fail, assume no duplicates
            points = [];
          }
        }
      }

      for (const result of points) {
        const payload = result.payload as any;
        // Check both coordinate field formats
        const c = payload?.coordinates || payload?.coords || {};
        const plat = c.lat;
        const plon = c.lon;
        if (typeof plat === 'number' && typeof plon === 'number') {
          const latDiff = Math.abs(plat - lat);
          const lonDiff = Math.abs(plon - lon);
          if (latDiff < 0.001 && lonDiff < 0.001) {
            console.log(`[QdrantAutoIngestion] 🔍 Duplicate detected near same coordinates for ${place.name}`);
            return true;
          }
        }
      }

      return false;
    } catch (error: any) {
      console.warn(`[QdrantAutoIngestion] ⚠️ Duplicate check failed for ${place.name}:`, error.message);
      // If search fails, assume no duplicate to be safe
      return false;
    }
  }

  /**
   * Generate embedding for a place
   */
  private async generatePlaceEmbedding(place: Place): Promise<number[]> {
    try {
      const text = `${place.name} ${place.description || ''} ${place.vicinity || ''} ${place.types?.join(' ') || ''}`.trim();
      return await getEmbedding(text);
    } catch (error: any) {
      console.warn(`[QdrantAutoIngestion] ⚠️ Failed to generate embedding for ${place.name}, using fallback`);
      // Return a zero vector as fallback matching configured dimension
      const dim = Number(process.env.EMBEDDING_DIM || 384)(process.env.EMBEDDING_DIM || 768);
      return new Array(dim).fill(0);
    }
  }

  /**
   * Convert Place to QdrantPlace format with intelligent itemType detection
   */
  private convertToQdrantPlace = (place: Place, source: string): QdrantPlace => {
    // Intelligently detect item type
    const itemType = this.detectItemType(place);
    
    const category = this.inferCategory(place, itemType);
    const keywords = this.extractKeywords(place, itemType);
    
    // Generate deterministic ID like working implementation
    let pointId: string;
    if (place.place_id && /^\d+$/.test(place.place_id.toString())) {
      // If place_id is numeric, use it directly
      pointId = place.place_id.toString();
    } else {
      // Generate hash-based ID from name and source
      const idString = `${place.name}-${source}-${place.point?.lat || 0}-${place.point?.lon || 0}`;
      pointId = crypto.createHash('md5').update(idString).digest('hex');
    }
    
    return {
      id: pointId,
      name: place.name || 'Unknown Place',
      description: place.description || '',
      category,
      address: place.vicinity || place.formatted_address || 'Address not available',
      coords: {
        lat: place.point?.lat || place.geometry?.location?.lat || place.latitude || 0,
        lon: place.point?.lon || place.geometry?.location?.lng || place.longitude || 0,
      },
      rating: place.rating || undefined,
      types: place.types || [itemType],
      source: `auto-ingested-${source}`,
      photoUrl: place.photoUrl || place.photos?.[0]?.photo_reference || undefined,
      addedAt: new Date().toISOString(),
      itemType,
      subcategory: this.inferSubcategory(place, itemType, category),
      keywords
    };
  }

  /**
   * Intelligently detect item type from place data
   */
  private detectItemType = (place: Place): 'place' | 'hotel' | 'restaurant' => {
    // Check if explicitly provided
    if ((place as any).itemType) {
      return (place as any).itemType;
    }
    
    const name = (place.name || '').toLowerCase();
    const types = place.types || [];
    const description = (place.description || '').toLowerCase();
    
    // Hotel/Accommodation detection
    const hotelKeywords = ['hotel', 'resort', 'inn', 'lodge', 'hostel', 'guest house', 'accommodation'];
    const hotelTypes = ['lodging', 'hotel', 'accommodation', 'hostel', 'guest_house'];
    
    if (types.some(t => hotelTypes.includes(t.toLowerCase())) ||
        hotelKeywords.some(keyword => name.includes(keyword) || description.includes(keyword))) {
      return 'hotel';
    }
    
    // Restaurant/Food detection
    const foodKeywords = ['restaurant', 'cafe', 'bar', 'bistro', 'diner', 'eatery', 'food', 'kitchen'];
    const foodTypes = ['restaurant', 'food', 'meal_takeaway', 'cafe', 'bar', 'bakery', 'meal_delivery'];
    
    if (types.some(t => foodTypes.includes(t.toLowerCase())) ||
        foodKeywords.some(keyword => name.includes(keyword) || description.includes(keyword))) {
      return 'restaurant';
    }
    
    // Everything else is a 'place' (attractions, temples, forts, museums, etc.)
    return 'place';
  }

  /**
   * Infer category from place data with comprehensive categorization system
   */
  private inferCategory = (place: Place, itemType: 'place' | 'hotel' | 'restaurant'): string => {
    // First, try to detect category using the comprehensive categories system
    const detectedCategory = detectPlaceCategory(place);
    if (detectedCategory) {
      console.log(`[QdrantAutoIngestion] 🎯 Detected category: ${detectedCategory.name} for ${place.name}`);
      return detectedCategory.id;
    }
    
    // Fallback to basic categorization
    if (place.types && place.types.length > 0) {
      return place.types[0];
    }
    
    const name = (place.name || '').toLowerCase();
    const description = (place.description || '').toLowerCase();
    
    // Enhanced categorization for places
    if (itemType === 'place') {
      // Religious places
      if (name.includes('temple') || name.includes('mandir') || name.includes('church') || 
          name.includes('mosque') || name.includes('gurudwara') || description.includes('temple')) {
        return 'hindu-temple'; // Default to most common in India
      }
      
      // Historical places
      if (name.includes('fort') || name.includes('palace') || name.includes('monument') || 
          name.includes('heritage') || description.includes('historical')) {
        if (name.includes('fort')) return 'fort';
        if (name.includes('palace')) return 'palace';
        return 'monument';
      }
      
      // Museums
      if (name.includes('museum') || description.includes('museum')) {
        return 'museum';
      }
      
      // Parks and nature
      if (name.includes('park') || name.includes('garden') || name.includes('lake') || 
          name.includes('hill') || description.includes('nature')) {
        if (name.includes('hill') || name.includes('mountain')) return 'hill-station';
        if (name.includes('lake') || name.includes('river')) return 'lake';
        if (name.includes('waterfall')) return 'waterfall';
        return 'garden';
      }
      
      // Markets and shopping
      if (name.includes('market') || name.includes('bazaar') || name.includes('mall')) {
        return 'market';
      }
    }
    
    // Default categories
    switch (itemType) {
      case 'hotel': return 'accommodation';
      case 'restaurant': return 'food';
      case 'place':
      default: return 'attraction';
    }
  }

  /**
   * Infer subcategory for more granular classification
   */
  private inferSubcategory = (place: Place, itemType: 'place' | 'hotel' | 'restaurant', category: string): string | undefined => {
    const name = (place.name || '').toLowerCase();
    const description = (place.description || '').toLowerCase();
    const types = place.types || [];
    
    if (itemType === 'place') {
      // Temple subcategories
      if (category === 'hindu-temple' || category.includes('temple')) {
        if (name.includes('shiva') || name.includes('mahadev')) return 'shiva-temple';
        if (name.includes('vishnu') || name.includes('rama') || name.includes('krishna')) return 'vishnu-temple';
        if (name.includes('devi') || name.includes('mata') || name.includes('goddess')) return 'devi-temple';
        if (name.includes('hanuman')) return 'hanuman-temple';
        if (name.includes('church')) return 'church';
        if (name.includes('mosque') || name.includes('masjid')) return 'mosque';
        if (name.includes('gurudwara')) return 'gurudwara';
      }
      
      // Historical subcategories
      if (category === 'fort' || category === 'palace' || category === 'monument') {
        if (name.includes('fort') || name.includes('qila')) return 'fort';
        if (name.includes('palace') || name.includes('mahal')) return 'palace';
        if (name.includes('monument')) return 'monument';
        if (name.includes('tomb') || name.includes('maqbara')) return 'tomb';
        if (name.includes('heritage') || description.includes('unesco')) return 'world-heritage';
      }
      
      // Nature subcategories
      if (category === 'hill-station' || category === 'waterfall' || category === 'lake' || category === 'garden') {
        if (name.includes('hill') || name.includes('peak') || name.includes('mountain')) return 'hill-station';
        if (name.includes('lake') || name.includes('river')) return 'water-body';
        if (name.includes('garden') || name.includes('botanical')) return 'garden';
        if (name.includes('park') || name.includes('sanctuary') || name.includes('reserve')) return 'park';
        if (name.includes('beach')) return 'beach';
        if (name.includes('waterfall') || name.includes('falls')) return 'waterfall';
      }
    }
    
    if (itemType === 'hotel') {
      if (name.includes('resort')) return 'resort';
      if (name.includes('heritage') || name.includes('palace')) return 'heritage-hotel';
      if (name.includes('boutique')) return 'boutique-hotel';
      if (name.includes('budget') || name.includes('lodge')) return 'budget-hotel';
    }
    
    if (itemType === 'restaurant') {
      if (types.some(t => t.toLowerCase().includes('vegetarian')) || name.includes('veg')) return 'vegetarian';
      if (name.includes('dhaba') || description.includes('punjabi')) return 'dhaba';
      if (name.includes('cafe') || name.includes('coffee')) return 'cafe';
      if (name.includes('fine dining') || description.includes('fine dining')) return 'fine-dining';
      if (name.includes('street food') || name.includes('chaat')) return 'street-food';
    }
    
    return undefined;
  }

  /**
   * Extract relevant keywords for better searchability using comprehensive categories
   */
  private extractKeywords = (place: Place, itemType: 'place' | 'hotel' | 'restaurant'): string[] => {
    const keywords: Set<string> = new Set();
    
    const name = (place.name || '').toLowerCase();
    const description = (place.description || '').toLowerCase();
    const types = place.types || [];
    
    // Add item type
    keywords.add(itemType);
    
    // Add types
    types.forEach(type => {
      keywords.add(type.toLowerCase().replace('_', '-'));
    });
    
    // Try to detect category and add its keywords
    const detectedCategory = detectPlaceCategory(place);
    if (detectedCategory) {
      // Add category-specific keywords
      detectedCategory.keywords.forEach(keyword => keywords.add(keyword));
      
      // Add category ID and name as keywords
      keywords.add(detectedCategory.id);
      keywords.add(detectedCategory.name.toLowerCase());
      
      console.log(`[QdrantAutoIngestion] 🏷️ Added ${detectedCategory.keywords.length} category keywords for ${place.name}`);
    }
    
    // Extract words from name (filter out common words)
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'near', 'hotel', 'resort', 'restaurant', 'cafe'];
    const nameWords = name.split(/[\s\-_]+/).filter(word => 
      word.length > 2 && !commonWords.includes(word) && !/^\d+$/.test(word)
    );
    nameWords.forEach(word => keywords.add(word));
    
    // Add location-specific keywords from comprehensive categories
    const allCategories = getAllCategories();
    for (const category of allCategories) {
      for (const keyword of category.keywords) {
        if (name.includes(keyword.toLowerCase()) || description.includes(keyword.toLowerCase())) {
          keywords.add(keyword);
          keywords.add(category.id);
        }
      }
    }
    
    // Add contextual keywords
    if (name.includes('beach') || description.includes('beach')) keywords.add('coastal');
    if (name.includes('hill') || description.includes('hill')) keywords.add('mountain');
    if (name.includes('heritage') || description.includes('heritage')) keywords.add('historical');
    if (name.includes('royal') || name.includes('palace')) keywords.add('regal');
    if (name.includes('ancient') || description.includes('ancient')) keywords.add('historic');
    if (name.includes('modern') || description.includes('modern')) keywords.add('contemporary');
    if (name.includes('sacred') || name.includes('holy')) keywords.add('spiritual');
    
    return Array.from(keywords).slice(0, 20); // Increased limit to 20 keywords
  }



  /**
   * Update ingestion metrics
   */
  private updateMetrics(result: IngestionResult, source: string): void {
    this.metrics.lastIngestionTime = Date.now();
    this.metrics.totalIngestedToday += result.stored + result.updated;
    this.metrics.totalIngestedThisWeek += result.stored + result.updated;
    
    // Update source breakdown
    const ingestedCount = result.stored + result.updated;
    this.metrics.sourceBreakdown[source] = (this.metrics.sourceBreakdown[source] || 0) + ingestedCount;
    
    // Update success rate (simple moving average)
    const currentSuccessRate = (result.stored + result.updated) / result.totalProcessed;
    this.metrics.successRate = (this.metrics.successRate + currentSuccessRate) / 2;
    
    // Update average processing time
    this.metrics.averageProcessingTime = (this.metrics.averageProcessingTime + result.processingTime) / 2;
  }

  /**
   * Get current metrics
   */
  public getMetrics(): IngestionMetrics {
    return { ...this.metrics };
  }

  /**
   * Get ingestion status
   */
  public getStatus(): {
    initialized: boolean;
    collection: string;
    lastIngestion: string | null;
    totalIngested: number;
  } {
    return {
      initialized: this.isInitialized,
      collection: this.COLLECTION_NAME,
      lastIngestion: this.metrics.lastIngestionTime 
        ? new Date(this.metrics.lastIngestionTime).toISOString() 
        : null,
      totalIngested: this.metrics.totalIngestedThisWeek
    };
  }

  /**
   * Reset daily metrics (call this at midnight)
   */
  public resetDailyMetrics(): void {
    this.metrics.totalIngestedToday = 0;
    console.log('[QdrantAutoIngestion] 🔄 Daily metrics reset');
  }
}

// Export singleton instance
export const qdrantAutoIngestion = QdrantAutoIngestion.getInstance();

/**
 * Convenience function to automatically ingest API results
 */
export async function autoIngestAPIResults(
  places: Place[],
  source: string,
  latitude: number,
  longitude: number,
  radius: number
): Promise<IngestionResult> {
  return qdrantAutoIngestion.ingestAPIResults(places, source, latitude, longitude, radius);
}