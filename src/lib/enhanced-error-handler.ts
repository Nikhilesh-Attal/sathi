/**
 * Enhanced Error Handling Utility with Retry Logic
 * Provides exponential backoff, network failure detection, and comprehensive error recovery
 */

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
  retryableErrors: string[];
}

export interface ErrorMetrics {
  totalRequests: number;
  totalFailures: number;
  retryAttempts: number;
  averageResponseTime: number;
  errorsByType: Record<string, number>;
  lastError?: Error;
  lastSuccessTime?: number;
}

export class EnhancedErrorHandler {
  private static instance: EnhancedErrorHandler;
  private metrics: Map<string, ErrorMetrics> = new Map();
  
  private defaultConfig: RetryConfig = {
    maxRetries: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2,
    retryableStatusCodes: [408, 429, 502, 503, 504],
    retryableErrors: ['ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT', 'NETWORK_ERROR']
  };

  private constructor() {}

  public static getInstance(): EnhancedErrorHandler {
    if (!EnhancedErrorHandler.instance) {
      EnhancedErrorHandler.instance = new EnhancedErrorHandler();
    }
    return EnhancedErrorHandler.instance;
  }

  /**
   * Execute a function with retry logic and error handling
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const startTime = Date.now();
    
    let lastError: Error;
    
    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        console.log(`[ErrorHandler] ${operationName} - Attempt ${attempt + 1}/${finalConfig.maxRetries + 1}`);
        
        const result = await operation();
        
        // Success - update metrics
        this.updateSuccessMetrics(operationName, Date.now() - startTime);
        
        if (attempt > 0) {
          console.log(`[ErrorHandler] ✅ ${operationName} succeeded after ${attempt + 1} attempts`);
        }
        
        return result;
        
      } catch (error: any) {
        lastError = error;
        
        console.error(`[ErrorHandler] ❌ ${operationName} attempt ${attempt + 1} failed:`, {
          message: error.message,
          status: error.response?.status,
          code: error.code
        });
        
        // Update failure metrics
        this.updateFailureMetrics(operationName, error);
        
        // Check if error is retryable
        if (!this.isRetryableError(error, finalConfig) || attempt === finalConfig.maxRetries) {
          console.error(`[ErrorHandler] 🚫 ${operationName} failed permanently after ${attempt + 1} attempts`);
          throw error;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          finalConfig.initialDelay * Math.pow(finalConfig.backoffMultiplier, attempt),
          finalConfig.maxDelay
        );
        
        console.log(`[ErrorHandler] ⏳ Retrying ${operationName} in ${delay}ms...`);
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any, config: RetryConfig): boolean {
    // Check status codes
    if (error.response?.status && config.retryableStatusCodes.includes(error.response.status)) {
      return true;
    }
    
    // Check error codes
    if (error.code && config.retryableErrors.includes(error.code)) {
      return true;
    }
    
    // Check error messages
    const errorMessage = error.message?.toLowerCase() || '';
    const retryableMessages = ['timeout', 'network', 'connection', 'enotfound', 'econnreset'];
    
    return retryableMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * Update success metrics
   */
  private updateSuccessMetrics(operationName: string, responseTime: number): void {
    const metrics = this.getOrCreateMetrics(operationName);
    metrics.totalRequests++;
    metrics.lastSuccessTime = Date.now();
    
    // Update average response time
    metrics.averageResponseTime = 
      (metrics.averageResponseTime * (metrics.totalRequests - 1) + responseTime) / metrics.totalRequests;
  }

  /**
   * Update failure metrics
   */
  private updateFailureMetrics(operationName: string, error: Error): void {
    const metrics = this.getOrCreateMetrics(operationName);
    metrics.totalFailures++;
    metrics.retryAttempts++;
    metrics.lastError = error;
    
    // Count error types
    const errorType = error.constructor.name;
    metrics.errorsByType[errorType] = (metrics.errorsByType[errorType] || 0) + 1;
  }

  /**
   * Get or create metrics for an operation
   */
  private getOrCreateMetrics(operationName: string): ErrorMetrics {
    if (!this.metrics.has(operationName)) {
      this.metrics.set(operationName, {
        totalRequests: 0,
        totalFailures: 0,
        retryAttempts: 0,
        averageResponseTime: 0,
        errorsByType: {}
      });
    }
    return this.metrics.get(operationName)!;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get metrics for all operations
   */
  public getMetrics(): Record<string, ErrorMetrics> {
    const result: Record<string, ErrorMetrics> = {};
    for (const [name, metrics] of this.metrics.entries()) {
      result[name] = { ...metrics };
    }
    return result;
  }

  /**
   * Get health status for an operation
   */
  public getHealthStatus(operationName: string): 'healthy' | 'warning' | 'critical' | 'unknown' {
    const metrics = this.metrics.get(operationName);
    
    if (!metrics || metrics.totalRequests === 0) {
      return 'unknown';
    }
    
    const failureRate = metrics.totalFailures / metrics.totalRequests;
    const timeSinceLastSuccess = metrics.lastSuccessTime 
      ? Date.now() - metrics.lastSuccessTime 
      : Infinity;
    
    // Critical: >50% failure rate or no success in last hour
    if (failureRate > 0.5 || timeSinceLastSuccess > 60 * 60 * 1000) {
      return 'critical';
    }
    
    // Warning: >20% failure rate or no success in last 15 minutes
    if (failureRate > 0.2 || timeSinceLastSuccess > 15 * 60 * 1000) {
      return 'warning';
    }
    
    return 'healthy';
  }

  /**
   * Reset metrics for an operation
   */
  public resetMetrics(operationName: string): void {
    this.metrics.delete(operationName);
    console.log(`[ErrorHandler] 🔄 Reset metrics for ${operationName}`);
  }

  /**
   * Get system-wide health summary
   */
  public getSystemHealth(): {
    overall: 'healthy' | 'warning' | 'critical';
    operations: Record<string, 'healthy' | 'warning' | 'critical' | 'unknown'>;
    summary: {
      totalOperations: number;
      healthyOperations: number;
      warningOperations: number;
      criticalOperations: number;
    };
  } {
    const operations: Record<string, 'healthy' | 'warning' | 'critical' | 'unknown'> = {};
    let healthyCount = 0;
    let warningCount = 0;
    let criticalCount = 0;
    
    for (const operationName of this.metrics.keys()) {
      const status = this.getHealthStatus(operationName);
      operations[operationName] = status;
      
      switch (status) {
        case 'healthy': healthyCount++; break;
        case 'warning': warningCount++; break;
        case 'critical': criticalCount++; break;
      }
    }
    
    const totalOperations = this.metrics.size;
    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (criticalCount > 0 || criticalCount > totalOperations * 0.3) {
      overall = 'critical';
    } else if (warningCount > totalOperations * 0.5) {
      overall = 'warning';
    }
    
    return {
      overall,
      operations,
      summary: {
        totalOperations,
        healthyOperations: healthyCount,
        warningOperations: warningCount,
        criticalOperations: criticalCount
      }
    };
  }
}

// Export singleton instance
export const errorHandler = EnhancedErrorHandler.getInstance();

/**
 * Wrapper function for easy use
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  config?: Partial<RetryConfig>
): Promise<T> {
  return errorHandler.executeWithRetry(operation, operationName, config);
}

/**
 * Network-aware retry config for API calls
 */
export const API_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 1.5,
  retryableStatusCodes: [408, 429, 502, 503, 504],
  retryableErrors: ['ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT', 'NETWORK_ERROR']
};

/**
 * Conservative retry config for database operations
 */
export const DB_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 2000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableStatusCodes: [500, 502, 503, 504],
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT']
};