/**
 * API Health Check System
 * Monitors API health, tracks performance, and dynamically reorders tiers for optimal performance
 */

import { performanceAnalytics, trackAPICall } from './performance-analytics';
import { errorHandler } from './enhanced-error-handler';

export interface APIHealthStatus {
  name: string;
  tier: number;
  status: 'healthy' | 'warning' | 'critical' | 'down';
  responseTime: number;
  successRate: number;
  lastCheck: number;
  isEnabled: boolean;
  priority: number; // Lower number = higher priority
}

export interface HealthCheckConfig {
  interval: number; // Health check interval in milliseconds
  timeout: number;  // Request timeout in milliseconds
  retries: number;  // Number of retries for health checks
  thresholds: {
    responseTime: {
      warning: number;
      critical: number;
    };
    successRate: {
      warning: number;
      critical: number;
    };
  };
}

export interface TierReorderingResult {
  previousOrder: string[];
  newOrder: string[];
  reasonsForChange: string[];
  timestamp: number;
}

export class APIHealthMonitor {
  private static instance: APIHealthMonitor;
  private healthStatuses: Map<string, APIHealthStatus> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private config: HealthCheckConfig = {
    interval: 5 * 60 * 1000, // 5 minutes
    timeout: 10000, // 10 seconds
    retries: 2,
    thresholds: {
      responseTime: {
        warning: 3000, // 3 seconds
        critical: 8000  // 8 seconds
      },
      successRate: {
        warning: 0.7,  // 70%
        critical: 0.5  // 50%
      }
    }
  };

  private constructor() {
    this.initializeAPIs();
    this.startHealthChecking();
  }

  public static getInstance(): APIHealthMonitor {
    if (!APIHealthMonitor.instance) {
      APIHealthMonitor.instance = new APIHealthMonitor();
    }
    return APIHealthMonitor.instance;
  }

  /**
   * Initialize API configurations
   */
  private initializeAPIs(): void {
    const apis = [
      { name: 'qdrant', tier: 1, priority: 1, endpoint: null }, // No HTTP endpoint for health check
      { name: 'rapidapi', tier: 2, priority: 2, endpoint: 'https://travel-places.p.rapidapi.com/' },
      { name: 'geoapify', tier: 3, priority: 3, endpoint: 'https://api.geoapify.com/v1/geocode/search' },
      { name: 'openstreetmap', tier: 4, priority: 4, endpoint: 'https://nominatim.openstreetmap.org/search' },
      { name: 'opentripmap', tier: 5, priority: 5, endpoint: 'https://api.opentripmap.com/0.1/en/places/radius' },
      { name: 'ai-fallback', tier: 6, priority: 6, endpoint: null } // AI fallback doesn't need health check
    ];

    for (const api of apis) {
      this.healthStatuses.set(api.name, {
        name: api.name,
        tier: api.tier,
        status: 'healthy',
        responseTime: 0,
        successRate: 1.0,
        lastCheck: 0,
        isEnabled: true,
        priority: api.priority
      });
    }

    console.log('[APIHealthMonitor] 🏥 Initialized health monitoring for 6 APIs');
  }

  /**
   * Start periodic health checking
   */
  private startHealthChecking(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.interval);

    console.log(`[APIHealthMonitor] 🕐 Started health checking every ${this.config.interval / 1000}s`);
  }

  /**
   * Perform health checks for all APIs
   */
  private async performHealthChecks(): Promise<void> {
    console.log('[APIHealthMonitor] 🔍 Starting comprehensive health checks...');
    
    const healthCheckPromises = Array.from(this.healthStatuses.keys()).map(apiName => 
      this.checkAPIHealth(apiName)
    );

    await Promise.allSettled(healthCheckPromises);
    
    // Analyze results and potentially reorder tiers
    const reorderResult = this.evaluateTierReordering();
    
    if (reorderResult) {
      console.log('[APIHealthMonitor] 🔄 Tier reordering performed:', reorderResult.reasonsForChange);
    }

    // Log overall system health
    this.logSystemHealthSummary();
  }

  /**
   * Check health of a specific API
   */
  private async checkAPIHealth(apiName: string): Promise<void> {
    const status = this.healthStatuses.get(apiName);
    if (!status) return;

    // Skip health check for APIs without endpoints
    if (apiName === 'qdrant' || apiName === 'ai-fallback') {
      // For these, we rely on actual usage metrics
      this.updateHealthFromMetrics(apiName);
      return;
    }

    try {
      const startTime = Date.now();
      
      // Perform actual health check based on API
      const isHealthy = await this.performSpecificHealthCheck(apiName);
      const responseTime = Date.now() - startTime;

      // Update status based on health check result
      status.responseTime = responseTime;
      status.lastCheck = Date.now();

      if (isHealthy) {
        status.status = this.calculateStatusFromMetrics(responseTime, 1.0);
      } else {
        status.status = 'critical';
        status.successRate = Math.max(0, status.successRate - 0.1); // Decrease success rate
      }

      console.log(`[APIHealthMonitor] ${this.getStatusEmoji(status.status)} ${apiName}: ${status.status} (${responseTime}ms)`);

    } catch (error: any) {
      status.status = 'down';
      status.lastCheck = Date.now();
      status.successRate = Math.max(0, status.successRate - 0.2); // Bigger decrease for errors
      
      console.error(`[APIHealthMonitor] ❌ ${apiName} health check failed:`, error.message);
    }
  }

  /**
   * Perform specific health check for each API
   */
  private async performSpecificHealthCheck(apiName: string): Promise<boolean> {
    try {
      switch (apiName) {
        case 'rapidapi':
          // Simple GraphQL introspection query
          const rapidResponse = await fetch('https://travel-places.p.rapidapi.com/', {
            method: 'POST',
            headers: {
              'x-rapidapi-key': process.env.RAPIDAPI_KEY || 'test',
              'x-rapidapi-host': 'travel-places.p.rapidapi.com',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: '{ __schema { queryType { name } } }' }),
            signal: AbortSignal.timeout(this.config.timeout)
          });
          return rapidResponse.ok;

        case 'geoapify':
          const geoResponse = await fetch(
            `https://api.geoapify.com/v1/geocode/search?text=Paris&limit=1&apiKey=${process.env.GEOAPIFY_KEY || 'test'}`,
            { signal: AbortSignal.timeout(this.config.timeout) }
          );
          return geoResponse.ok;

        case 'openstreetmap':
          const osmResponse = await fetch(
            'https://nominatim.openstreetmap.org/search?q=Paris&format=json&limit=1',
            { 
              headers: { 'User-Agent': 'SathiApp/1.0' },
              signal: AbortSignal.timeout(this.config.timeout) 
            }
          );
          return osmResponse.ok;

        case 'opentripmap':
          const otmResponse = await fetch(
            `https://api.opentripmap.com/0.1/en/places/radius?radius=1000&lat=48.8566&lon=2.3522&apikey=${process.env.OPENTRIPMAP_API_KEY || 'test'}`,
            { signal: AbortSignal.timeout(this.config.timeout) }
          );
          return otmResponse.ok;

        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Update health status based on actual usage metrics
   */
  private updateHealthFromMetrics(apiName: string): void {
    const metrics = performanceAnalytics.getAPIMetrics(apiName);
    const status = this.healthStatuses.get(apiName);
    
    if (!status || !metrics) return;

    // Update based on actual performance metrics
    status.responseTime = metrics.averageResponseTime;
    status.successRate = metrics.successRate;
    status.lastCheck = Date.now();
    status.status = this.calculateStatusFromMetrics(
      metrics.averageResponseTime,
      metrics.successRate
    );

    console.log(`[APIHealthMonitor] ${this.getStatusEmoji(status.status)} ${apiName}: ${status.status} (from usage metrics)`);
  }

  /**
   * Calculate status from response time and success rate
   */
  private calculateStatusFromMetrics(responseTime: number, successRate: number): 'healthy' | 'warning' | 'critical' | 'down' {
    if (successRate < this.config.thresholds.successRate.critical || 
        responseTime > this.config.thresholds.responseTime.critical) {
      return 'critical';
    }
    
    if (successRate < this.config.thresholds.successRate.warning || 
        responseTime > this.config.thresholds.responseTime.warning) {
      return 'warning';
    }
    
    return 'healthy';
  }

  /**
   * Evaluate whether tier reordering is needed
   */
  private evaluateTierReordering(): TierReorderingResult | null {
    const apis = Array.from(this.healthStatuses.values())
      .filter(api => api.name !== 'ai-fallback'); // AI fallback always stays last

    const currentOrder = apis
      .sort((a, b) => a.tier - b.tier)
      .map(api => api.name);

    // Calculate new order based on health and performance
    const newOrder = apis
      .sort((a, b) => {
        // Disabled APIs go to the end
        if (!a.isEnabled && b.isEnabled) return 1;
        if (a.isEnabled && !b.isEnabled) return -1;
        
        // Sort by status priority, then by performance
        const statusPriority = { healthy: 0, warning: 1, critical: 2, down: 3 };
        const statusDiff = statusPriority[a.status] - statusPriority[b.status];
        
        if (statusDiff !== 0) return statusDiff;
        
        // If status is the same, sort by performance
        const performanceScore = (api: APIHealthStatus) => {
          return (api.successRate * 100) - (api.responseTime / 100);
        };
        
        return performanceScore(b) - performanceScore(a);
      })
      .map(api => api.name);

    // Check if reordering is needed
    const needsReordering = !this.arraysEqual(currentOrder, newOrder);
    
    if (needsReordering) {
      const reasonsForChange: string[] = [];
      
      // Update tiers
      newOrder.forEach((apiName, index) => {
        const api = this.healthStatuses.get(apiName);
        if (api && api.tier !== index + 1) {
          reasonsForChange.push(`${apiName}: moved from tier ${api.tier} to ${index + 1} (${api.status}, ${api.successRate.toFixed(2)} success rate)`);
          api.tier = index + 1;
        }
      });

      return {
        previousOrder: currentOrder,
        newOrder,
        reasonsForChange,
        timestamp: Date.now()
      };
    }

    return null;
  }

  /**
   * Get current API order (sorted by tier)
   */
  public getCurrentAPIOrder(): string[] {
    return Array.from(this.healthStatuses.values())
      .sort((a, b) => a.tier - b.tier)
      .map(api => api.name);
  }

  /**
   * Get health status for all APIs
   */
  public getHealthStatuses(): Record<string, APIHealthStatus> {
    const statuses: Record<string, APIHealthStatus> = {};
    for (const [name, status] of this.healthStatuses) {
      statuses[name] = { ...status };
    }
    return statuses;
  }

  /**
   * Get health status for a specific API
   */
  public getAPIHealth(apiName: string): APIHealthStatus | null {
    const status = this.healthStatuses.get(apiName);
    return status ? { ...status } : null;
  }

  /**
   * Manually trigger health checks
   */
  public async triggerHealthCheck(): Promise<void> {
    console.log('[APIHealthMonitor] 🔄 Manual health check triggered');
    await this.performHealthChecks();
  }

  /**
   * Enable/disable an API
   */
  public setAPIEnabled(apiName: string, enabled: boolean): void {
    const status = this.healthStatuses.get(apiName);
    if (status) {
      status.isEnabled = enabled;
      console.log(`[APIHealthMonitor] ${enabled ? '✅' : '❌'} ${apiName} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Get system health summary
   */
  public getSystemHealthSummary(): {
    overall: 'healthy' | 'warning' | 'critical';
    healthyAPIs: number;
    warningAPIs: number;
    criticalAPIs: number;
    downAPIs: number;
    totalAPIs: number;
  } {
    const statuses = Array.from(this.healthStatuses.values());
    const healthyAPIs = statuses.filter(s => s.status === 'healthy').length;
    const warningAPIs = statuses.filter(s => s.status === 'warning').length;
    const criticalAPIs = statuses.filter(s => s.status === 'critical').length;
    const downAPIs = statuses.filter(s => s.status === 'down').length;

    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (downAPIs > 0 || criticalAPIs > statuses.length / 2) {
      overall = 'critical';
    } else if (warningAPIs > healthyAPIs) {
      overall = 'warning';
    }

    return {
      overall,
      healthyAPIs,
      warningAPIs,
      criticalAPIs,
      downAPIs,
      totalAPIs: statuses.length
    };
  }

  /**
   * Utility functions
   */
  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'critical': return '🔴';
      case 'down': return '❌';
      default: return '❓';
    }
  }

  private arraysEqual(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((val, i) => val === b[i]);
  }

  private logSystemHealthSummary(): void {
    const summary = this.getSystemHealthSummary();
    console.log(`[APIHealthMonitor] 📊 System Health: ${summary.overall.toUpperCase()}`);
    console.log(`[APIHealthMonitor] 📈 APIs: ✅${summary.healthyAPIs} ⚠️${summary.warningAPIs} 🔴${summary.criticalAPIs} ❌${summary.downAPIs}`);
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    console.log('[APIHealthMonitor] 🧹 Health monitor destroyed');
  }
}

// Export singleton instance
export const apiHealthMonitor = APIHealthMonitor.getInstance();