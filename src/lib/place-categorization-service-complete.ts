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

  /**
   * Calculate confidence score for a place matching a specific category
   */
  private calculateCategoryConfidence(place: Place, category: PlaceCategory): CategoryConfidence {
    const name = (place.name || '').toLowerCase();
    const description = (place.description || '').toLowerCase();
    const vicinity = (place.vicinity || place.formatted_address || '').toLowerCase();
    const types = place.types || [];
    
    let score = 0;
    const reasons: string[] = [];
    const maxScore = 10; // Normalize to 0-1 range
    
    // 1. Check keywords in name (highest weight)
    for (const keyword of category.keywords) {
      const keywordLower = keyword.toLowerCase();
      if (name.includes(keywordLower)) {
        const bonus = name === keywordLower ? 2 : 1.5; // Exact match bonus
        score += bonus;
        reasons.push(`Name contains '${keyword}'`);
      }
    }
    
    // 2. Check keywords in description (medium weight)
    for (const keyword of category.keywords) {
      const keywordLower = keyword.toLowerCase();
      if (description.includes(keywordLower)) {
        score += 1;
        reasons.push(`Description mentions '${keyword}'`);
      }
    }
    
    // 3. Check Google/API types (high weight)
    if (category.googleTypes) {
      for (const type of types) {
        if (category.googleTypes.includes(type.toLowerCase())) {
          score += 2;
          reasons.push(`Type matches '${type}'`);
        }
      }
    }
    
    // 4. Check vicinity/address for location context (low weight)
    for (const keyword of category.keywords) {
      if (vicinity.includes(keyword.toLowerCase())) {
        score += 0.5;
        reasons.push(`Address context: '${keyword}'`);
      }
    }
    
    // 5. Category priority bonus (popular categories get slight boost)
    if (category.priority >= 9) {
      score += 0.3;
      reasons.push('High-priority category');
    } else if (category.priority >= 7) {
      score += 0.1;
      reasons.push('Popular category');
    }
    
    // 6. Advanced semantic analysis
    const semanticBonus = this.performSemanticAnalysis(place, category);
    score += semanticBonus.score;
    reasons.push(...semanticBonus.reasons);
    
    // Normalize score to 0-1 confidence
    const confidence = Math.min(score / maxScore, 1);
    
    return {
      category,
      confidence,
      reasons: reasons.slice(0, 5) // Limit to top 5 reasons
    };
  }
  
  /**
   * Perform advanced semantic analysis for better categorization
   */
  private performSemanticAnalysis(place: Place, category: PlaceCategory): { score: number; reasons: string[] } {
    const name = (place.name || '').toLowerCase();
    const description = (place.description || '').toLowerCase();
    const reasons: string[] = [];
    let score = 0;
    
    // Religious place patterns
    if (category.id.includes('temple') || category.id.includes('mosque') || category.id.includes('church')) {
      const religiousPatterns = [
        'sacred', 'holy', 'divine', 'blessed', 'ancient', 'pilgrimage',
        'worship', 'prayer', 'spiritual', 'devotion', 'saint', 'god', 'goddess'
      ];
      
      for (const pattern of religiousPatterns) {
        if (name.includes(pattern) || description.includes(pattern)) {
          score += 0.5;
          reasons.push(`Religious context: '${pattern}'`);
          break;
        }
      }
    }
    
    // Historical place patterns
    if (category.id.includes('fort') || category.id.includes('palace') || category.id.includes('monument')) {
      const historicalPatterns = [
        'ancient', 'medieval', 'century', 'built', 'constructed', 'heritage',
        'historical', 'archaeological', 'ruins', 'dynasty', 'empire', 'royal'
      ];
      
      for (const pattern of historicalPatterns) {
        if (name.includes(pattern) || description.includes(pattern)) {
          score += 0.5;
          reasons.push(`Historical context: '${pattern}'`);
          break;
        }
      }
    }
    
    // Nature place patterns
    if (category.id.includes('hill') || category.id.includes('waterfall') || category.id.includes('lake')) {
      const naturePatterns = [
        'natural', 'scenic', 'beautiful', 'breathtaking', 'panoramic',
        'pristine', 'serene', 'peaceful', 'altitude', 'elevation', 'wildlife'
      ];
      
      for (const pattern of naturePatterns) {
        if (name.includes(pattern) || description.includes(pattern)) {
          score += 0.5;
          reasons.push(`Nature context: '${pattern}'`);
          break;
        }
      }
    }
    
    // Cultural significance patterns
    if (category.id.includes('museum') || category.id.includes('cultural')) {
      const culturalPatterns = [
        'art', 'culture', 'exhibition', 'collection', 'gallery', 'artifacts',
        'history', 'heritage', 'traditional', 'contemporary', 'archive'
      ];
      
      for (const pattern of culturalPatterns) {
        if (name.includes(pattern) || description.includes(pattern)) {
          score += 0.5;
          reasons.push(`Cultural context: '${pattern}'`);
          break;
        }
      }
    }
    
    return { score, reasons };
  }
  
  /**
   * Generate suggested tags based on place data and detected category
   */
  private generateSuggestedTags(place: Place, category?: PlaceCategory): string[] {
    const tags = new Set<string>();
    const name = (place.name || '').toLowerCase();
    const description = (place.description || '').toLowerCase();
    
    // Add category-specific tags
    if (category) {
      tags.add(category.id);
      category.keywords.slice(0, 5).forEach(keyword => tags.add(keyword));
    }
    
    // Add contextual tags
    const contextualKeywords = [
      'heritage', 'ancient', 'modern', 'beautiful', 'historic', 'sacred',
      'popular', 'famous', 'scenic', 'cultural', 'traditional', 'royal',
      'architectural', 'spiritual', 'peaceful', 'bustling', 'vibrant'
    ];
    
    for (const keyword of contextualKeywords) {
      if (name.includes(keyword) || description.includes(keyword)) {
        tags.add(keyword);
      }
    }
    
    // Add location-based tags
    if (place.vicinity || place.formatted_address) {
      const address = (place.vicinity || place.formatted_address || '').toLowerCase();
      if (address.includes('old')) tags.add('old-city');
      if (address.includes('new')) tags.add('new-area');
      if (address.includes('center') || address.includes('central')) tags.add('city-center');
    }
    
    return Array.from(tags).slice(0, 10); // Limit to 10 tags
  }
  
  /**
   * Enrich a place with comprehensive categorization data
   */
  async enrichPlace(place: Place): Promise<PlaceEnrichment> {
    const startTime = Date.now();
    
    console.log(`[PlaceCategorization] 🎯 Enriching place: ${place.name}`);
    
    const prediction = await this.categorizePlace(place);
    const detectedCategory = prediction.primary?.category || null;
    const confidence = prediction.primary?.confidence || 0;
    
    // Determine item type
    const itemType = this.determineItemType(place, detectedCategory);
    
    // Generate enhanced description
    const enhancedDescription = this.generateEnhancedDescription(place, detectedCategory);
    
    // Generate cultural significance
    const culturalSignificance = this.assessCulturalSignificance(place, detectedCategory);
    
    // Generate visit recommendation
    const visitRecommendation = this.generateVisitRecommendation(place, detectedCategory, confidence);
    
    const processingTime = Date.now() - startTime;
    
    console.log(`[PlaceCategorization] ✨ Enrichment complete for ${place.name}`);
    
    return {
      originalPlace: place,
      detectedCategory,
      confidence,
      enrichedData: {
        enhancedDescription: enhancedDescription !== place.description ? enhancedDescription : undefined,
        suggestedTags: prediction.metadata.suggestedTags,
        itemType,
        subcategory: detectedCategory?.id,
        culturalSignificance,
        visitRecommendation
      },
      processing: {
        timestamp: new Date().toISOString(),
        processingTime,
        version: this.VERSION
      }
    };
  }
  
  /**
   * Determine item type (place/hotel/restaurant) from place data
   */
  private determineItemType(place: Place, category?: PlaceCategory | null): 'place' | 'hotel' | 'restaurant' {
    const name = (place.name || '').toLowerCase();
    const types = place.types || [];
    
    // Check explicit types first
    const hotelTypes = ['lodging', 'hotel', 'accommodation', 'resort', 'inn', 'hostel'];
    const restaurantTypes = ['restaurant', 'food', 'meal_takeaway', 'cafe', 'bar', 'bakery'];
    
    if (types.some(type => hotelTypes.includes(type.toLowerCase())) ||
        ['hotel', 'resort', 'inn', 'lodge', 'guest house'].some(word => name.includes(word))) {
      return 'hotel';
    }
    
    if (types.some(type => restaurantTypes.includes(type.toLowerCase())) ||
        ['restaurant', 'cafe', 'bar', 'bistro', 'diner', 'dhaba'].some(word => name.includes(word))) {
      return 'restaurant';
    }
    
    // Everything else is a place
    return 'place';
  }
  
  /**
   * Generate enhanced description based on categorization
   */
  private generateEnhancedDescription(place: Place, category?: PlaceCategory | null): string {
    if (place.description && place.description.length > 50) {
      return place.description; // Keep good existing descriptions
    }
    
    const name = place.name || 'This place';
    
    if (!category) {
      return `${name} is an interesting location worth exploring.`;
    }
    
    const templates = {
      'hindu-temple': `${name} is a Hindu temple that holds spiritual significance for devotees and offers a glimpse into India's rich religious heritage.`,
      'mosque': `${name} is a mosque that serves as a center of Islamic worship and community gathering.`,
      'church': `${name} is a Christian church featuring religious architecture and serving as a place of worship.`,
      'fort': `${name} is a historic fort that showcases military architecture and offers insights into the region's defensive history.`,
      'palace': `${name} is a royal palace that exemplifies regal architecture and provides a window into monarchic heritage.`,
      'monument': `${name} is a monument that commemorates important historical events or figures.`,
      'museum': `${name} is a museum that houses collections showcasing art, history, or cultural artifacts.`,
      'hill-station': `${name} is a hill station offering scenic mountain views and a refreshing climate.`,
      'waterfall': `${name} is a natural waterfall that creates a spectacular display of cascading water.`,
      'lake': `${name} is a beautiful lake that provides serene water views and recreational opportunities.`,
      'garden': `${name} is a landscaped garden featuring beautiful flora and peaceful walking paths.`,
      'market': `${name} is a vibrant market where you can experience local culture and find unique goods.`
    };
    
    return templates[category.id as keyof typeof templates] || 
           `${name} is a ${category.name.toLowerCase()} that offers visitors a unique experience.`;
  }
  
  /**
   * Assess cultural significance of a place
   */
  private assessCulturalSignificance(place: Place, category?: PlaceCategory | null): string | undefined {
    if (!category) return undefined;
    
    const name = (place.name || '').toLowerCase();
    const description = (place.description || '').toLowerCase();
    
    // Check for heritage keywords
    const heritageKeywords = [
      'unesco', 'world heritage', 'ancient', 'archaeological', 'historical',
      'heritage', 'cultural', 'traditional', 'centuries old', 'medieval'
    ];
    
    const hasHeritage = heritageKeywords.some(keyword => 
      name.includes(keyword) || description.includes(keyword)
    );
    
    if (hasHeritage) {
      return 'This place holds significant cultural and historical importance.';
    }
    
    // Category-specific significance
    if (category.id.includes('temple') || category.id.includes('mosque') || category.id.includes('church')) {
      return 'This religious site holds spiritual significance for the local community.';
    }
    
    if (category.id.includes('fort') || category.id.includes('palace')) {
      return 'This site represents the architectural and political heritage of the region.';
    }
    
    return undefined;
  }
  
  /**
   * Generate visit recommendation based on place characteristics
   */
  private generateVisitRecommendation(place: Place, category?: PlaceCategory | null, confidence?: number): string | undefined {
    if (!category || (confidence || 0) < 0.3) return undefined;
    
    const recommendations = {
      'hindu-temple': 'Best visited during morning hours for prayers and peaceful atmosphere. Dress modestly and remove shoes before entering.',
      'mosque': 'Visitors welcome outside prayer times. Dress conservatively and be respectful of worship practices.',
      'church': 'Open for visitors during non-service hours. Maintain quiet demeanor and respectful behavior.',
      'fort': 'Visit during cooler hours (early morning or evening) for comfortable exploration. Wear comfortable walking shoes.',
      'palace': 'Allow sufficient time to explore the architecture and grounds. Photography may have restrictions in certain areas.',
      'museum': 'Plan 1-2 hours for a thorough visit. Check opening hours and any special exhibitions.',
      'hill-station': 'Best visited during pleasant weather. Carry warm clothing if visiting during winter months.',
      'waterfall': 'Ideal during monsoon and post-monsoon seasons. Exercise caution on wet rocks and paths.',
      'lake': 'Perfect for morning or evening visits. Consider boating or photography opportunities.',
      'garden': 'Most beautiful during flowering seasons. Great for leisurely walks and photography.',
      'market': 'Visit during operating hours for the full experience. Perfect for shopping local goods and experiencing culture.',
      'national-park': 'Early morning visits offer best wildlife viewing opportunities. Follow park guidelines and carry water.'
    };
    
    return recommendations[category.id as keyof typeof recommendations];
  }
}

// Export singleton instance
export const placeCategorizationService = new PlaceCategorizationService();

// Convenience functions
export async function categorizePlace(place: Place): Promise<CategoryPrediction> {
  return placeCategorizationService.categorizePlace(place);
}

export async function enrichPlace(place: Place): Promise<PlaceEnrichment> {
  return placeCategorizationService.enrichPlace(place);
}

/**
 * Smart place filtering by category
 */
export function filterPlacesByCategory(
  places: Place[],
  categoryId: string,
  minConfidence: number = 0.5
): Place[] {
  return places.filter(place => {
    const category = detectPlaceCategory(place);
    return category?.id === categoryId;
  });
}

/**
 * Get category statistics for a set of places
 */
export function getCategoryStatistics(places: Place[]): {
  totalPlaces: number;
  categorized: number;
  uncategorized: number;
  categoryBreakdown: { [categoryId: string]: number };
  confidence: {
    high: number;
    medium: number;
    low: number;
  };
} {
  const stats = {
    totalPlaces: places.length,
    categorized: 0,
    uncategorized: 0,
    categoryBreakdown: {} as { [categoryId: string]: number },
    confidence: { high: 0, medium: 0, low: 0 }
  };
  
  for (const place of places) {
    const category = detectPlaceCategory(place);
    
    if (category) {
      stats.categorized++;
      stats.categoryBreakdown[category.id] = (stats.categoryBreakdown[category.id] || 0) + 1;
      
      // This is a simplified confidence assessment
      if (place.name && place.name.toLowerCase().includes(category.keywords[0])) {
        stats.confidence.high++;
      } else if (place.types && place.types.length > 0) {
        stats.confidence.medium++;
      } else {
        stats.confidence.low++;
      }
    } else {
      stats.uncategorized++;
    }
  }
  
  return stats;
}