/**
 * Console Tracker Utility
 * 
 * Easy-to-use functions for tracking Qdrant operations in the console
 */

export interface TrackingSession {
  id: string;
  operation: string;
  startTime: number;
  location?: string;
  expectedResults?: number;
}

class ConsoleTracker {
  private static instance: ConsoleTracker;
  private sessions: Map<string, TrackingSession> = new Map();
  private operationCount = 0;

  private constructor() {}

  public static getInstance(): ConsoleTracker {
    if (!ConsoleTracker.instance) {
      ConsoleTracker.instance = new ConsoleTracker();
    }
    return ConsoleTracker.instance;
  }

  /**
   * Start tracking an operation
   */
  startOperation(operation: string, details?: { location?: string; expectedResults?: number }): string {
    this.operationCount++;
    const sessionId = `op-${this.operationCount}-${Date.now()}`;
    
    const session: TrackingSession = {
      id: sessionId,
      operation,
      startTime: Date.now(),
      location: details?.location,
      expectedResults: details?.expectedResults,
    };
    
    this.sessions.set(sessionId, session);
    
    console.log(`\n🚀 [QdrantTracker] ======== STARTING OPERATION #${this.operationCount} ========`);
    console.log(`🏷️  [QdrantTracker] Operation: ${operation}`);
    console.log(`🆔 [QdrantTracker] Session ID: ${sessionId}`);
    if (details?.location) {
      console.log(`📍 [QdrantTracker] Location: ${details.location}`);
    }
    if (details?.expectedResults) {
      console.log(`🎯 [QdrantTracker] Expected results: ${details.expectedResults}`);
    }
    console.log(`⏰ [QdrantTracker] Started at: ${new Date().toLocaleTimeString()}`);
    
    return sessionId;
  }

  /**
   * Log data being added to Qdrant
   */
  logDataAdded(sessionId: string, data: {
    places: Array<{ name: string; source: string; category: string }>;
    embeddings: number;
    collection: string;
  }) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    console.log(`\n💾 [QdrantTracker] ======== ADDING DATA TO QDRANT ========`);
    console.log(`🗄️  [QdrantTracker] Collection: ${data.collection}`);
    console.log(`📊 [QdrantTracker] Places to add: ${data.places.length}`);
    console.log(`🧠 [QdrantTracker] Vector embeddings: ${data.embeddings} dimensions`);
    
    if (data.places.length > 0) {
      console.log(`📋 [QdrantTracker] Sample places being added:`);
      data.places.slice(0, 5).forEach((place, index) => {
        console.log(`   ${index + 1}. ${place.name} (${place.source}) - ${place.category}`);
      });
      
      if (data.places.length > 5) {
        console.log(`   ... and ${data.places.length - 5} more places`);
      }
    }
  }

  /**
   * Log successful data storage
   */
  logStorageSuccess(sessionId: string, results: {
    stored: number;
    updated: number;
    duplicatesSkipped: number;
    errors: number;
    processingTime: number;
  }) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const successRate = Math.round(((results.stored + results.updated) / (results.stored + results.updated + results.errors)) * 100);
    
    console.log(`\n✅ [QdrantTracker] ======== DATA STORAGE SUCCESSFUL ========`);
    console.log(`➕ [QdrantTracker] New places stored: ${results.stored}`);
    console.log(`🔄 [QdrantTracker] Existing places updated: ${results.updated}`);
    console.log(`⏭️  [QdrantTracker] Duplicates skipped: ${results.duplicatesSkipped}`);
    console.log(`❌ [QdrantTracker] Errors: ${results.errors}`);
    console.log(`📈 [QdrantTracker] Success rate: ${successRate}%`);
    console.log(`⏱️  [QdrantTracker] Storage time: ${results.processingTime}ms`);
    
    if (results.stored > 0) {
      console.log(`🎉 [QdrantTracker] ${results.stored} new places are now searchable in Qdrant!`);
    }
    if (results.updated > 0) {
      console.log(`🔄 [QdrantTracker] ${results.updated} existing places have been refreshed!`);
    }
  }

  /**
   * Log search operation
   */
  logSearchOperation(sessionId: string, searchParams: {
    query?: string;
    location?: string;
    categories?: string[];
    limit?: number;
    vectorSearch: boolean;
  }) {
    console.log(`\n🔍 [QdrantTracker] ======== SEARCHING QDRANT DATABASE ========`);
    
    if (searchParams.query) {
      console.log(`🧠 [QdrantTracker] Search query: "${searchParams.query}"`);
    }
    if (searchParams.location) {
      console.log(`📍 [QdrantTracker] Location: ${searchParams.location}`);
    }
    if (searchParams.categories && searchParams.categories.length > 0) {
      console.log(`🏷️  [QdrantTracker] Categories: [${searchParams.categories.join(', ')}]`);
    }
    console.log(`📊 [QdrantTracker] Results limit: ${searchParams.limit || 50}`);
    console.log(`🔬 [QdrantTracker] Search type: ${searchParams.vectorSearch ? 'Vector similarity' : 'Filter-based'}`);
  }

  /**
   * Log search results
   */
  logSearchResults(sessionId: string, results: {
    found: number;
    sources: string[];
    searchTime: number;
    fromCache: boolean;
  }) {
    const session = this.sessions.get(sessionId);
    
    console.log(`\n📊 [QdrantTracker] ======== SEARCH RESULTS ========`);
    console.log(`📈 [QdrantTracker] Places found: ${results.found}`);
    console.log(`📋 [QdrantTracker] Data sources: [${results.sources.join(', ')}]`);
    console.log(`⏱️  [QdrantTracker] Search time: ${results.searchTime}ms`);
    console.log(`💾 [QdrantTracker] Result source: ${results.fromCache ? 'Cache (very fast!)' : 'Live search'}`);
    
    if (results.found === 0) {
      console.log(`⚠️  [QdrantTracker] No results found - consider widening search criteria`);
    } else if (results.found > 0) {
      console.log(`✅ [QdrantTracker] Great! ${results.found} places retrieved from Qdrant`);
    }
  }

  /**
   * End tracking session
   */
  endOperation(sessionId: string, success: boolean = true, finalMessage?: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const totalTime = Date.now() - session.startTime;
    
    console.log(`\n${success ? '🎉' : '❌'} [QdrantTracker] ======== OPERATION COMPLETED ========`);
    console.log(`🏷️  [QdrantTracker] Operation: ${session.operation}`);
    console.log(`⏱️  [QdrantTracker] Total time: ${totalTime}ms`);
    console.log(`📊 [QdrantTracker] Status: ${success ? 'SUCCESS' : 'FAILED'}`);
    
    if (finalMessage) {
      console.log(`💬 [QdrantTracker] ${finalMessage}`);
    }
    
    console.log(`🔗 [QdrantTracker] Qdrant Cloud sync ${success ? 'completed successfully' : 'encountered issues'}`);
    console.log(`🆔 [QdrantTracker] Session ${sessionId} ended\n`);
    
    this.sessions.delete(sessionId);
  }

  /**
   * Quick helper for tracking data ingestion
   */
  trackDataIngestion(location: string, onProgress?: (message: string) => void): string {
    const sessionId = this.startOperation('Data Ingestion', { location });
    
    const originalConsoleLog = console.log;
    if (onProgress) {
      console.log = (...args) => {
        const message = args.join(' ');
        onProgress(message);
        originalConsoleLog(...args);
      };
    }
    
    return sessionId;
  }

  /**
   * Quick helper for tracking search operations
   */
  trackSearch(query: string, expectedResults?: number): string {
    return this.startOperation('Smart Search', { location: query, expectedResults });
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): TrackingSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Log current system status
   */
  logSystemStatus() {
    const activeSessions = this.getActiveSessions();
    
    console.log(`\n📊 [QdrantTracker] ======== SYSTEM STATUS ========`);
    console.log(`🔢 [QdrantTracker] Total operations run: ${this.operationCount}`);
    console.log(`⚡ [QdrantTracker] Currently active: ${activeSessions.length} operations`);
    
    if (activeSessions.length > 0) {
      console.log(`📋 [QdrantTracker] Active operations:`);
      activeSessions.forEach((session, index) => {
        const runtime = Date.now() - session.startTime;
        console.log(`   ${index + 1}. ${session.operation} (running ${runtime}ms)`);
      });
    }
    
    console.log(`✅ [QdrantTracker] System ready for Qdrant operations\n`);
  }
}

// Export singleton instance and convenient functions
export const consoleTracker = ConsoleTracker.getInstance();

// Convenient wrapper functions
export function trackDataIngestion(location: string): string {
  return consoleTracker.startOperation('Data Ingestion', { location });
}

export function trackSearch(query: string, expectedResults?: number): string {
  return consoleTracker.startOperation('Search Operation', { location: query, expectedResults });
}

export function logDataBeingAdded(sessionId: string, places: Array<{ name: string; source: string; category: string }>, embeddings: number = 768, collection: string = 'unified_places') {
  consoleTracker.logDataAdded(sessionId, { places, embeddings, collection });
}

export function logStorageResults(sessionId: string, results: { stored: number; updated: number; duplicatesSkipped: number; errors: number; processingTime: number }) {
  consoleTracker.logStorageSuccess(sessionId, results);
}

export function logSearchResults(sessionId: string, found: number, sources: string[], searchTime: number, fromCache: boolean = false) {
  consoleTracker.logSearchResults(sessionId, { found, sources, searchTime, fromCache });
}

export function endTracking(sessionId: string, success: boolean = true, message?: string) {
  consoleTracker.endOperation(sessionId, success, message);
}

export function showSystemStatus() {
  consoleTracker.logSystemStatus();
}

// Simple one-liner functions for quick tracking
export function quickTrackIngestion(location: string, callback: (sessionId: string) => Promise<void>) {
  return async () => {
    const sessionId = trackDataIngestion(location);
    try {
      await callback(sessionId);
      endTracking(sessionId, true, `Successfully processed data for ${location}`);
    } catch (error: any) {
      endTracking(sessionId, false, `Failed to process ${location}: ${error.message}`);
    }
  };
}

export function quickTrackSearch(query: string, callback: (sessionId: string) => Promise<any>) {
  return async () => {
    const sessionId = trackSearch(query);
    try {
      const result = await callback(sessionId);
      endTracking(sessionId, true, `Search for "${query}" completed successfully`);
      return result;
    } catch (error: any) {
      endTracking(sessionId, false, `Search for "${query}" failed: ${error.message}`);
      throw error;
    }
  };
}