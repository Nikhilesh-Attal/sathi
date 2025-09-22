/**
 * Data Quality Monitoring System
 * Validates data quality, scores sources, and provides insights for improvement
 */

export interface DataQualityMetrics {
  source: string;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  completenessScore: number; // 0-100
  accuracyScore: number; // 0-100
  consistencyScore: number; // 0-100
  overallQualityScore: number; // 0-100
  lastAssessment: number;
  issues: DataQualityIssue[];
}

export interface DataQualityIssue {
  type: 'missing_required_field' | 'invalid_coordinates' | 'duplicate_entry' | 'inconsistent_format' | 'outlier_value' | 'incomplete_data';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  fieldName?: string;
  recordId?: string;
  timestamp: number;
  count: number;
}

export interface DataValidationRules {
  requiredFields: string[];
  coordinateRanges: {
    latitude: { min: number; max: number };
    longitude: { min: number; max: number };
  };
  nameRules: {
    minLength: number;
    maxLength: number;
    allowedCharacters: RegExp;
  };
  ratingRules: {
    min: number;
    max: number;
  };
  addressRules: {
    minLength: number;
    maxLength: number;
  };
}

export interface QualityReport {
  timestamp: number;
  overallScore: number;
  sourceScores: Record<string, number>;
  totalRecords: number;
  totalIssues: number;
  criticalIssues: number;
  recommendations: string[];
  trendsAnalysis: {
    qualityTrend: 'improving' | 'declining' | 'stable';
    bestPerformingSource: string;
    worstPerformingSource: string;
    commonIssues: string[];
  };
  detailedMetrics: Record<string, DataQualityMetrics>;
}

export class DataQualityMonitor {
  private static instance: DataQualityMonitor;
  private qualityMetrics: Map<string, DataQualityMetrics> = new Map();
  private validationRules: DataValidationRules = {
    requiredFields: ['name', 'coordinates', 'source'],
    coordinateRanges: {
      latitude: { min: -90, max: 90 },
      longitude: { min: -180, max: 180 }
    },
    nameRules: {
      minLength: 1,
      maxLength: 200,
      allowedCharacters: /^[a-zA-Z0-9\s\-'.,()&]+$/
    },
    ratingRules: {
      min: 0,
      max: 5
    },
    addressRules: {
      minLength: 1,
      maxLength: 500
    }
  };
  private historicalScores: Array<{ timestamp: number; scores: Record<string, number> }> = [];
  private maxHistoryEntries = 100;

  private constructor() {}

  public static getInstance(): DataQualityMonitor {
    if (!DataQualityMonitor.instance) {
      DataQualityMonitor.instance = new DataQualityMonitor();
    }
    return DataQualityMonitor.instance;
  }

  /**
   * Assess data quality for a batch of places from a specific source
   */
  public assessDataQuality(places: any[], source: string): DataQualityMetrics {
    console.log(`[DataQuality] 🔍 Assessing quality for ${places.length} records from ${source}`);
    
    const metrics = this.getOrCreateMetrics(source);
    const issues: DataQualityIssue[] = [];
    
    let validRecords = 0;
    let completenessSum = 0;
    let accuracySum = 0;
    let consistencySum = 0;

    // Validate each record
    for (const [index, place] of places.entries()) {
      const validation = this.validatePlace(place, index, source);
      
      if (validation.isValid) {
        validRecords++;
      }
      
      issues.push(...validation.issues);
      completenessSum += validation.completenessScore;
      accuracySum += validation.accuracyScore;
      consistencySum += validation.consistencyScore;
    }

    // Calculate scores
    const totalRecords = places.length;
    const completenessScore = totalRecords > 0 ? completenessSum / totalRecords : 0;
    const accuracyScore = totalRecords > 0 ? accuracySum / totalRecords : 0;
    const consistencyScore = totalRecords > 0 ? consistencySum / totalRecords : 0;
    const overallQualityScore = (completenessScore + accuracyScore + consistencyScore) / 3;

    // Update metrics
    metrics.totalRecords = totalRecords;
    metrics.validRecords = validRecords;
    metrics.invalidRecords = totalRecords - validRecords;
    metrics.completenessScore = completenessScore;
    metrics.accuracyScore = accuracyScore;
    metrics.consistencyScore = consistencyScore;
    metrics.overallQualityScore = overallQualityScore;
    metrics.lastAssessment = Date.now();
    metrics.issues = this.consolidateIssues(issues);

    // Store historical data
    this.updateHistoricalScores(source, overallQualityScore);

    console.log(`[DataQuality] 📊 ${source}: Overall Score ${overallQualityScore.toFixed(1)}/100, Valid: ${validRecords}/${totalRecords}, Issues: ${issues.length}`);
    
    return metrics;
  }

  /**
   * Validate individual place record
   */
  private validatePlace(place: any, index: number, source: string): {
    isValid: boolean;
    completenessScore: number;
    accuracyScore: number;
    consistencyScore: number;
    issues: DataQualityIssue[];
  } {
    const issues: DataQualityIssue[] = [];
    let completenessScore = 100;
    let accuracyScore = 100;
    let consistencyScore = 100;

    // Check required fields
    for (const field of this.validationRules.requiredFields) {
      if (!this.hasValidField(place, field)) {
        issues.push({
          type: 'missing_required_field',
          severity: 'high',
          message: `Missing or empty required field: ${field}`,
          fieldName: field,
          recordId: `${source}-${index}`,
          timestamp: Date.now(),
          count: 1
        });
        completenessScore -= 20;
      }
    }

    // Validate coordinates
    if (place.point || place.coordinates || place.geometry) {
      const coords = this.extractCoordinates(place);
      if (coords) {
        if (!this.isValidCoordinate(coords.lat, coords.lon)) {
          issues.push({
            type: 'invalid_coordinates',
            severity: 'critical',
            message: `Invalid coordinates: lat=${coords.lat}, lon=${coords.lon}`,
            fieldName: 'coordinates',
            recordId: `${source}-${index}`,
            timestamp: Date.now(),
            count: 1
          });
          accuracyScore -= 30;
        }
      } else {
        issues.push({
          type: 'missing_required_field',
          severity: 'high',
          message: 'Coordinates field exists but cannot extract valid lat/lon',
          fieldName: 'coordinates',
          recordId: `${source}-${index}`,
          timestamp: Date.now(),
          count: 1
        });
        accuracyScore -= 25;
      }
    }

    // Validate name
    if (place.name) {
      if (!this.isValidName(place.name)) {
        issues.push({
          type: 'inconsistent_format',
          severity: 'medium',
          message: `Invalid name format: "${place.name}"`,
          fieldName: 'name',
          recordId: `${source}-${index}`,
          timestamp: Date.now(),
          count: 1
        });
        consistencyScore -= 15;
      }
    }

    // Validate rating
    if (place.rating !== undefined && place.rating !== null) {
      if (!this.isValidRating(place.rating)) {
        issues.push({
          type: 'outlier_value',
          severity: 'medium',
          message: `Rating out of valid range: ${place.rating}`,
          fieldName: 'rating',
          recordId: `${source}-${index}`,
          timestamp: Date.now(),
          count: 1
        });
        accuracyScore -= 10;
      }
    }

    // Validate address/vicinity
    const address = place.vicinity || place.address || place.formatted_address;
    if (address) {
      if (!this.isValidAddress(address)) {
        issues.push({
          type: 'inconsistent_format',
          severity: 'low',
          message: `Address format issue: "${address}"`,
          fieldName: 'address',
          recordId: `${source}-${index}`,
          timestamp: Date.now(),
          count: 1
        });
        consistencyScore -= 5;
      }
    } else {
      issues.push({
        type: 'incomplete_data',
        severity: 'medium',
        message: 'No address information provided',
        fieldName: 'address',
        recordId: `${source}-${index}`,
        timestamp: Date.now(),
        count: 1
      });
      completenessScore -= 15;
    }

    // Ensure scores don't go below 0
    completenessScore = Math.max(0, completenessScore);
    accuracyScore = Math.max(0, accuracyScore);
    consistencyScore = Math.max(0, consistencyScore);

    const isValid = issues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0;

    return {
      isValid,
      completenessScore,
      accuracyScore,
      consistencyScore,
      issues
    };
  }

  /**
   * Validation helper methods
   */
  private hasValidField(obj: any, field: string): boolean {
    const value = obj[field];
    return value !== undefined && value !== null && value !== '';
  }

  private extractCoordinates(place: any): { lat: number; lon: number } | null {
    // Try different coordinate formats
    if (place.point && typeof place.point.lat === 'number' && typeof place.point.lon === 'number') {
      return { lat: place.point.lat, lon: place.point.lon };
    }
    
    if (place.coordinates && typeof place.coordinates.latitude === 'number' && typeof place.coordinates.longitude === 'number') {
      return { lat: place.coordinates.latitude, lon: place.coordinates.longitude };
    }
    
    if (place.geometry?.location && typeof place.geometry.location.lat === 'number' && typeof place.geometry.location.lng === 'number') {
      return { lat: place.geometry.location.lat, lon: place.geometry.location.lng };
    }
    
    // Direct lat/lng properties
    if (typeof place.lat === 'number' && typeof place.lng === 'number') {
      return { lat: place.lat, lon: place.lng };
    }
    
    if (typeof place.latitude === 'number' && typeof place.longitude === 'number') {
      return { lat: place.latitude, lon: place.longitude };
    }

    return null;
  }

  private isValidCoordinate(lat: number, lon: number): boolean {
    return lat >= this.validationRules.coordinateRanges.latitude.min &&
           lat <= this.validationRules.coordinateRanges.latitude.max &&
           lon >= this.validationRules.coordinateRanges.longitude.min &&
           lon <= this.validationRules.coordinateRanges.longitude.max;
  }

  private isValidName(name: string): boolean {
    return typeof name === 'string' &&
           name.length >= this.validationRules.nameRules.minLength &&
           name.length <= this.validationRules.nameRules.maxLength &&
           this.validationRules.nameRules.allowedCharacters.test(name);
  }

  private isValidRating(rating: any): boolean {
    const numRating = parseFloat(rating);
    return !isNaN(numRating) &&
           numRating >= this.validationRules.ratingRules.min &&
           numRating <= this.validationRules.ratingRules.max;
  }

  private isValidAddress(address: string): boolean {
    return typeof address === 'string' &&
           address.length >= this.validationRules.addressRules.minLength &&
           address.length <= this.validationRules.addressRules.maxLength;
  }

  /**
   * Consolidate similar issues to reduce noise
   */
  private consolidateIssues(issues: DataQualityIssue[]): DataQualityIssue[] {
    const consolidatedMap = new Map<string, DataQualityIssue>();

    for (const issue of issues) {
      const key = `${issue.type}-${issue.fieldName}-${issue.severity}`;
      const existing = consolidatedMap.get(key);

      if (existing) {
        existing.count++;
        existing.message = `${issue.message} (${existing.count} occurrences)`;
      } else {
        consolidatedMap.set(key, { ...issue });
      }
    }

    return Array.from(consolidatedMap.values())
      .sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
  }

  /**
   * Get or create metrics for a source
   */
  private getOrCreateMetrics(source: string): DataQualityMetrics {
    if (!this.qualityMetrics.has(source)) {
      this.qualityMetrics.set(source, {
        source,
        totalRecords: 0,
        validRecords: 0,
        invalidRecords: 0,
        completenessScore: 0,
        accuracyScore: 0,
        consistencyScore: 0,
        overallQualityScore: 0,
        lastAssessment: 0,
        issues: []
      });
    }
    return this.qualityMetrics.get(source)!;
  }

  /**
   * Update historical scores for trend analysis
   */
  private updateHistoricalScores(source: string, score: number): void {
    const now = Date.now();
    let entry = this.historicalScores.find(h => Math.abs(h.timestamp - now) < 60000); // Within 1 minute

    if (!entry) {
      entry = { timestamp: now, scores: {} };
      this.historicalScores.push(entry);
    }

    entry.scores[source] = score;

    // Keep only recent history
    if (this.historicalScores.length > this.maxHistoryEntries) {
      this.historicalScores = this.historicalScores.slice(-this.maxHistoryEntries);
    }
  }

  /**
   * Generate comprehensive quality report
   */
  public generateQualityReport(): QualityReport {
    const timestamp = Date.now();
    const metrics = Array.from(this.qualityMetrics.values());
    
    const totalRecords = metrics.reduce((sum, m) => sum + m.totalRecords, 0);
    const totalIssues = metrics.reduce((sum, m) => sum + m.issues.length, 0);
    const criticalIssues = metrics.reduce((sum, m) => 
      sum + m.issues.filter(i => i.severity === 'critical').length, 0);

    const sourceScores: Record<string, number> = {};
    for (const metric of metrics) {
      sourceScores[metric.source] = metric.overallQualityScore;
    }

    const overallScore = Object.values(sourceScores).length > 0 ?
      Object.values(sourceScores).reduce((sum, score) => sum + score, 0) / Object.values(sourceScores).length : 0;

    // Analyze trends
    const trendsAnalysis = this.analyzeTrends();

    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics);

    const report: QualityReport = {
      timestamp,
      overallScore,
      sourceScores,
      totalRecords,
      totalIssues,
      criticalIssues,
      recommendations,
      trendsAnalysis,
      detailedMetrics: this.getDetailedMetrics()
    };

    console.log(`[DataQuality] 📋 Quality Report Generated:`);
    console.log(`[DataQuality] 📊 Overall Score: ${overallScore.toFixed(1)}/100`);
    console.log(`[DataQuality] 📈 Total Records: ${totalRecords}, Issues: ${totalIssues} (${criticalIssues} critical)`);

    return report;
  }

  /**
   * Analyze quality trends over time
   */
  private analyzeTrends(): QualityReport['trendsAnalysis'] {
    if (this.historicalScores.length < 3) {
      return {
        qualityTrend: 'stable',
        bestPerformingSource: '',
        worstPerformingSource: '',
        commonIssues: []
      };
    }

    // Calculate trend (simple linear regression on recent scores)
    const recentScores = this.historicalScores.slice(-10);
    const avgScores: number[] = [];
    
    for (const entry of recentScores) {
      const scores = Object.values(entry.scores);
      avgScores.push(scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0);
    }

    const trend = this.calculateTrend(avgScores);
    
    // Find best and worst performing sources
    const currentScores = this.qualityMetrics;
    let bestSource = '';
    let worstSource = '';
    let bestScore = -1;
    let worstScore = 101;

    for (const [source, metrics] of currentScores) {
      if (metrics.overallQualityScore > bestScore) {
        bestScore = metrics.overallQualityScore;
        bestSource = source;
      }
      if (metrics.overallQualityScore < worstScore) {
        worstScore = metrics.overallQualityScore;
        worstSource = source;
      }
    }

    // Find common issues
    const issueTypeCount = new Map<string, number>();
    for (const metrics of currentScores.values()) {
      for (const issue of metrics.issues) {
        issueTypeCount.set(issue.type, (issueTypeCount.get(issue.type) || 0) + issue.count);
      }
    }

    const commonIssues = Array.from(issueTypeCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type);

    return {
      qualityTrend: trend,
      bestPerformingSource: bestSource,
      worstPerformingSource: worstSource,
      commonIssues
    };
  }

  /**
   * Calculate trend direction from score array
   */
  private calculateTrend(scores: number[]): 'improving' | 'declining' | 'stable' {
    if (scores.length < 3) return 'stable';

    const first = scores.slice(0, Math.floor(scores.length / 2));
    const last = scores.slice(Math.ceil(scores.length / 2));
    
    const firstAvg = first.reduce((a, b) => a + b, 0) / first.length;
    const lastAvg = last.reduce((a, b) => a + b, 0) / last.length;
    
    const diff = lastAvg - firstAvg;
    
    if (diff > 5) return 'improving';
    if (diff < -5) return 'declining';
    return 'stable';
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(metrics: DataQualityMetrics[]): string[] {
    const recommendations: string[] = [];

    for (const metric of metrics) {
      if (metric.overallQualityScore < 70) {
        recommendations.push(`${metric.source}: Overall quality is low (${metric.overallQualityScore.toFixed(1)}/100). Focus on data validation before ingestion.`);
      }

      if (metric.completenessScore < 80) {
        recommendations.push(`${metric.source}: Improve data completeness (${metric.completenessScore.toFixed(1)}/100). Many records are missing required fields.`);
      }

      if (metric.accuracyScore < 75) {
        recommendations.push(`${metric.source}: Address accuracy issues (${metric.accuracyScore.toFixed(1)}/100). Check coordinate validation and data formats.`);
      }

      if (metric.consistencyScore < 85) {
        recommendations.push(`${metric.source}: Improve data consistency (${metric.consistencyScore.toFixed(1)}/100). Standardize naming conventions and formats.`);
      }

      // Issue-specific recommendations
      const criticalIssues = metric.issues.filter(i => i.severity === 'critical');
      if (criticalIssues.length > 0) {
        recommendations.push(`${metric.source}: Address ${criticalIssues.length} critical data issues immediately.`);
      }
    }

    // General recommendations
    const totalRecords = metrics.reduce((sum, m) => sum + m.totalRecords, 0);
    const totalIssues = metrics.reduce((sum, m) => sum + m.issues.length, 0);
    
    if (totalIssues / totalRecords > 0.1) {
      recommendations.push('Consider implementing pre-processing validation before data ingestion.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Data quality is good across all sources. Continue monitoring for consistency.');
    }

    return recommendations;
  }

  /**
   * Get detailed metrics for all sources
   */
  public getDetailedMetrics(): Record<string, DataQualityMetrics> {
    const detailed: Record<string, DataQualityMetrics> = {};
    for (const [source, metrics] of this.qualityMetrics) {
      detailed[source] = { ...metrics, issues: [...metrics.issues] };
    }
    return detailed;
  }

  /**
   * Get metrics for a specific source
   */
  public getSourceMetrics(source: string): DataQualityMetrics | null {
    const metrics = this.qualityMetrics.get(source);
    return metrics ? { ...metrics, issues: [...metrics.issues] } : null;
  }

  /**
   * Reset metrics for testing or maintenance
   */
  public resetMetrics(): void {
    this.qualityMetrics.clear();
    this.historicalScores = [];
    console.log('[DataQuality] 🔄 Quality metrics reset');
  }
}

// Export singleton instance
export const dataQualityMonitor = DataQualityMonitor.getInstance();