import { qdrantStorage, type StorageStats } from './qdrant-storage';
import { dataIngestionPipeline, type IngestionResult } from './data-ingestion-pipeline';
import { unifiedSearchService, type SearchAnalytics } from './unified-search-service';
import { dataAggregator } from './data-aggregator';

export interface DatabaseHealth {
  status: 'healthy' | 'warning' | 'critical';
  totalPlaces: number;
  collections: string[];
  lastUpdated: string;
  issues: string[];
  recommendations: string[];
}

export interface PerformanceMetrics {
  searchMetrics: SearchAnalytics;
  storageStats: StorageStats;
  ingestionStats: {
    totalJobs: number;
    successRate: number;
    averageTime: number;
  };
  cacheStats: {
    size: number;
    hitRate: number;
  };
}

export interface MaintenanceReport {
  timestamp: string;
  duplicatesRemoved: number;
  orphanedRecords: number;
  optimizationPerformed: boolean;
  errors: string[];
  success: boolean;
}

export interface DataQualityReport {
  totalRecords: number;
  recordsWithImages: number;
  recordsWithRatings: number;
  recordsWithDescriptions: number;
  averageRating: number;
  sourceBreakdown: Record<string, number>;
  categoryBreakdown: Record<string, number>;
  qualityScore: number; // 0-100
}

export class DataManagementUtils {
  private static instance: DataManagementUtils;
  
  private constructor() {}
  
  public static getInstance(): DataManagementUtils {
    if (!DataManagementUtils.instance) {
      DataManagementUtils.instance = new DataManagementUtils();
    }
    return DataManagementUtils.instance;
  }

  /**
   * Comprehensive health check of the entire system
   */
  async performHealthCheck(): Promise<DatabaseHealth> {
    console.log('[DataManagementUtils] Performing comprehensive health check');
    
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check storage health
      const storageHealth = await qdrantStorage.healthCheck();
      if (!storageHealth.healthy) {
        issues.push(`Qdrant storage unhealthy: ${storageHealth.error}`);
      }

      // Check ingestion pipeline health
      const pipelineHealth = await dataIngestionPipeline.healthCheck();
      if (!pipelineHealth.overall) {
        issues.push('Data ingestion pipeline has issues');
        if (pipelineHealth.pipeline.runningJobs > 10) {
          issues.push(`High number of running jobs: ${pipelineHealth.pipeline.runningJobs}`);
        }
      }

      // Get storage stats
      const stats = await qdrantStorage.getStats();
      
      if (stats.totalPlaces === 0) {
        issues.push('No places found in database');
        recommendations.push('Run initial data ingestion for popular locations');
      } else if (stats.totalPlaces < 1000) {
        recommendations.push('Consider expanding data coverage to more locations');
      }

      // Check for old data
      const daysSinceUpdate = stats.lastUpdated ? 
        (Date.now() - new Date(stats.lastUpdated).getTime()) / (1000 * 60 * 60 * 24) : 
        999;
      
      if (daysSinceUpdate > 7) {
        issues.push('Database has not been updated in over a week');
        recommendations.push('Schedule regular data ingestion jobs');
      }

      // Determine overall status
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (issues.length > 0) {
        status = issues.some(issue => 
          issue.includes('unhealthy') || 
          issue.includes('No places found')
        ) ? 'critical' : 'warning';
      }

      return {
        status,
        totalPlaces: stats.totalPlaces,
        collections: stats.collections,
        lastUpdated: stats.lastUpdated || new Date().toISOString(),
        issues,
        recommendations,
      };

    } catch (error: any) {
      return {
        status: 'critical',
        totalPlaces: 0,
        collections: [],
        lastUpdated: new Date().toISOString(),
        issues: [`Health check failed: ${error.message}`],
        recommendations: ['Check system configuration and connectivity'],
      };
    }
  }

  /**
   * Get comprehensive performance metrics
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    console.log('[DataManagementUtils] Collecting performance metrics');

    const [searchMetrics, storageStats, pipelineStats, cacheStats] = await Promise.all([
      unifiedSearchService.getAnalytics(),
      qdrantStorage.getStats(),
      dataIngestionPipeline.getStats(),
      unifiedSearchService.getCacheStats(),
    ]);

    return {
      searchMetrics,
      storageStats,
      ingestionStats: {
        totalJobs: pipelineStats.jobs.total,
        successRate: pipelineStats.jobs.total > 0 ? 
          pipelineStats.jobs.completed / pipelineStats.jobs.total : 0,
        averageTime: 0, // Would need to track this separately
      },
      cacheStats: {
        size: cacheStats.size,
        hitRate: cacheStats.hitRate,
      },
    };
  }

  /**
   * Perform routine maintenance
   */
  async performMaintenance(): Promise<MaintenanceReport> {
    const startTime = Date.now();
    console.log('[DataManagementUtils] Starting maintenance routine');

    const report: MaintenanceReport = {
      timestamp: new Date().toISOString(),
      duplicatesRemoved: 0,
      orphanedRecords: 0,
      optimizationPerformed: false,
      errors: [],
      success: false,
    };

    try {
      // Clear old cache entries
      unifiedSearchService.clearCache();
      
      // Clean up old ingestion jobs
      const cleanedJobs = dataIngestionPipeline.cleanupJobs(24);
      console.log(`[DataManagementUtils] Cleaned ${cleanedJobs} old jobs`);

      // Optimize Qdrant collection
      try {
        await qdrantStorage.optimizeCollection();
        report.optimizationPerformed = true;
        console.log('[DataManagementUtils] ✅ Collection optimization completed');
      } catch (error: any) {
        report.errors.push(`Optimization failed: ${error.message}`);
      }

      // TODO: Add duplicate detection and removal
      // This would require implementing a method to find and remove duplicates

      report.success = report.errors.length === 0;
      const duration = Date.now() - startTime;
      
      console.log(`[DataManagementUtils] ✅ Maintenance completed in ${duration}ms`);
      return report;

    } catch (error: any) {
      report.errors.push(`Maintenance failed: ${error.message}`);
      report.success = false;
      return report;
    }
  }

  /**
   * Generate data quality report
   */
  async generateDataQualityReport(): Promise<DataQualityReport> {
    console.log('[DataManagementUtils] Generating data quality report');

    try {
      // Get a sample of data to analyze
      const sampleResult = await qdrantStorage.searchPlaces({
        limit: 1000, // Analyze first 1000 records
      });

      const places = sampleResult.places;
      const totalRecords = places.length;

      if (totalRecords === 0) {
        return {
          totalRecords: 0,
          recordsWithImages: 0,
          recordsWithRatings: 0,
          recordsWithDescriptions: 0,
          averageRating: 0,
          sourceBreakdown: {},
          categoryBreakdown: {},
          qualityScore: 0,
        };
      }

      // Analyze data quality
      const recordsWithImages = places.filter(p => p.image).length;
      const recordsWithRatings = places.filter(p => p.rating).length;
      const recordsWithDescriptions = places.filter(p => p.description).length;
      
      const ratingsSum = places.reduce((sum, p) => sum + (p.rating || 0), 0);
      const averageRating = recordsWithRatings > 0 ? ratingsSum / recordsWithRatings : 0;

      // Source breakdown
      const sourceBreakdown: Record<string, number> = {};
      places.forEach(p => {
        sourceBreakdown[p.source] = (sourceBreakdown[p.source] || 0) + 1;
      });

      // Category breakdown
      const categoryBreakdown: Record<string, number> = {};
      places.forEach(p => {
        categoryBreakdown[p.category] = (categoryBreakdown[p.category] || 0) + 1;
      });

      // Calculate quality score (0-100)
      const imageScore = (recordsWithImages / totalRecords) * 25;
      const ratingScore = (recordsWithRatings / totalRecords) * 25;
      const descriptionScore = (recordsWithDescriptions / totalRecords) * 25;
      const diversityScore = Object.keys(sourceBreakdown).length > 1 ? 25 : 0;
      
      const qualityScore = Math.round(imageScore + ratingScore + descriptionScore + diversityScore);

      return {
        totalRecords,
        recordsWithImages,
        recordsWithRatings,
        recordsWithDescriptions,
        averageRating: Math.round(averageRating * 100) / 100,
        sourceBreakdown,
        categoryBreakdown,
        qualityScore,
      };

    } catch (error: any) {
      console.error('[DataManagementUtils] Data quality report failed:', error);
      throw error;
    }
  }

  /**
   * Bulk data ingestion for popular cities
   */
  async ingestPopularCities(): Promise<IngestionResult[]> {
    console.log('[DataManagementUtils] Starting bulk ingestion for popular cities');

    const popularCities = [
      { name: 'New York', lat: 40.7128, lon: -74.0060 },
      { name: 'London', lat: 51.5074, lon: -0.1278 },
      { name: 'Paris', lat: 48.8566, lon: 2.3522 },
      { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
      { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
      { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
      { name: 'Delhi', lat: 28.7041, lon: 77.1025 },
      { name: 'Bangalore', lat: 12.9716, lon: 77.5946 },
      { name: 'Dubai', lat: 25.2048, lon: 55.2708 },
      { name: 'Singapore', lat: 1.3521, lon: 103.8198 },
    ];

    const ingestionParams = popularCities.map(city => ({
      location: city.name,
      latitude: city.lat,
      longitude: city.lon,
      radius: 15000, // 15km radius
    }));

    return await dataIngestionPipeline.bulkIngest(ingestionParams);
  }

  /**
   * Export data for backup
   */
  async exportData(
    format: 'json' | 'csv' = 'json',
    limit?: number
  ): Promise<{ data: string; count: number }> {
    console.log(`[DataManagementUtils] Exporting data in ${format} format`);

    const result = await qdrantStorage.searchPlaces({
      limit: limit || 10000,
    });

    if (format === 'json') {
      return {
        data: JSON.stringify(result.places, null, 2),
        count: result.places.length,
      };
    } else {
      // CSV format
      const headers = [
        'id', 'name', 'description', 'category', 'address', 
        'latitude', 'longitude', 'rating', 'source', 'lastUpdated'
      ];
      
      const csvRows = [headers.join(',')];
      
      result.places.forEach(place => {
        const row = [
          place.id,
          `"${place.name}"`,
          `"${place.description || ''}"`,
          place.category,
          `"${place.address}"`,
          place.coordinates.latitude,
          place.coordinates.longitude,
          place.rating || '',
          place.source,
          place.lastUpdated,
        ];
        csvRows.push(row.join(','));
      });

      return {
        data: csvRows.join('\n'),
        count: result.places.length,
      };
    }
  }

  /**
   * Update embedding model (if changed)
   */
  async updateEmbeddings(batchSize: number = 100): Promise<{
    updated: number;
    errors: number;
    totalTime: number;
  }> {
    console.log('[DataManagementUtils] Updating embeddings');

    // This would be implemented if you change embedding models
    // For now, return a placeholder
    return {
      updated: 0,
      errors: 0,
      totalTime: 0,
    };
  }

  /**
   * Get database statistics dashboard
   */
  async getDashboardStats(): Promise<{
    overview: {
      totalPlaces: number;
      totalSources: number;
      totalCategories: number;
      averageRating: number;
    };
    recent: {
      searchesLast24h: number;
      ingestionsLast24h: number;
      cacheHitRate: number;
    };
    topCategories: Array<{ category: string; count: number }>;
    topSources: Array<{ source: string; count: number }>;
  }> {
    console.log('[DataManagementUtils] Generating dashboard statistics');

    const [qualityReport, performanceMetrics, storageStats] = await Promise.all([
      this.generateDataQualityReport(),
      this.getPerformanceMetrics(),
      qdrantStorage.getStats(),
    ]);

    const topCategories = Object.entries(qualityReport.categoryBreakdown)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topSources = Object.entries(qualityReport.sourceBreakdown)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      overview: {
        totalPlaces: storageStats.totalPlaces,
        totalSources: Object.keys(qualityReport.sourceBreakdown).length,
        totalCategories: Object.keys(qualityReport.categoryBreakdown).length,
        averageRating: qualityReport.averageRating,
      },
      recent: {
        searchesLast24h: performanceMetrics.searchMetrics.totalSearches,
        ingestionsLast24h: performanceMetrics.ingestionStats.totalJobs,
        cacheHitRate: performanceMetrics.cacheStats.hitRate,
      },
      topCategories,
      topSources,
    };
  }

  /**
   * Validate data integrity
   */
  async validateDataIntegrity(): Promise<{
    valid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    console.log('[DataManagementUtils] Validating data integrity');

    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Sample check for data integrity
      const sampleResult = await qdrantStorage.searchPlaces({ limit: 100 });
      const places = sampleResult.places;

      // Check for required fields
      const placesWithoutNames = places.filter(p => !p.name || p.name.trim() === '');
      const placesWithoutCoords = places.filter(p => !p.coordinates.latitude || !p.coordinates.longitude);
      const placesWithInvalidRatings = places.filter(p => p.rating && (p.rating < 0 || p.rating > 5));

      if (placesWithoutNames.length > 0) {
        issues.push(`${placesWithoutNames.length} places found without names`);
        recommendations.push('Clean up places with missing names');
      }

      if (placesWithoutCoords.length > 0) {
        issues.push(`${placesWithoutCoords.length} places found without coordinates`);
        recommendations.push('Remove or fix places with invalid coordinates');
      }

      if (placesWithInvalidRatings.length > 0) {
        issues.push(`${placesWithInvalidRatings.length} places found with invalid ratings`);
        recommendations.push('Validate and correct rating values');
      }

      return {
        valid: issues.length === 0,
        issues,
        recommendations,
      };

    } catch (error: any) {
      return {
        valid: false,
        issues: [`Data integrity check failed: ${error.message}`],
        recommendations: ['Check database connectivity and data structure'],
      };
    }
  }
}

// Export singleton instance
export const dataManagementUtils = DataManagementUtils.getInstance();

// Utility functions for common operations
export async function quickHealthCheck(): Promise<'healthy' | 'warning' | 'critical'> {
  const health = await dataManagementUtils.performHealthCheck();
  return health.status;
}

export async function getSystemOverview() {
  const [health, performance, dashboard] = await Promise.all([
    dataManagementUtils.performHealthCheck(),
    dataManagementUtils.getPerformanceMetrics(),
    dataManagementUtils.getDashboardStats(),
  ]);

  return {
    health,
    performance,
    dashboard,
  };
}

export async function performQuickMaintenance(): Promise<boolean> {
  const report = await dataManagementUtils.performMaintenance();
  return report.success;
}