/**
 * Advanced Data Quality Filter
 * Filters out irrelevant places and focuses on tourist-worthy locations
 */

import type { Place } from './types';

export interface QualityScore {
  score: number; // 0-1 scale
  reasons: string[];
  category: 'excellent' | 'good' | 'fair' | 'poor' | 'irrelevant';
}

export interface FilterConfig {
  minScore: number;
  excludeKeywords: string[];
  priorityCategories: string[];
  maxResults: number;
}

// Keywords that indicate irrelevant places for tourists
const IRRELEVANT_KEYWORDS = [
  // Business/Office spaces
  'advocate', 'lawyer', 'attorney', 'office', 'consultancy', 'clinic', 'doctor', 
  'medical', 'hospital', 'pharmacy', 'dental', 'physiotherapy',
  
  // Residential
  'pg', 'paying guest', 'hostel', 'apartment', 'flat', 'residence', 'home',
  'villa', 'bungalow', 'society', 'colony',
  
  // Personal services
  'salon', 'barber', 'parlour', 'spa', 'gym', 'fitness', 'yoga studio',
  'beauty', 'massage', 'nail', 'hair',
  
  // Utilities/Infrastructure
  'atm', 'bank', 'petrol pump', 'gas station', 'service station',
  'workshop', 'garage', 'repair', 'mechanic',
  
  // Commercial spaces
  'shop', 'store', 'market stall', 'booth', 'kiosk', 'vendor',
  'wholesale', 'warehouse', 'godown', 'factory',
  
  // Food-related (too specific/not tourist relevant)
  'kitchen', 'dhaba', 'tiffin', 'mess', 'canteen', 'food court',
  
  // Transportation (not places to visit)
  'bus stop', 'taxi stand', 'auto stand', 'parking', 'fuel',
  
  // Educational (unless specifically tourist relevant)
  'school', 'college', 'institute', 'coaching', 'tuition', 'academy',
  
  // Vague/incomplete names
  'new', 'old', 'near', 'opposite', 'behind', 'front', 'side',
  'no name', 'unnamed', 'unknown'
];

// Keywords that indicate high-quality tourist places
const PRIORITY_KEYWORDS = [
  // Tourist attractions
  'palace', 'fort', 'castle', 'monument', 'statue', 'memorial',
  'museum', 'gallery', 'exhibition', 'temple', 'church', 'mosque',
  'shrine', 'cathedral', 'monastery', 'abbey',
  
  // Natural attractions
  'park', 'garden', 'lake', 'river', 'waterfall', 'hill', 'mountain',
  'valley', 'forest', 'wildlife', 'sanctuary', 'reserve', 'beach',
  'island', 'cave', 'spring', 'pond',
  
  // Cultural places
  'heritage', 'historic', 'cultural', 'traditional', 'ancient',
  'archaeological', 'architectural',
  
  // Entertainment & Recreation
  'theater', 'cinema', 'entertainment', 'amusement', 'theme park',
  'zoo', 'aquarium', 'planetarium', 'observatory',
  
  // Hotels & Restaurants (quality ones)
  'hotel', 'resort', 'lodge', 'guest house', 'restaurant', 'cafe',
  'rooftop', 'fine dining', 'buffet', 'multi cuisine',
  
  // Shopping (tourist relevant)
  'mall', 'bazaar', 'market', 'emporium', 'handicraft', 'souvenir',
  'shopping complex', 'plaza'
];

// Tourist-relevant categories with priority scoring
const CATEGORY_SCORES: Record<string, number> = {
  'historical': 0.9,
  'monument': 0.9,
  'temple': 0.8,
  'park': 0.8,
  'museum': 0.8,
  'palace': 0.9,
  'fort': 0.9,
  'hotel': 0.7,
  'restaurant': 0.6,
  'cafe': 0.5,
  'market': 0.6,
  'garden': 0.7,
  'lake': 0.8,
  'viewpoint': 0.8,
  'cultural': 0.7,
  'entertainment': 0.6,
  'shopping': 0.5,
  'place': 0.4, // Generic, needs context
  'misc': 0.2
};

class DataQualityFilter {
  /**
   * Calculate quality score for a place
   */
  calculateQualityScore(place: Place): QualityScore {
    const reasons: string[] = [];
    let score = 0.5; // Base score
    
    const name = (place.name || '').toLowerCase();
    const description = (place.description || '').toLowerCase();
    const category = (place.category || '').toLowerCase();
    const address = (place.address || '').toLowerCase();
    const fullText = `${name} ${description} ${category} ${address}`;
    
    // 1. Check for irrelevant keywords (major penalty)
    const irrelevantMatches = IRRELEVANT_KEYWORDS.filter(keyword => 
      fullText.includes(keyword.toLowerCase())
    );
    
    if (irrelevantMatches.length > 0) {
      score -= 0.6;
      reasons.push(`Contains irrelevant keywords: ${irrelevantMatches.join(', ')}`);
    }
    
    // 2. Check for priority keywords (bonus)
    const priorityMatches = PRIORITY_KEYWORDS.filter(keyword => 
      fullText.includes(keyword.toLowerCase())
    );
    
    if (priorityMatches.length > 0) {
      score += 0.3 * Math.min(priorityMatches.length, 3) / 3;
      reasons.push(`Contains priority keywords: ${priorityMatches.slice(0, 3).join(', ')}`);
    }
    
    // 3. Category-based scoring
    const categoryScore = CATEGORY_SCORES[category] || 0.3;
    score += (categoryScore - 0.5) * 0.5; // Weighted category influence
    reasons.push(`Category '${category}' score: ${categoryScore}`);
    
    // 4. Rating bonus (if available)
    if (place.rating && place.rating > 0) {
      const ratingBonus = Math.min((place.rating - 3) * 0.1, 0.2);
      score += ratingBonus;
      if (ratingBonus > 0) {
        reasons.push(`High rating bonus: ${place.rating}/5`);
      }
    }
    
    // 5. Name quality check
    if (name.length < 3) {
      score -= 0.2;
      reasons.push('Very short name');
    } else if (name.length > 50) {
      score -= 0.1;
      reasons.push('Unusually long name');
    }
    
    // 6. Description quality
    if (description && description.length > 20) {
      score += 0.1;
      reasons.push('Has detailed description');
    }
    
    // 7. Address quality
    if (address && address.length > 10) {
      score += 0.05;
      reasons.push('Has detailed address');
    }
    
    // Normalize score to 0-1 range
    score = Math.max(0, Math.min(1, score));
    
    // Determine category
    let category_label: QualityScore['category'];
    if (score >= 0.8) category_label = 'excellent';
    else if (score >= 0.6) category_label = 'good';
    else if (score >= 0.4) category_label = 'fair';
    else if (score >= 0.2) category_label = 'poor';
    else category_label = 'irrelevant';
    
    return {
      score,
      reasons,
      category: category_label
    };
  }
  
  /**
   * Filter places based on quality score
   */
  filterPlaces(places: Place[], config: FilterConfig): Place[] {
    const scored = places.map(place => ({
      place,
      quality: this.calculateQualityScore(place)
    }));
    
    // Filter by minimum score
    const filtered = scored.filter(item => 
      item.quality.score >= config.minScore &&
      item.quality.category !== 'irrelevant'
    );
    
    // Sort by quality score (highest first)
    const sorted = filtered.sort((a, b) => b.quality.score - a.quality.score);
    
    // Apply result limit
    const limited = sorted.slice(0, config.maxResults);
    
    console.log(`[DataQualityFilter] Filtered ${places.length} → ${limited.length} places`);
    console.log(`[DataQualityFilter] Quality distribution:`, {
      excellent: filtered.filter(f => f.quality.category === 'excellent').length,
      good: filtered.filter(f => f.quality.category === 'good').length,
      fair: filtered.filter(f => f.quality.category === 'fair').length,
      poor: filtered.filter(f => f.quality.category === 'poor').length,
    });
    
    return limited.map(item => ({
      ...item.place,
      qualityScore: item.quality.score,
      qualityCategory: item.quality.category,
      qualityReasons: item.quality.reasons
    }));
  }
  
  /**
   * Get default filter configuration for tourists
   */
  getTouristConfig(): FilterConfig {
    return {
      minScore: 0.4, // Only fair quality and above
      excludeKeywords: IRRELEVANT_KEYWORDS,
      priorityCategories: ['historical', 'monument', 'temple', 'park', 'hotel', 'restaurant'],
      maxResults: 100 // Reasonable limit
    };
  }
  
  /**
   * Get strict filter configuration for high-quality places only
   */
  getStrictConfig(): FilterConfig {
    return {
      minScore: 0.6, // Only good quality and above
      excludeKeywords: IRRELEVANT_KEYWORDS,
      priorityCategories: ['historical', 'monument', 'temple', 'park', 'palace', 'fort'],
      maxResults: 50
    };
  }
}

// Singleton instance
export const dataQualityFilter = new DataQualityFilter();

// Convenience functions
export function filterTouristPlaces(places: Place[]): Place[] {
  return dataQualityFilter.filterPlaces(places, dataQualityFilter.getTouristConfig());
}

export function filterHighQualityPlaces(places: Place[]): Place[] {
  return dataQualityFilter.filterPlaces(places, dataQualityFilter.getStrictConfig());
}

export function getPlaceQualityScore(place: Place): QualityScore {
  return dataQualityFilter.calculateQualityScore(place);
}