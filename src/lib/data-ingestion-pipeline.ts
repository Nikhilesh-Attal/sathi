import { dataAggregator, type AggregationParams, type AggregationResult } from './data-aggregator';
import { cascadingDataAggregator } from './cascading-data-aggregator';
import { qdrantStorage, type SearchParams } from './qdrant-storage';

export interface IngestionConfig {
  batchSize: number;
  maxRetries: number;
  retryDelay: number; // in milliseconds
  enableOptimization: boolean;
}

export interface IngestionJob {
  id: string;
  params: AggregationParams;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: string;
  endTime?: string;
  result?: IngestionResult;
  error?: string;
}

export interface IngestionResult {
  aggregationResult: AggregationResult;
  storageResult: {
    stored: number;
    updated: number;
    errors: number;
    duplicatesSkipped: number;
  };
  totalProcessingTime: number;
  success: boolean;
}

export interface ScheduledIngestion {
  locationName: string;
  latitude: number;
  longitude: number;
  radius: number;
  frequency: 'hourly' | 'daily' | 'weekly';
  categories?: string[];
  active: boolean;
}

export class DataIngestionPipeline {
  private static instance: DataIngestionPipeline;
  private jobs: Map<string, IngestionJob> = new Map();
  private config: IngestionConfig;
  private isRunning = false;

  private constructor(config?: Partial<IngestionConfig>) {
    this.config = {
      batchSize: 100,
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      enableOptimization: true,
      ...config,
    };
  }

  public static getInstance(config?: Partial<IngestionConfig>): DataIngestionPipeline {
    if (!DataIngestionPipeline.instance) {
      DataIngestionPipeline.instance = new DataIngestionPipeline(config);
    }
    return DataIngestionPipeline.instance;
  }

  /**
   * Ingest data for a specific location
   */
  async ingestForLocation(params: AggregationParams): Promise<IngestionResult> {
    const jobId = this.generateJobId(params);
    const startTime = Date.now();
    const locationName = params.location || `${params.latitude}, ${params.longitude}`;

    console.log(`\n📋 [DataIngestionPipeline] ======== STARTING INGESTION JOB ========`);
    console.log(`🏷️  [DataIngestionPipeline] Job ID: ${jobId}`);
    console.log(`🗺️  [DataIngestionPipeline] Location: ${locationName}`);
    console.log(`📏 [DataIngestionPipeline] Radius: ${params.radius || 5000}m`);
    console.log(`📊 [DataIngestionPipeline] Categories: ${params.categories?.join(', ') || 'all'}`);
    console.log(`⏱️  [DataIngestionPipeline] Start time: ${new Date().toISOString()}`);

    // Create job
    const job: IngestionJob = {
      id: jobId,
      params,
      status: 'running',
      startTime: new Date().toISOString(),
    };
    this.jobs.set(jobId, job);
    console.log(`📋 [DataIngestionPipeline] Job created and tracked`);

    try {
      // Step 1: Smart cascading aggregation (calls APIs one by one until sufficient data)
      console.log(`\n🔄 [DataIngestionPipeline] ======== STEP 1: SMART CASCADING AGGREGATION ========`);
      console.log(`🧠 [DataIngestionPipeline] Using intelligent API cascading to minimize resource usage...`);
      
      const aggregationResult = await cascadingDataAggregator.aggregateWithCascading(params);
      
      console.log(`📊 [DataIngestionPipeline] Aggregation results:`);
      console.log(`   📈 Total found: ${aggregationResult.totalFound}`);
      console.log(`   ✅ After deduplication: ${aggregationResult.places.length}`);
      console.log(`   🚮 Duplicates removed: ${aggregationResult.duplicatesRemoved}`);
      console.log(`   📊 Sources used: [${aggregationResult.sources.join(', ')}]`);
      console.log(`   ⏱️  Aggregation time: ${aggregationResult.processingTime}ms`);

      if (aggregationResult.places.length === 0) {
        console.warn(`\n⚠️  [DataIngestionPipeline] No places found after aggregation`);
        console.warn(`🔍 [DataIngestionPipeline] Possible reasons:`);
        console.warn(`   1. No data available for this location`);
        console.warn(`   2. All data was filtered out as duplicates`);
        console.warn(`   3. API sources returned no results`);
        console.warn(`   4. Network connectivity issues`);
        
        const result: IngestionResult = {
          aggregationResult,
          storageResult: {
            stored: 0,
            updated: 0,
            errors: 0,
            duplicatesSkipped: 0,
          },
          totalProcessingTime: Date.now() - startTime,
          success: true,
        };

        job.status = 'completed';
        job.endTime = new Date().toISOString();
        job.result = result;
        
        console.log(`🏁 [DataIngestionPipeline] Job completed (no data to store)`);
        return result;
      }

      console.log(`✅ [DataIngestionPipeline] Step 1 complete - ready to store ${aggregationResult.places.length} places`);

      // Step 2: Store in Qdrant
      console.log(`\n💾 [DataIngestionPipeline] ======== STEP 2: QDRANT STORAGE ========`);
      console.log(`📄 [DataIngestionPipeline] Preparing to store ${aggregationResult.places.length} places in Qdrant Cloud`);
      
      // Log sample of places to be stored
      console.log(`📋 [DataIngestionPipeline] Sample places to store:`);
      aggregationResult.places.slice(0, 5).forEach((place, index) => {
        console.log(`   ${index + 1}. ${place.name} (${place.source}) - ${place.category}`);
      });
      
      const storageResult = await qdrantStorage.storePlaces(aggregationResult.places);
      
      console.log(`📊 [DataIngestionPipeline] Storage results:`);
      console.log(`   ➕ New places stored: ${storageResult.stored}`);
      console.log(`   🔄 Existing places updated: ${storageResult.updated}`);
      console.log(`   ⏭️  Duplicates skipped: ${storageResult.duplicatesSkipped}`);
      console.log(`   ❌ Errors encountered: ${storageResult.errors}`);
      
      const successRate = Math.round(((storageResult.stored + storageResult.updated) / aggregationResult.places.length) * 100);
      console.log(`   📈 Storage success rate: ${successRate}%`);

      // Step 3: Optimize collection if needed
      if (this.config.enableOptimization && storageResult.stored > 1000) {
        console.log(`\n🚀 [DataIngestionPipeline] ======== STEP 3: COLLECTION OPTIMIZATION ========`);
        console.log(`📈 [DataIngestionPipeline] Large batch detected (${storageResult.stored} new places), optimizing collection...`);
        
        try {
          const optimizationStart = Date.now();
          await qdrantStorage.optimizeCollection();
          const optimizationTime = Date.now() - optimizationStart;
          console.log(`✅ [DataIngestionPipeline] Collection optimization completed in ${optimizationTime}ms`);
        } catch (error) {
          console.warn(`⚠️  [DataIngestionPipeline] Collection optimization failed:`, error);
        }
      } else if (this.config.enableOptimization) {
        console.log(`📊 [DataIngestionPipeline] Optimization skipped (${storageResult.stored} new places < 1000 threshold)`);
      }

      const totalProcessingTime = Date.now() - startTime;

      const result: IngestionResult = {
        aggregationResult,
        storageResult,
        totalProcessingTime,
        success: true,
      };

      // Update job
      job.status = 'completed';
      job.endTime = new Date().toISOString();
      job.result = result;

      console.log(`\n🎉 [DataIngestionPipeline] ======== INGESTION COMPLETED SUCCESSFULLY ========`);
      console.log(`⏱️  [DataIngestionPipeline] Total time: ${totalProcessingTime}ms`);
      console.log(`📋 [DataIngestionPipeline] Final summary:`);
      console.log(`   🎯 Job ID: ${jobId}`);
      console.log(`   🗺️  Location: ${locationName}`);
      console.log(`   🔍 APIs queried: ${aggregationResult.sources.length}`);
      console.log(`   📈 Total places found: ${aggregationResult.totalFound}`);
      console.log(`   ✅ Places stored/updated: ${storageResult.stored + storageResult.updated}`);
      console.log(`   🏆 Success rate: ${Math.round(((storageResult.stored + storageResult.updated) / aggregationResult.totalFound) * 100)}%`);
      console.log(`🔗 [DataIngestionPipeline] Data successfully ingested to Qdrant Cloud!\n`);

      return result;

    } catch (error: any) {
      const totalProcessingTime = Date.now() - startTime;
      
      console.error(`\n💥 [DataIngestionPipeline] ======== INGESTION FAILED ========`);
      console.error(`❌ [DataIngestionPipeline] Job ID: ${jobId}`);
      console.error(`🗺️  [DataIngestionPipeline] Location: ${locationName}`);
      console.error(`⏱️  [DataIngestionPipeline] Failed after: ${totalProcessingTime}ms`);
      console.error(`💥 [DataIngestionPipeline] Error details:`, error);
      console.error(`🔧 [DataIngestionPipeline] Troubleshooting tips:`);
      console.error(`   1. Check internet connectivity`);
      console.error(`   2. Verify API keys are valid`);
      console.error(`   3. Confirm Qdrant Cloud is accessible`);
      console.error(`   4. Check location name/coordinates are valid`);

      // Update job with error
      job.status = 'failed';
      job.endTime = new Date().toISOString();
      job.error = error.message;

      const result: IngestionResult = {
        aggregationResult: {
          places: [],
          sources: [],
          totalFound: 0,
          duplicatesRemoved: 0,
          processingTime: 0,
        },
        storageResult: {
          stored: 0,
          updated: 0,
          errors: 1,
          duplicatesSkipped: 0,
        },
        totalProcessingTime,
        success: false,
      };

      job.result = result;
      console.error(`📋 [DataIngestionPipeline] Job ${jobId} marked as failed\n`);
      
      return result;
    }
  }

  /**
   * Bulk ingest data for multiple locations
   */
  async bulkIngest(locations: AggregationParams[]): Promise<IngestionResult[]> {
    console.log(`[DataIngestionPipeline] Starting bulk ingestion for ${locations.length} locations`);
    const results: IngestionResult[] = [];

    // Process locations in batches to avoid overwhelming APIs
    const batchSize = this.config.batchSize;
    for (let i = 0; i < locations.length; i += batchSize) {
      const batch = locations.slice(i, i + batchSize);
      
      console.log(`[DataIngestionPipeline] Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(locations.length/batchSize)}`);
      
      const batchPromises = batch.map(location => 
        this.ingestWithRetry(location)
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`[DataIngestionPipeline] Location ${i + index} failed:`, result.reason);
          results.push({
            aggregationResult: {
              places: [],
              sources: [],
              totalFound: 0,
              duplicatesRemoved: 0,
              processingTime: 0,
            },
            storageResult: {
              stored: 0,
              updated: 0,
              errors: 1,
              duplicatesSkipped: 0,
            },
            totalProcessingTime: 0,
            success: false,
          });
        }
      });

      // Small delay between batches
      if (i + batchSize < locations.length) {
        await this.delay(1000);
      }
    }

    const totalStored = results.reduce((sum, r) => sum + r.storageResult.stored, 0);
    const totalUpdated = results.reduce((sum, r) => sum + r.storageResult.updated, 0);
    const successCount = results.filter(r => r.success).length;

    console.log(`[DataIngestionPipeline] ✅ Bulk ingestion completed:`, {
      totalLocations: locations.length,
      successful: successCount,
      failed: locations.length - successCount,
      totalStored,
      totalUpdated,
    });

    return results;
  }

  /**
   * Ingest with retry mechanism
   */
  private async ingestWithRetry(params: AggregationParams): Promise<IngestionResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this.ingestForLocation(params);
      } catch (error: any) {
        lastError = error;
        console.warn(`[DataIngestionPipeline] Attempt ${attempt}/${this.config.maxRetries} failed:`, error.message);
        
        if (attempt < this.config.maxRetries) {
          await this.delay(this.config.retryDelay * attempt); // Exponential backoff
        }
      }
    }

    throw lastError || new Error('Maximum retries exceeded');
  }

  /**
   * Search the unified database
   */
  async searchUnified(params: SearchParams) {
    console.log('[DataIngestionPipeline] Searching unified database:', params);
    return await qdrantStorage.searchPlaces(params);
  }

  /**
   * Smart search that falls back to API aggregation if no results found
   */
  async smartSearch(params: SearchParams & AggregationParams) {
    const startTime = Date.now();
    const searchTerm = params.query || params.location || 'location-based search';
    
    console.log(`\n🧠 [DataIngestionPipeline] ======== STARTING SMART SEARCH ========`);
    console.log(`🔍 [DataIngestionPipeline] Query: "${searchTerm}"`);
    console.log(`🗺️  [DataIngestionPipeline] Location: ${params.location || `${params.latitude}, ${params.longitude}`}`);
    console.log(`📊 [DataIngestionPipeline] Expected results: ${params.limit || 10}`);
    console.log(`🔄 [DataIngestionPipeline] Will use API fallback if needed`);

    // First, search the unified database
    console.log(`\n📍 [DataIngestionPipeline] Phase 1: Searching unified Qdrant database...`);
    const unifiedResults = await this.searchUnified(params);
    
    console.log(`📈 [DataIngestionPipeline] Unified search results:`);
    console.log(`   📊 Found: ${unifiedResults.places.length} places`);
    console.log(`   📊 Sources: [${unifiedResults.sources.join(', ')}]`);
    console.log(`   ⏱️  Search time: ${unifiedResults.searchTime}ms`);

    const threshold = (params.limit || 10) * 0.5;
    console.log(`🎯 [DataIngestionPipeline] Quality threshold: ${threshold} results (50% of limit)`);

    // If we have good results, return them
    if (unifiedResults.places.length >= threshold) {
      const totalTime = Date.now() - startTime;
      console.log(`\n✅ [DataIngestionPipeline] ======== SMART SEARCH SUCCESSFUL (CACHED) ========`);
      console.log(`🏆 [DataIngestionPipeline] Results: ${unifiedResults.places.length} places from cache`);
      console.log(`⚡ [DataIngestionPipeline] Total time: ${totalTime}ms (fast cache hit!)`);
      console.log(`💾 [DataIngestionPipeline] Data source: Unified Qdrant database`);
      console.log(`🔗 [DataIngestionPipeline] No API calls needed - excellent performance!\n`);
      return unifiedResults;
    }

    // If results are insufficient, aggregate from APIs and store
    console.log(`\n⚠️  [DataIngestionPipeline] Insufficient results (${unifiedResults.places.length} < ${threshold})`);
    console.log(`🔄 [DataIngestionPipeline] Phase 2: Falling back to API aggregation...`);
    console.log(`🎯 [DataIngestionPipeline] Target: Find and store new data for future searches`);
    
    const ingestionResult = await this.ingestForLocation(params);
    
    console.log(`📊 [DataIngestionPipeline] Ingestion results:`);
    console.log(`   ✅ Success: ${ingestionResult.success}`);
    console.log(`   📈 New data found: ${ingestionResult.aggregationResult.totalFound}`);
    console.log(`   💾 Stored in Qdrant: ${ingestionResult.storageResult.stored + ingestionResult.storageResult.updated}`);
    console.log(`   ⏱️  Ingestion time: ${ingestionResult.totalProcessingTime}ms`);
    
    if (ingestionResult.success && ingestionResult.aggregationResult.places.length > 0) {
      // Search again after ingestion
      console.log(`\n🔍 [DataIngestionPipeline] Phase 3: Re-searching with newly ingested data...`);
      const newResults = await this.searchUnified(params);
      
      const totalTime = Date.now() - startTime;
      console.log(`\n🎆 [DataIngestionPipeline] ======== SMART SEARCH SUCCESSFUL (FALLBACK) ========`);
      console.log(`🏆 [DataIngestionPipeline] Final results: ${newResults.places.length} places`);
      console.log(`📈 [DataIngestionPipeline] Improvement: +${newResults.places.length - unifiedResults.places.length} places`);
      console.log(`⏱️  [DataIngestionPipeline] Total time: ${totalTime}ms (including API calls)`);
      console.log(`💾 [DataIngestionPipeline] Data source: APIs + Qdrant storage`);
      console.log(`🔮 [DataIngestionPipeline] Future searches will be faster!\n`);
      
      return newResults;
    } else {
      console.log(`\n⚠️  [DataIngestionPipeline] API fallback unsuccessful`);
      console.log(`🔍 [DataIngestionPipeline] Possible reasons:`);
      console.log(`   1. No additional data available from APIs`);
      console.log(`   2. API connectivity issues`);
      console.log(`   3. Location not covered by our data sources`);
      console.log(`   4. All API data was already in our database`);
    }

    // Return what we found initially
    const totalTime = Date.now() - startTime;
    console.log(`\n🏁 [DataIngestionPipeline] ======== SMART SEARCH COMPLETED ========`);
    console.log(`📈 [DataIngestionPipeline] Final results: ${unifiedResults.places.length} places`);
    console.log(`⏱️  [DataIngestionPipeline] Total time: ${totalTime}ms`);
    console.log(`💾 [DataIngestionPipeline] Data source: Qdrant database only`);
    console.log(`💡 [DataIngestionPipeline] Tip: Try broader search terms or expand radius\n`);
    
    return unifiedResults;
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): IngestionJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): IngestionJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Clear completed jobs older than specified hours
   */
  cleanupJobs(olderThanHours: number = 24): number {
    const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
    let cleaned = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if ((job.status === 'completed' || job.status === 'failed') && 
          job.endTime && new Date(job.endTime).getTime() < cutoffTime) {
        this.jobs.delete(jobId);
        cleaned++;
      }
    }

    console.log(`[DataIngestionPipeline] Cleaned up ${cleaned} old jobs`);
    return cleaned;
  }

  /**
   * Get pipeline statistics
   */
  async getStats() {
    const storageStats = await qdrantStorage.getStats();
    const jobs = this.getAllJobs();
    
    return {
      storage: storageStats,
      jobs: {
        total: jobs.length,
        pending: jobs.filter(j => j.status === 'pending').length,
        running: jobs.filter(j => j.status === 'running').length,
        completed: jobs.filter(j => j.status === 'completed').length,
        failed: jobs.filter(j => j.status === 'failed').length,
      },
      config: this.config,
    };
  }

  /**
   * Health check for the entire pipeline
   */
  async healthCheck() {
    const storageHealth = await qdrantStorage.healthCheck();
    
    return {
      pipeline: {
        healthy: !this.isRunning || this.jobs.size < 100, // Prevent memory issues
        activeJobs: this.jobs.size,
        runningJobs: Array.from(this.jobs.values()).filter(j => j.status === 'running').length,
      },
      storage: storageHealth,
      overall: storageHealth.healthy && (!this.isRunning || this.jobs.size < 100),
    };
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(params: AggregationParams): string {
    const location = params.location || `${params.latitude},${params.longitude}`;
    const timestamp = Date.now();
    const hash = this.simpleHash(JSON.stringify(params));
    return `job-${location.replace(/[^a-z0-9]/gi, '-')}-${hash}-${timestamp}`;
  }

  /**
   * Simple hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const dataIngestionPipeline = DataIngestionPipeline.getInstance();

// Example usage functions
export async function ingestDataForCity(
  cityName: string, 
  latitude: number, 
  longitude: number, 
  radius: number = 10000
): Promise<IngestionResult> {
  return dataIngestionPipeline.ingestForLocation({
    location: cityName,
    latitude,
    longitude,
    radius,
  });
}

export async function searchPlacesUnified(
  query: string,
  latitude?: number,
  longitude?: number,
  radiusMeters?: number,
  categories?: string[],
  limit?: number
) {
  return dataIngestionPipeline.smartSearch({
    query,
    latitude,
    longitude,
    radiusMeters,
    categories,
    limit,
    // Include aggregation params for fallback
    location: query,
    radius: radiusMeters,
  });
}