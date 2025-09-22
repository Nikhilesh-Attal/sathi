/**
 * Enhanced Place Categorizer
 * Adds precise categorization to the auto-ingestion flow for improved filtering
 */

import { Place } from './types';
import { EnhancedPlaceType, detectEnhancedPlaceType, ENHANCED_PLACE_TYPES } from './enhanced-place-types';

export interface EnhancedPlaceData {
  placeType: EnhancedPlaceType | null;
  category: string;
  itemType: 'place' | 'hotel' | 'restaurant';
  subcategory?: string;
  tags: string[];
  qualityScore: number; // 0-100 score for quality filtering
}

/**
 * Enhanced categorizer that intelligently maps places to types
 */
export function categorizePlaceWithEnhancedTypes(place: Place): EnhancedPlaceData {
  // First attempt to detect using scoring algorithm
  const detectedType = detectEnhancedPlaceType(place);
  
  // Create default result
  const result: EnhancedPlaceData = {
    placeType: detectedType,
    category: detectedType?.category || 'attraction',
    itemType: (detectedType?.id.includes('hotel') || detectedType?.category === 'accommodation') 
      ? 'hotel' 
      : (detectedType?.category === 'food' ? 'restaurant' : 'place'),
    subcategory: detectedType?.subcategory,
    tags: [],
    qualityScore: 75 // Default quality score
  };
  
  // Generate tags from detected type and place data
  result.tags = generateTags(place, detectedType);
  
  // Calculate quality score
  result.qualityScore = calculateQualityScore(place);
  
  return result;
}

/**
 * Generate tags for better searchability
 */
function generateTags(place: Place, detectedType: EnhancedPlaceType | null): string[] {
  const tags = new Set<string>();
  
  // Add base tags
  if (detectedType) {
    // Add from detected type
    tags.add(detectedType.category);
    tags.add(detectedType.subcategory);
    tags.add(detectedType.id);
    detectedType.keywords.forEach(k => tags.add(k.toLowerCase()));
  }
  
  // Add from place types if present
  if (place.types && Array.isArray(place.types)) {
    place.types.forEach(type => tags.add(type.toLowerCase()));
  }
  
  // Add geographic context if available
  if (place.country) tags.add(place.country.toLowerCase());
  if (place.city) tags.add(place.city.toLowerCase());
  
  // Extract any keywords from name or description
  const nameKeywords = extractKeywords(place.name, 3);
  const descKeywords = place.description ? extractKeywords(place.description, 5) : [];
  
  nameKeywords.forEach(k => tags.add(k));
  descKeywords.forEach(k => tags.add(k));
  
  // Filter out low-value tags
  const lowValueTags = ['the', 'and', 'or', 'place', 'a', 'an', 'in', 'of', 'for', 'to'];
  const filteredTags = Array.from(tags).filter(tag => 
    tag.length > 2 && !lowValueTags.includes(tag.toLowerCase())
  );
  
  return filteredTags.slice(0, 20); // Limit to 20 tags
}

/**
 * Extract meaningful keywords from text
 */
function extractKeywords(text: string, limit: number): string[] {
  if (!text) return [];
  
  // Tokenize and normalize
  const tokens = text.toLowerCase()
    .replace(/[^\w\s]/gi, '') // Remove punctuation
    .split(/\s+/)
    .filter(t => t.length > 3); // Filter out short words
  
  // Remove stopwords and common terms
  const stopwords = [
    'the', 'and', 'a', 'an', 'in', 'of', 'for', 'to', 'with', 'on', 'at', 'from',
    'place', 'near', 'around', 'about', 'located', 'area'
  ];
  
  return tokens
    .filter(token => !stopwords.includes(token))
    .slice(0, limit);
}

/**
 * Calculate quality score for filtering
 * Returns 0-100 score where:
 * - 0-40: Poor quality (incomplete/minimal data)
 * - 41-70: Fair quality (basic info)
 * - 71-85: Good quality (complete basic info)
 * - 86-100: Excellent quality (comprehensive info)
 */
function calculateQualityScore(place: Place): number {
  let score = 0;
  
  // Basic information (name, coordinates)
  if (place.name && place.name.length > 3) score += 20;
  
  if (place.point?.lat && place.point?.lon) score += 20;
  else if (place.geometry?.location?.lat && place.geometry?.location?.lng) score += 20;
  
  // Description
  if (place.description) {
    if (place.description.length > 200) score += 20; // Comprehensive description
    else if (place.description.length > 50) score += 10; // Basic description
    else if (place.description.length > 0) score += 5; // Minimal description
  }
  
  // Has types
  if (place.types && place.types.length > 0) score += 10;
  
  // Has ratings
  if (typeof place.rating === 'number') {
    if (place.rating >= 4.0) score += 15;
    else if (place.rating >= 3.0) score += 10;
    else score += 5;
  }
  
  // Has address or vicinity
  if (place.vicinity || place.formatted_address) score += 10;
  
  // Has photos
  if (place.photoUrl || (place.photos && place.photos.length > 0)) score += 5;
  
  // Cap at 100
  return Math.min(Math.max(score, 0), 100);
}

/**
 * Get quality level from score
 */
export function getQualityLevel(score: number): 'poor' | 'fair' | 'good' | 'excellent' {
  if (score >= 86) return 'excellent';
  if (score >= 71) return 'good';
  if (score >= 41) return 'fair';
  return 'poor';
}

/**
 * Filter places by quality level
 */
export function filterPlacesByQuality(
  places: Place[], 
  minQuality: 'all' | 'fair' | 'good' | 'excellent' = 'fair'
): Place[] {
  if (minQuality === 'all') return places;
  
  const qualityThresholds = {
    poor: 0,
    fair: 41,
    good: 71,
    excellent: 86
  };
  
  const threshold = qualityThresholds[minQuality];
  
  return places.filter(place => calculateQualityScore(place) >= threshold);
}