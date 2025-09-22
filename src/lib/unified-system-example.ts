/**
 * Unified Data System - Usage Examples and Integration Guide
 * 
 * This file demonstrates how to use the new unified data system that:
 * - Aggregates data from multiple APIs (RapidAPI, GeoAPI, OSM, OpenTripMap)
 * - Stores data in Qdrant Cloud with 384-dimensional vectors
 * - Provides deduplication and centralized search
 */

import { 
  unifiedSearchService, 
  searchPlacesUnified, 
  exploreLocationUnified 
} from './unified-search-service';
import { 
  dataIngestionPipeline, 
  ingestDataForCity 
} from './data-ingestion-pipeline';
import { 
  dataManagementUtils, 
  quickHealthCheck, 
  getSystemOverview 
} from './data-management-utils';
import { qdrantStorage } from './qdrant-storage';
import { 
  trackDataIngestion, 
  trackSearch, 
  logDataBeingAdded, 
  logStorageResults,
  logSearchResults,
  endTracking,
  showSystemStatus,
  quickTrackIngestion,
  quickTrackSearch 
} from './console-tracker';

// Example 1: Basic Usage - Replace your existing API calls
export async function basicSearchExample() {
  console.log('=== Basic Search Example ===');
  
  // Instead of calling individual APIs, use the unified search
  const results = await searchPlacesUnified(
    'tourist attractions in Paris',
    48.8566, // latitude
    2.3522,  // longitude
    10000,   // radius in meters
    ['attraction'], // categories
    20       // limit
  );

  console.log(`Found ${results.places.length} places:`);
  results.places.forEach(place => {
    console.log(`- ${place.name} (${place.source})`);
  });

  return results;
}

// Example 2: Comprehensive Location Exploration
export async function exploreLocationExample() {
  console.log('=== Explore Location Example ===');
  
  // Get places, hotels, and restaurants for a location
  const exploration = await exploreLocationUnified(
    'London',
    51.5074, // latitude
    -0.1278, // longitude
    15000    // radius
  );

  console.log('Exploration Results:');
  console.log(`- Places: ${exploration.places.length}`);
  console.log(`- Hotels: ${exploration.hotels.length}`);
  console.log(`- Restaurants: ${exploration.restaurants.length}`);

  return exploration;
}

// Example 3: Smart Search with Fallback
export async function smartSearchExample() {
  console.log('=== Smart Search Example ===');
  
  // This will first search the unified database, then fall back to APIs if needed
  const result = await unifiedSearchService.search({
    query: 'romantic restaurants',
    latitude: 40.7128,
    longitude: -74.0060,
    radius: 5000,
    categories: ['restaurant'],
    sortBy: 'rating',
    minRating: 4.0,
    limit: 15,
    fallbackToAPI: true, // Enable API fallback
  });

  console.log(`Smart search results: ${result.places.length} places`);
  console.log(`From cache: ${result.fromCache}`);
  console.log(`Used fallback: ${result.fallbackUsed}`);

  if (result.suggestion) {
    console.log(`Suggestion: ${result.suggestion}`);
  }

  return result;
}

// Example 4: Data Ingestion for New Location
export async function ingestNewLocationExample() {
  console.log('=== Data Ingestion Example ===');
  
  // Ingest data for a new city
  const ingestionResult = await ingestDataForCity(
    'Barcelona',
    41.3851,
    2.1734,
    12000 // 12km radius
  );

  console.log('Ingestion Results:');
  console.log(`- Total found: ${ingestionResult.aggregationResult.totalFound}`);
  console.log(`- Stored: ${ingestionResult.storageResult.stored}`);
  console.log(`- Updated: ${ingestionResult.storageResult.updated}`);
  console.log(`- Duplicates skipped: ${ingestionResult.storageResult.duplicatesSkipped}`);
  console.log(`- Processing time: ${ingestionResult.totalProcessingTime}ms`);

  return ingestionResult;
}

// Example 5: Semantic Search
export async function semanticSearchExample() {
  console.log('=== Semantic Search Example ===');
  
  // Find places using natural language understanding
  const places = await unifiedSearchService.semanticSearch(
    'quiet places for meditation and reflection',
    10,
    ['nature', 'attraction']
  );

  console.log(`Semantic search found ${places.length} places:`);
  places.forEach(place => {
    console.log(`- ${place.name}: ${place.description?.substring(0, 100)}...`);
  });

  return places;
}

// Example 6: Get Recommendations
export async function recommendationsExample() {
  console.log('=== Recommendations Example ===');
  
  // First, find a place to base recommendations on
  const searchResult = await unifiedSearchService.search({
    query: 'Eiffel Tower',
    latitude: 48.8566,
    longitude: 2.3522,
    radius: 1000,
    limit: 1,
  });

  if (searchResult.places.length > 0) {
    const placeId = searchResult.places[0].id;
    
    // Get similar places
    const recommendations = await unifiedSearchService.getRecommendations(
      placeId,
      5 // limit
    );

    console.log(`Recommendations based on ${searchResult.places[0].name}:`);
    recommendations.forEach(place => {
      console.log(`- ${place.name} (${place.category})`);
    });

    return recommendations;
  }

  return [];
}

// Example 7: System Health and Monitoring
export async function systemMonitoringExample() {
  console.log('=== System Monitoring Example ===');
  
  // Quick health check
  const health = await quickHealthCheck();
  console.log(`System health: ${health}`);

  // Detailed system overview
  const overview = await getSystemOverview();
  console.log('System Overview:');
  console.log(`- Total places: ${overview.dashboard.overview.totalPlaces}`);
  console.log(`- Data sources: ${overview.dashboard.overview.totalSources}`);
  console.log(`- Categories: ${overview.dashboard.overview.totalCategories}`);
  console.log(`- Average rating: ${overview.dashboard.overview.averageRating}`);
  console.log(`- Cache hit rate: ${overview.dashboard.recent.cacheHitRate}%`);

  return overview;
}

// Example 8: Data Quality Analysis
export async function dataQualityExample() {
  console.log('=== Data Quality Example ===');
  
  const qualityReport = await dataManagementUtils.generateDataQualityReport();
  
  console.log('Data Quality Report:');
  console.log(`- Total records analyzed: ${qualityReport.totalRecords}`);
  console.log(`- Records with images: ${qualityReport.recordsWithImages} (${Math.round(qualityReport.recordsWithImages / qualityReport.totalRecords * 100)}%)`);
  console.log(`- Records with ratings: ${qualityReport.recordsWithRatings} (${Math.round(qualityReport.recordsWithRatings / qualityReport.totalRecords * 100)}%)`);
  console.log(`- Overall quality score: ${qualityReport.qualityScore}/100`);
  
  console.log('Source breakdown:');
  Object.entries(qualityReport.sourceBreakdown).forEach(([source, count]) => {
    console.log(`  - ${source}: ${count} places`);
  });

  return qualityReport;
}

// Example 9: Bulk Data Processing
export async function bulkProcessingExample() {
  console.log('=== Bulk Processing Example ===');
  
  // Ingest data for multiple popular cities
  const cities = [
    { location: 'Rome', latitude: 41.9028, longitude: 12.4964, radius: 10000 },
    { location: 'Amsterdam', latitude: 52.3676, longitude: 4.9041, radius: 8000 },
    { location: 'Bangkok', latitude: 13.7563, longitude: 100.5018, radius: 12000 },
  ];

  const bulkResults = await dataIngestionPipeline.bulkIngest(cities);
  
  console.log('Bulk Processing Results:');
  bulkResults.forEach((result, index) => {
    const city = cities[index];
    console.log(`${city.location}:`);
    console.log(`  - Success: ${result.success}`);
    console.log(`  - Stored: ${result.storageResult.stored}`);
    console.log(`  - Time: ${result.totalProcessingTime}ms`);
  });

  const totalStored = bulkResults.reduce((sum, r) => sum + r.storageResult.stored, 0);
  console.log(`Total places stored: ${totalStored}`);

  return bulkResults;
}

// Example 10: Advanced Filtering and Search
export async function advancedSearchExample() {
  console.log('=== Advanced Search Example ===');
  
  // Complex search with multiple filters
  const result = await unifiedSearchService.search({
    query: 'family friendly activities',
    latitude: 34.0522,
    longitude: -118.2437, // Los Angeles
    radius: 20000,
    categories: ['attraction', 'entertainment'],
    sources: ['geoapify', 'opentripmap'], // Only from specific sources
    minRating: 3.5,
    sortBy: 'rating',
    limit: 25,
  });

  console.log(`Advanced search results: ${result.places.length} places`);
  console.log(`Sources used: ${result.sources.join(', ')}`);
  console.log(`Search time: ${result.searchTime}ms`);

  // Show top 3 results
  console.log('Top results:');
  result.places.slice(0, 3).forEach((place, index) => {
    console.log(`${index + 1}. ${place.name}`);
    console.log(`   Rating: ${place.rating || 'N/A'}`);
    console.log(`   Category: ${place.category}`);
    console.log(`   Source: ${place.source}`);
  });

  return result;
}

// Example 11: System Maintenance
export async function maintenanceExample() {
  console.log('=== Maintenance Example ===');
  
  // Perform system maintenance
  const report = await dataManagementUtils.performMaintenance();
  
  console.log('Maintenance Report:');
  console.log(`- Timestamp: ${report.timestamp}`);
  console.log(`- Optimization performed: ${report.optimizationPerformed}`);
  console.log(`- Success: ${report.success}`);
  
  if (report.errors.length > 0) {
    console.log('Errors encountered:');
    report.errors.forEach(error => console.log(`  - ${error}`));
  }

  return report;
}

// Example 12: Data Export
export async function dataExportExample() {
  console.log('=== Data Export Example ===');
  
  // Export data for backup (JSON format)
  const jsonExport = await dataManagementUtils.exportData('json', 100);
  console.log(`Exported ${jsonExport.count} places in JSON format`);
  console.log(`Data size: ${jsonExport.data.length} characters`);

  // Export data in CSV format
  const csvExport = await dataManagementUtils.exportData('csv', 100);
  console.log(`Exported ${csvExport.count} places in CSV format`);
  console.log(`Data size: ${csvExport.data.length} characters`);

  return { json: jsonExport, csv: csvExport };
}

// Integration Example: Replace existing explore flow
export async function replaceExistingExploreFlow(
  destination: string,
  latitude?: number,
  longitude?: number
) {
  console.log('=== Integration: Replace Existing Explore Flow ===');
  
  // Before: Multiple API calls to different services
  // Now: Single unified call
  
  try {
    const result = await unifiedSearchService.exploreLocation(
      destination,
      latitude,
      longitude,
      15000 // 15km radius
    );

    // Format for existing UI components
    const formattedResult = {
      places: result.places,
      hotels: result.hotels,
      restaurants: result.restaurants,
      // Add metadata for debugging/monitoring
      metadata: {
        fromUnifiedSystem: true,
        totalResults: result.places.length + result.hotels.length + result.restaurants.length,
        sources: [...new Set([
          ...result.places.map(p => p.itemType || 'place'),
          ...result.hotels.map(h => h.itemType || 'hotel'),
          ...result.restaurants.map(r => r.itemType || 'restaurant')
        ])],
      }
    };

    console.log(`✅ Unified exploration completed:`);
    console.log(`   Places: ${result.places.length}`);
    console.log(`   Hotels: ${result.hotels.length}`);
    console.log(`   Restaurants: ${result.restaurants.length}`);

    return formattedResult;

  } catch (error) {
    console.error('❌ Unified exploration failed, falling back to individual APIs');
    // Fallback to existing implementation if needed
    throw error;
  }
}

// Example 13: Console Tracking Demo
export async function consoleTrackingExample() {
  console.log('=== Console Tracking Example ===');
  
  // Show system status
  showSystemStatus();
  
  // Example 1: Track a simple search with detailed logging
  const searchSessionId = trackSearch('restaurants in Tokyo', 15);
  
  try {
    // Simulate search with tracking
    const results = await searchPlacesUnified(
      'restaurants in Tokyo',
      35.6762, // Tokyo coordinates
      139.6503,
      5000,
      ['restaurant'],
      15
    );
    
    // Log the search results
    logSearchResults(
      searchSessionId, 
      results.places.length, 
      results.sources, 
      results.searchTime,
      results.fromCache
    );
    
    endTracking(searchSessionId, true, 'Tokyo restaurant search completed successfully!');
    
  } catch (error: any) {
    endTracking(searchSessionId, false, `Search failed: ${error.message}`);
  }
  
  // Example 2: Track data ingestion with detailed logging
  const ingestionSessionId = trackDataIngestion('Barcelona, Spain');
  
  try {
    const ingestionResult = await ingestDataForCity(
      'Barcelona',
      41.3851,
      2.1734,
      10000
    );
    
    // Log what data was added
    if (ingestionResult.aggregationResult.places.length > 0) {
      const samplePlaces = ingestionResult.aggregationResult.places.slice(0, 10).map(place => ({
        name: place.name,
        source: place.source,
        category: place.category
      }));
      
      logDataBeingAdded(ingestionSessionId, samplePlaces, 384, 'unified_places');
    }
    
    // Log storage results
    logStorageResults(ingestionSessionId, {
      stored: ingestionResult.storageResult.stored,
      updated: ingestionResult.storageResult.updated,
      duplicatesSkipped: ingestionResult.storageResult.duplicatesSkipped,
      errors: ingestionResult.storageResult.errors,
      processingTime: ingestionResult.totalProcessingTime
    });
    
    endTracking(ingestionSessionId, true, 'Barcelona data ingestion successful!');
    
  } catch (error: any) {
    endTracking(ingestionSessionId, false, `Ingestion failed: ${error.message}`);
  }
  
  // Example 3: Using quick tracking helpers
  const quickSearch = quickTrackSearch('cafes in Paris', async (sessionId) => {
    const results = await searchPlacesUnified(
      'cafes in Paris',
      48.8566,
      2.3522,
      3000,
      ['restaurant'],
      10
    );
    
    // The tracking is handled automatically by quickTrackSearch
    return results;
  });
  
  const quickIngestion = quickTrackIngestion('Rome, Italy', async (sessionId) => {
    await ingestDataForCity('Rome', 41.9028, 12.4964, 8000);
    // The tracking is handled automatically by quickTrackIngestion
  });
  
  // Execute the quick operations
  await quickSearch();
  await quickIngestion();
  
  // Final system status
  showSystemStatus();
  
  console.log('\n🎉 Console tracking examples completed!');
  console.log('You can now see exactly what data is being added to Qdrant!');
}

// Demo function to showcase the complete system
export async function completeSystemDemo() {
  console.log('\n🚀 UNIFIED DATA SYSTEM DEMO 🚀\n');
  
  try {
    // 1. System health check
    await systemMonitoringExample();
    console.log('\n' + '='.repeat(50) + '\n');

    // 2. Basic search
    await basicSearchExample();
    console.log('\n' + '='.repeat(50) + '\n');

    // 3. Smart search with fallback
    await smartSearchExample();
    console.log('\n' + '='.repeat(50) + '\n');

    // 4. Data ingestion
    await ingestNewLocationExample();
    console.log('\n' + '='.repeat(50) + '\n');

    // 5. Data quality analysis
    await dataQualityExample();
    console.log('\n' + '='.repeat(50) + '\n');

    // 6. Console tracking demonstration
    await consoleTrackingExample();
    console.log('\n' + '='.repeat(50) + '\n');

    console.log('✅ Demo completed successfully!');
    console.log('\nYour unified data system is ready to use!');
    console.log('\nKey benefits:');
    console.log('- ✅ Deduplicated data from multiple sources');
    console.log('- ✅ Fast vector-based search with 384-dimensional embeddings');
    console.log('- ✅ Automatic fallback to APIs when needed');
    console.log('- ✅ Comprehensive monitoring and maintenance tools');
    console.log('- ✅ Smart caching and performance optimization');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Environment setup check
export async function checkEnvironmentSetup(): Promise<{
  ready: boolean;
  missing: string[];
  recommendations: string[];
}> {
  const missing: string[] = [];
  const recommendations: string[] = [];

  // Check required environment variables
  if (!process.env.QDRANT_URL) {
    missing.push('QDRANT_URL');
  }
  if (!process.env.QDRANT_API_KEY) {
    missing.push('QDRANT_API_KEY');
  }
  if (!process.env.OPENAI_API_KEY) {
    missing.push('OPENAI_API_KEY');
  }

  // Optional but recommended
  if (!process.env.GEOAPIFY_KEY) {
    recommendations.push('Set GEOAPIFY_KEY for better geocoding results');
  }
  if (!process.env.RAPIDAPI_KEY) {
    recommendations.push('Set RAPIDAPI_KEY for additional data sources');
  }
  if (!process.env.OPENTRIPMAP_API_KEY) {
    recommendations.push('Set OPENTRIPMAP_API_KEY for tourism data');
  }

  const ready = missing.length === 0;

  if (!ready) {
    console.log('❌ Environment setup incomplete');
    console.log('Missing required environment variables:');
    missing.forEach(key => console.log(`  - ${key}`));
  }

  if (recommendations.length > 0) {
    console.log('💡 Recommendations:');
    recommendations.forEach(rec => console.log(`  - ${rec}`));
  }

  return { ready, missing, recommendations };
}