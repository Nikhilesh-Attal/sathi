/**
 * Performance Monitoring & Analytics System
 * Tracks API success rates, cache performance, search patterns, and system health
 */

export interface APIMetrics {
  name: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestTime: number;
  successRate: number;
  errors: Array<{
    message: string;
    timestamp: number;
    count: number;
  }>;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalSize: number;
  averageRetrievalTime: number;
  evictions: number;
  lastCleanup: number;
}

export interface SearchPattern {
  query: string;
  location: string;
  timestamp: number;
  resultCount: number;
  responseTime: number;
  source: string;
  userId?: string;
}

export interface SystemHealthMetrics {
  overall: 'healthy' | 'warning' | 'critical';
  apis: Record<string, 'healthy' | 'warning' | 'critical' | 'down'>;
  cache: 'healthy' | 'warning' | 'critical';
  database: 'healthy' | 'warning' | 'critical';
  lastCheck: number;
  uptime: number;
}

export interface PerformanceReport {
  timestamp: number;
  apiMetrics: Record<string, APIMetrics>;
  cacheMetrics: CacheMetrics;
  topSearchPatterns: SearchPattern[];
  systemHealth: SystemHealthMetrics;
  recommendations: string[];
  warnings: string[];
  summary: {
    totalRequests: number;
    overallSuccessRate: number;
    averageResponseTime: number;
    cacheHitRate: number;
    activeAPIs: number;
    criticalIssues: number;
  };
}

export class PerformanceAnalytics {
  private static instance: PerformanceAnalytics;
  private apiMetrics: Map<string, APIMetrics> = new Map();
  private cacheMetrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalSize: 0,
    averageRetrievalTime: 0,
    evictions: 0,
    lastCleanup: Date.now()
  };
  private searchPatterns: SearchPattern[] = [];
  private systemStartTime = Date.now();
  private maxSearchPatterns = 1000; // Keep last 1000 searches

  private constructor() {
    this.startPeriodicCleanup();
  }

  public static getInstance(): PerformanceAnalytics {
    if (!PerformanceAnalytics.instance) {
      PerformanceAnalytics.instance = new PerformanceAnalytics();
    }
    return PerformanceAnalytics.instance;
  }

  /**
   * Record API request metrics
   */
  recordAPIRequest(
    apiName: string,
    success: boolean,
    responseTime: number,
    error?: Error
  ): void {
    const metrics = this.getOrCreateAPIMetrics(apiName);
    
    metrics.totalRequests++;
    metrics.lastRequestTime = Date.now();
    
    if (success) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
      
      if (error) {
        // Track error patterns
        const errorMessage = error.message;
        const existingError = metrics.errors.find(e => e.message === errorMessage);
        
        if (existingError) {
          existingError.count++;
        } else {
          metrics.errors.push({
            message: errorMessage,
            timestamp: Date.now(),
            count: 1
          });
        }
        
        // Keep only recent errors (last 50)
        if (metrics.errors.length > 50) {
          metrics.errors = metrics.errors.slice(-50);
        }
      }
    }
    
    // Update averages
    metrics.successRate = metrics.successfulRequests / metrics.totalRequests;
    metrics.averageResponseTime = 
      (metrics.averageResponseTime * (metrics.totalRequests - 1) + responseTime) / metrics.totalRequests;

    console.log(`[Analytics] ${apiName}: success=${success}, time=${responseTime}ms, rate=${(metrics.successRate * 100).toFixed(1)}%`);
  }

  /**
   * Record cache operation metrics
   */
  recordCacheOperation(hit: boolean, retrievalTime: number = 0): void {
    if (hit) {
      this.cacheMetrics.hits++;
    } else {
      this.cacheMetrics.misses++;
    }
    
    const total = this.cacheMetrics.hits + this.cacheMetrics.misses;
    this.cacheMetrics.hitRate = this.cacheMetrics.hits / total;
    
    if (retrievalTime > 0) {
      this.cacheMetrics.averageRetrievalTime = 
        (this.cacheMetrics.averageRetrievalTime + retrievalTime) / 2;
    }

    console.log(`[Analytics] Cache: hit=${hit}, rate=${(this.cacheMetrics.hitRate * 100).toFixed(1)}%`);
  }

  /**
   * Record search pattern for analysis
   */
  recordSearchPattern(pattern: SearchPattern): void {
    this.searchPatterns.push(pattern);
    
    // Keep only recent patterns
    if (this.searchPatterns.length > this.maxSearchPatterns) {
      this.searchPatterns = this.searchPatterns.slice(-this.maxSearchPatterns);
    }

    console.log(`[Analytics] Search recorded: ${pattern.query} → ${pattern.resultCount} results (${pattern.responseTime}ms)`);
  }

  /**
   * Record cache eviction
   */
  recordCacheEviction(): void {
    this.cacheMetrics.evictions++;
    console.log(`[Analytics] Cache eviction recorded (total: ${this.cacheMetrics.evictions})`);
  }

  /**
   * Update cache size
   */
  updateCacheSize(size: number): void {
    this.cacheMetrics.totalSize = size;
  }

  /**
   * Get comprehensive performance report
   */
  generateReport(): PerformanceReport {
    const now = Date.now();
    const uptime = now - this.systemStartTime;
    
    // Calculate system health
    const systemHealth = this.calculateSystemHealth();
    
    // Get top search patterns (most common queries)
    const topSearchPatterns = this.getTopSearchPatterns(20);
    
    // Generate recommendations and warnings
    const { recommendations, warnings } = this.generateInsights();
    
    // Calculate summary metrics
    const summary = this.calculateSummary();

    const report: PerformanceReport = {
      timestamp: now,
      apiMetrics: this.getAPIMetricsSnapshot(),
      cacheMetrics: { ...this.cacheMetrics },
      topSearchPatterns,
      systemHealth: {
        ...systemHealth,
        uptime
      },
      recommendations,
      warnings,
      summary
    };

    console.log(`[Analytics] 📊 Performance report generated`);
    console.log(`[Analytics] 📈 Summary: ${summary.totalRequests} requests, ${summary.overallSuccessRate.toFixed(1)}% success rate`);
    
    return report;
  }

  /**
   * Get metrics for a specific API
   */
  getAPIMetrics(apiName: string): APIMetrics | null {
    return this.apiMetrics.get(apiName) || null;
  }

  /**
   * Get current cache metrics
   */
  getCacheMetrics(): CacheMetrics {
    return { ...this.cacheMetrics };
  }

  /**
   * Get recent search patterns
   */
  getRecentSearchPatterns(limit: number = 50): SearchPattern[] {
    return this.searchPatterns
      .slice(-limit)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Reset metrics for testing or maintenance
   */
  resetMetrics(): void {
    this.apiMetrics.clear();
    this.cacheMetrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalSize: 0,
      averageRetrievalTime: 0,
      evictions: 0,
      lastCleanup: Date.now()
    };
    this.searchPatterns = [];
    console.log('[Analytics] 🔄 Metrics reset');
  }

  /**
   * Export metrics for backup or analysis
   */
  exportMetrics(): {
    apis: Record<string, APIMetrics>;
    cache: CacheMetrics;
    patterns: SearchPattern[];
    timestamp: number;
  } {
    return {
      apis: this.getAPIMetricsSnapshot(),
      cache: { ...this.cacheMetrics },
      patterns: [...this.searchPatterns],
      timestamp: Date.now()
    };
  }

  /**
   * Get or create API metrics object
   */
  private getOrCreateAPIMetrics(apiName: string): APIMetrics {
    if (!this.apiMetrics.has(apiName)) {
      this.apiMetrics.set(apiName, {
        name: apiName,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        lastRequestTime: 0,
        successRate: 0,
        errors: []
      });
    }
    return this.apiMetrics.get(apiName)!;
  }

  /**
   * Calculate overall system health
   */
  private calculateSystemHealth(): SystemHealthMetrics {
    const apis: Record<string, 'healthy' | 'warning' | 'critical' | 'down'> = {};
    let healthyCount = 0;
    let warningCount = 0;
    let criticalCount = 0;

    // Check API health
    for (const [name, metrics] of this.apiMetrics) {
      const timeSinceLastRequest = Date.now() - metrics.lastRequestTime;
      const recentActivity = timeSinceLastRequest < 15 * 60 * 1000; // 15 minutes
      
      if (!recentActivity) {
        apis[name] = 'down';
        criticalCount++;
      } else if (metrics.successRate < 0.5) {
        apis[name] = 'critical';
        criticalCount++;
      } else if (metrics.successRate < 0.8) {
        apis[name] = 'warning';
        warningCount++;
      } else {
        apis[name] = 'healthy';
        healthyCount++;
      }
    }

    // Check cache health
    const cacheHealth = this.cacheMetrics.hitRate > 0.7 ? 'healthy' : 
                       this.cacheMetrics.hitRate > 0.4 ? 'warning' : 'critical';

    // Overall system health
    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (criticalCount > 0 || cacheHealth === 'critical') {
      overall = 'critical';
    } else if (warningCount > healthyCount || cacheHealth === 'warning') {
      overall = 'warning';
    }

    return {
      overall,
      apis,
      cache: cacheHealth,
      database: 'healthy', // Would need Qdrant health check
      lastCheck: Date.now(),
      uptime: Date.now() - this.systemStartTime
    };
  }

  /**
   * Get top search patterns by frequency
   */
  private getTopSearchPatterns(limit: number): SearchPattern[] {
    const patternCounts = new Map<string, { pattern: SearchPattern; count: number }>();

    for (const pattern of this.searchPatterns) {
      const key = `${pattern.query}-${pattern.location}`;
      const existing = patternCounts.get(key);
      
      if (existing) {
        existing.count++;
      } else {
        patternCounts.set(key, { pattern, count: 1 });
      }
    }

    return Array.from(patternCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(item => item.pattern);
  }

  /**
   * Generate insights and recommendations
   */
  private generateInsights(): { recommendations: string[]; warnings: string[] } {
    const recommendations: string[] = [];
    const warnings: string[] = [];

    // Cache insights
    if (this.cacheMetrics.hitRate < 0.5) {
      warnings.push('Low cache hit rate detected. Consider increasing cache TTL or size.');
      recommendations.push('Optimize cache strategy - current hit rate is below 50%');
    }

    if (this.cacheMetrics.evictions > 100) {
      recommendations.push('High cache eviction rate. Consider increasing cache size.');
    }

    // API insights
    for (const [name, metrics] of this.apiMetrics) {
      if (metrics.successRate < 0.7) {
        warnings.push(`${name} API has low success rate (${(metrics.successRate * 100).toFixed(1)}%)`);
        recommendations.push(`Investigate ${name} API failures and implement better error handling`);
      }

      if (metrics.averageResponseTime > 5000) {
        warnings.push(`${name} API has slow response times (${metrics.averageResponseTime.toFixed(0)}ms)`);
        recommendations.push(`Optimize ${name} API performance or implement timeout strategies`);
      }
    }

    // Search pattern insights
    const recentSearches = this.searchPatterns.filter(p => Date.now() - p.timestamp < 24 * 60 * 60 * 1000);
    
    if (recentSearches.length > 500) {
      recommendations.push('High search volume detected. Consider implementing search result caching.');
    }

    const lowResultSearches = recentSearches.filter(p => p.resultCount === 0);
    if (lowResultSearches.length > recentSearches.length * 0.2) {
      warnings.push('High rate of searches returning no results (>20%)');
      recommendations.push('Improve fallback mechanisms or expand data sources');
    }

    return { recommendations, warnings };
  }

  /**
   * Calculate summary metrics
   */
  private calculateSummary(): PerformanceReport['summary'] {
    let totalRequests = 0;
    let totalSuccessful = 0;
    let totalResponseTime = 0;
    let activeAPIs = 0;
    let criticalIssues = 0;

    for (const metrics of this.apiMetrics.values()) {
      totalRequests += metrics.totalRequests;
      totalSuccessful += metrics.successfulRequests;
      totalResponseTime += metrics.averageResponseTime * metrics.totalRequests;
      
      if (metrics.totalRequests > 0) activeAPIs++;
      if (metrics.successRate < 0.5) criticalIssues++;
    }

    const overallSuccessRate = totalRequests > 0 ? totalSuccessful / totalRequests : 0;
    const averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;

    return {
      totalRequests,
      overallSuccessRate,
      averageResponseTime,
      cacheHitRate: this.cacheMetrics.hitRate,
      activeAPIs,
      criticalIssues
    };
  }

  /**
   * Get snapshot of all API metrics
   */
  private getAPIMetricsSnapshot(): Record<string, APIMetrics> {
    const snapshot: Record<string, APIMetrics> = {};
    for (const [name, metrics] of this.apiMetrics) {
      snapshot[name] = { ...metrics, errors: [...metrics.errors] };
    }
    return snapshot;
  }

  /**
   * Start periodic cleanup of old data
   */
  private startPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000); // Run every hour
  }

  /**
   * Clean up old data to prevent memory leaks
   */
  private cleanupOldData(): void {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    // Clean old search patterns
    this.searchPatterns = this.searchPatterns.filter(p => p.timestamp > oneWeekAgo);
    
    // Clean old API errors
    for (const metrics of this.apiMetrics.values()) {
      metrics.errors = metrics.errors.filter(e => e.timestamp > oneWeekAgo);
    }
    
    this.cacheMetrics.lastCleanup = Date.now();
    
    console.log('[Analytics] 🧹 Cleanup completed - removed data older than 7 days');
  }
}

// Export singleton instance
export const performanceAnalytics = PerformanceAnalytics.getInstance();

// Convenience functions for easy integration
export function trackAPICall<T>(
  apiName: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  return operation()
    .then(result => {
      const responseTime = Date.now() - startTime;
      performanceAnalytics.recordAPIRequest(apiName, true, responseTime);
      return result;
    })
    .catch(error => {
      const responseTime = Date.now() - startTime;
      performanceAnalytics.recordAPIRequest(apiName, false, responseTime, error);
      throw error;
    });
}

export function trackCacheHit(hit: boolean, retrievalTime?: number): void {
  performanceAnalytics.recordCacheOperation(hit, retrievalTime);
}

export function trackSearch(
  query: string,
  location: string,
  resultCount: number,
  responseTime: number,
  source: string,
  userId?: string
): void {
  performanceAnalytics.recordSearchPattern({
    query,
    location,
    timestamp: Date.now(),
    resultCount,
    responseTime,
    source,
    userId
  });
}