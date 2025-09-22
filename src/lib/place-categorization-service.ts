/**
 * Intelligent Place Categorization Service
 * Advanced AI-powered place detection and categorization system
 */

import { detectPlaceCategory, getAllCategories, getCategoryById, type PlaceCategory } from './place-categories';
import type { Place } from './types';

export interface CategoryConfidence {
  category: PlaceCategory;
  confidence: number;
  reasons: string[];
}

export interface CategoryPrediction {
  primary: CategoryConfidence;
  alternatives: CategoryConfidence[];
  metadata: {
    processingTime: number;
    totalCategories: number;
    confidence: 'high' | 'medium' | 'low';
    suggestedTags: string[];
  };
}

export interface PlaceEnrichment {
  originalPlace: Place;
  detectedCategory: PlaceCategory | null;
  confidence: number;
  enrichedData: {
    enhancedDescription?: string;
    suggestedTags: string[];
    itemType: 'place' | 'hotel' | 'restaurant';
    subcategory?: string;
    culturalSignificance?: string;
    visitRecommendation?: string;
  };
  processing: {
    timestamp: string;
    processingTime: number;
    version: string;
  };
}

class PlaceCategorizationService {
  private readonly VERSION = '1.0.0';
  
  /**
   * Categorize a place with confidence scoring and detailed analysis
   */
  async categorizePlace(place: Place): Promise<CategoryPrediction> {
    const startTime = Date.now();
    
    console.log(`[PlaceCategorization] 🧠 Analyzing place: ${place.name}`);
    
    const allCategories = getAllCategories();
    const categoryScores: CategoryConfidence[] = [];
    
    for (const category of allCategories) {
      const confidence = this.calculateCategoryConfidence(place, category);
      
      if (confidence.confidence > 0) {
        categoryScores.push(confidence);
      }
    }
    
    // Sort by confidence score
    categoryScores.sort((a, b) => b.confidence - a.confidence);
    
    const processingTime = Date.now() - startTime;
    
    // Determine overall confidence level
    const topConfidence = categoryScores[0]?.confidence || 0;
    const confidenceLevel = topConfidence >= 0.8 ? 'high' : 
                           topConfidence >= 0.5 ? 'medium' : 'low';
    
    const primary = categoryScores[0];
    const alternatives = categoryScores.slice(1, 4); // Top 3 alternatives
    
    // Generate suggested tags
    const suggestedTags = this.generateSuggestedTags(place, primary?.category);
    
    console.log(`[PlaceCategorization] ✅ Analysis complete: ${primary?.category.name || 'No category'} (${Math.round(primary?.confidence * 100 || 0)}%)`);
    
    return {
      primary,
      alternatives,
      metadata: {
        processingTime,
        totalCategories: allCategories.length,
        confidence: confidenceLevel,
        suggestedTags
      }
    };
  }
