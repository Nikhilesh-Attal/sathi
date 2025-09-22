/**
 * Enhanced Place Type System
 * Comprehensive categorization for better filtering and discovery
 */

export interface EnhancedPlaceType {
  id: string;
  name: string;
  category: 'accommodation' | 'food' | 'attraction' | 'entertainment' | 'shopping' | 'transport' | 'service';
  subcategory: string;
  icon: string;
  keywords: string[];
  searchTerms: string[];
}

export const ENHANCED_PLACE_TYPES: EnhancedPlaceType[] = [
  // ACCOMMODATION
  {
    id: 'luxury-hotel',
    name: 'Luxury Hotel',
    category: 'accommodation',
    subcategory: 'hotel',
    icon: '🏨',
    keywords: ['luxury', 'premium', 'five star', '5 star', 'deluxe', 'suite', 'resort'],
    searchTerms: ['luxury hotel', 'premium hotel', '5 star hotel', 'deluxe hotel']
  },
  {
    id: 'budget-hotel',
    name: 'Budget Hotel',
    category: 'accommodation',
    subcategory: 'hotel',
    icon: '🏨',
    keywords: ['budget', 'economic', 'affordable', 'cheap', 'value', 'lodge'],
    searchTerms: ['budget hotel', 'cheap hotel', 'affordable stay', 'lodge']
  },
  {
    id: 'heritage-hotel',
    name: 'Heritage Hotel',
    category: 'accommodation',
    subcategory: 'hotel',
    icon: '🏛️',
    keywords: ['heritage', 'palace', 'haveli', 'fort', 'historical', 'royal'],
    searchTerms: ['heritage hotel', 'palace hotel', 'haveli', 'fort hotel', 'royal hotel']
  },
  {
    id: 'resort',
    name: 'Resort',
    category: 'accommodation',
    subcategory: 'resort',
    icon: '🏖️',
    keywords: ['resort', 'spa', 'wellness', 'beach', 'hill station', 'retreat'],
    searchTerms: ['resort', 'spa resort', 'beach resort', 'hill resort']
  },
  {
    id: 'guesthouse',
    name: 'Guest House',
    category: 'accommodation',
    subcategory: 'guesthouse',
    icon: '🏠',
    keywords: ['guest house', 'guesthouse', 'homestay', 'b&b', 'bed breakfast'],
    searchTerms: ['guest house', 'homestay', 'bed and breakfast']
  },
  {
    id: 'hostel',
    name: 'Hostel',
    category: 'accommodation',
    subcategory: 'hostel',
    icon: '🎒',
    keywords: ['hostel', 'backpacker', 'dormitory', 'shared', 'youth'],
    searchTerms: ['hostel', 'backpacker hostel', 'youth hostel']
  },

  // FOOD & DINING
  {
    id: 'fine-dining',
    name: 'Fine Dining Restaurant',
    category: 'food',
    subcategory: 'restaurant',
    icon: '🍽️',
    keywords: ['fine dining', 'upscale', 'gourmet', 'chef', 'michelin', 'elegant'],
    searchTerms: ['fine dining', 'upscale restaurant', 'gourmet restaurant']
  },
  {
    id: 'casual-dining',
    name: 'Casual Dining',
    category: 'food',
    subcategory: 'restaurant',
    icon: '🍜',
    keywords: ['casual', 'family', 'comfort food', 'local', 'traditional'],
    searchTerms: ['casual dining', 'family restaurant', 'local restaurant']
  },
  {
    id: 'street-food',
    name: 'Street Food',
    category: 'food',
    subcategory: 'street-food',
    icon: '🌮',
    keywords: ['street food', 'chaat', 'local', 'vendor', 'authentic', 'quick'],
    searchTerms: ['street food', 'chaat', 'local food', 'food stall']
  },
  {
    id: 'cafe',
    name: 'Cafe',
    category: 'food',
    subcategory: 'cafe',
    icon: '☕',
    keywords: ['cafe', 'coffee', 'tea', 'bakery', 'pastry', 'light meals'],
    searchTerms: ['cafe', 'coffee shop', 'tea house', 'bakery']
  },
  {
    id: 'dhaba',
    name: 'Dhaba',
    category: 'food',
    subcategory: 'dhaba',
    icon: '🍛',
    keywords: ['dhaba', 'punjabi', 'highway', 'truck stop', 'authentic', 'roadside'],
    searchTerms: ['dhaba', 'punjabi dhaba', 'highway dhaba']
  },
  {
    id: 'vegetarian',
    name: 'Vegetarian Restaurant',
    category: 'food',
    subcategory: 'restaurant',
    icon: '🥗',
    keywords: ['vegetarian', 'veg', 'plant based', 'pure veg', 'jain food'],
    searchTerms: ['vegetarian restaurant', 'veg restaurant', 'pure veg']
  },

  // ATTRACTIONS - HISTORICAL
  {
    id: 'fort',
    name: 'Fort',
    category: 'attraction',
    subcategory: 'historical',
    icon: '🏰',
    keywords: ['fort', 'fortress', 'qila', 'citadel', 'stronghold', 'rampart'],
    searchTerms: ['fort', 'fortress', 'qila', 'historical fort']
  },
  {
    id: 'palace',
    name: 'Palace',
    category: 'attraction',
    subcategory: 'historical',
    icon: '👑',
    keywords: ['palace', 'mahal', 'royal', 'king', 'queen', 'maharaja'],
    searchTerms: ['palace', 'mahal', 'royal palace', 'king palace']
  },
  {
    id: 'monument',
    name: 'Monument',
    category: 'attraction',
    subcategory: 'historical',
    icon: '🗿',
    keywords: ['monument', 'memorial', 'statue', 'pillar', 'arch', 'gate'],
    searchTerms: ['monument', 'memorial', 'historical monument']
  },
  {
    id: 'museum',
    name: 'Museum',
    category: 'attraction',
    subcategory: 'cultural',
    icon: '🏛️',
    keywords: ['museum', 'gallery', 'exhibition', 'art', 'history', 'culture'],
    searchTerms: ['museum', 'art gallery', 'cultural center']
  },

  // ATTRACTIONS - RELIGIOUS
  {
    id: 'hindu-temple',
    name: 'Hindu Temple',
    category: 'attraction',
    subcategory: 'religious',
    icon: '🕉️',
    keywords: ['temple', 'mandir', 'hindu', 'shiva', 'vishnu', 'devi', 'hanuman'],
    searchTerms: ['temple', 'mandir', 'hindu temple', 'shiva temple']
  },
  {
    id: 'mosque',
    name: 'Mosque',
    category: 'attraction',
    subcategory: 'religious',
    icon: '🕌',
    keywords: ['mosque', 'masjid', 'islamic', 'muslim', 'minaret', 'dome'],
    searchTerms: ['mosque', 'masjid', 'islamic place']
  },
  {
    id: 'church',
    name: 'Church',
    category: 'attraction',
    subcategory: 'religious',
    icon: '⛪',
    keywords: ['church', 'cathedral', 'christian', 'chapel', 'basilica'],
    searchTerms: ['church', 'cathedral', 'christian place']
  },
  {
    id: 'gurudwara',
    name: 'Gurudwara',
    category: 'attraction',
    subcategory: 'religious',
    icon: '🪯',
    keywords: ['gurudwara', 'sikh', 'guru', 'langar', 'sahib'],
    searchTerms: ['gurudwara', 'sikh temple', 'sikh place']
  },

  // ATTRACTIONS - NATURAL
  {
    id: 'hill-station',
    name: 'Hill Station',
    category: 'attraction',
    subcategory: 'natural',
    icon: '⛰️',
    keywords: ['hill station', 'mountain', 'peak', 'hill', 'altitude', 'scenic'],
    searchTerms: ['hill station', 'mountain view', 'hill top', 'scenic point']
  },
  {
    id: 'waterfall',
    name: 'Waterfall',
    category: 'attraction',
    subcategory: 'natural',
    icon: '💦',
    keywords: ['waterfall', 'falls', 'cascade', 'water', 'stream', 'nature'],
    searchTerms: ['waterfall', 'falls', 'water cascade']
  },
  {
    id: 'lake',
    name: 'Lake',
    category: 'attraction',
    subcategory: 'natural',
    icon: '🏞️',
    keywords: ['lake', 'water body', 'reservoir', 'pond', 'water', 'boating'],
    searchTerms: ['lake', 'water body', 'scenic lake']
  },
  {
    id: 'garden',
    name: 'Garden',
    category: 'attraction',
    subcategory: 'natural',
    icon: '🌳',
    keywords: ['garden', 'park', 'botanical', 'green', 'trees', 'flowers'],
    searchTerms: ['garden', 'park', 'botanical garden', 'green space']
  },
  {
    id: 'beach',
    name: 'Beach',
    category: 'attraction',
    subcategory: 'natural',
    icon: '🏖️',
    keywords: ['beach', 'shore', 'sand', 'ocean', 'sea', 'coastal'],
    searchTerms: ['beach', 'seashore', 'coastal area']
  },
  {
    id: 'wildlife-sanctuary',
    name: 'Wildlife Sanctuary',
    category: 'attraction',
    subcategory: 'natural',
    icon: '🦌',
    keywords: ['wildlife', 'sanctuary', 'national park', 'safari', 'animals', 'reserve'],
    searchTerms: ['wildlife sanctuary', 'national park', 'safari', 'animal reserve']
  },

  // SHOPPING
  {
    id: 'market',
    name: 'Market',
    category: 'shopping',
    subcategory: 'traditional',
    icon: '🛒',
    keywords: ['market', 'bazaar', 'shopping', 'local', 'traditional', 'handicraft'],
    searchTerms: ['market', 'bazaar', 'local market', 'shopping area']
  },
  {
    id: 'mall',
    name: 'Shopping Mall',
    category: 'shopping',
    subcategory: 'modern',
    icon: '🏬',
    keywords: ['mall', 'shopping center', 'department store', 'brand', 'modern'],
    searchTerms: ['shopping mall', 'mall', 'shopping center']
  },

  // ENTERTAINMENT
  {
    id: 'cinema',
    name: 'Cinema',
    category: 'entertainment',
    subcategory: 'indoor',
    icon: '🎬',
    keywords: ['cinema', 'movie', 'film', 'theater', 'multiplex', 'show'],
    searchTerms: ['cinema', 'movie theater', 'film hall']
  },
  {
    id: 'adventure-sports',
    name: 'Adventure Sports',
    category: 'entertainment',
    subcategory: 'outdoor',
    icon: '🏔️',
    keywords: ['adventure', 'sports', 'trekking', 'hiking', 'climbing', 'zip line'],
    searchTerms: ['adventure sports', 'trekking', 'hiking', 'outdoor activities']
  }
];

/**
 * Get place type by ID
 */
export function getPlaceTypeById(id: string): EnhancedPlaceType | undefined {
  return ENHANCED_PLACE_TYPES.find(type => type.id === id);
}

/**
 * Get all place types by category
 */
export function getPlaceTypesByCategory(category: string): EnhancedPlaceType[] {
  return ENHANCED_PLACE_TYPES.filter(type => type.category === category);
}

/**
 * Get all available categories
 */
export function getAvailableCategories(): string[] {
  return [...new Set(ENHANCED_PLACE_TYPES.map(type => type.category))];
}

/**
 * Detect place type from place data using enhanced matching
 */
export function detectEnhancedPlaceType(place: any): EnhancedPlaceType | null {
  const name = (place.name || '').toLowerCase();
  const description = (place.description || place.vicinity || '').toLowerCase();
  const types = (place.types || []).map((t: string) => t.toLowerCase());
  
  // Calculate confidence score for each place type
  const scores = ENHANCED_PLACE_TYPES.map(placeType => {
    let score = 0;
    
    // Check keywords in name (highest weight)
    placeType.keywords.forEach(keyword => {
      if (name.includes(keyword.toLowerCase())) {
        score += 10;
      }
    });
    
    // Check keywords in description (medium weight)
    placeType.keywords.forEach(keyword => {
      if (description.includes(keyword.toLowerCase())) {
        score += 5;
      }
    });
    
    // Check types array (medium weight)
    placeType.keywords.forEach(keyword => {
      if (types.some(type => type.includes(keyword.toLowerCase()))) {
        score += 7;
      }
    });
    
    // Exact search term matches (high weight)
    placeType.searchTerms.forEach(term => {
      if (name.includes(term.toLowerCase()) || description.includes(term.toLowerCase())) {
        score += 12;
      }
    });
    
    return { placeType, score };
  });
  
  // Find the best match
  const bestMatch = scores.reduce((best, current) => 
    current.score > best.score ? current : best
  );
  
  // Return if confidence is high enough
  return bestMatch.score >= 5 ? bestMatch.placeType : null;
}

/**
 * Get similar place types (for recommendations)
 */
export function getSimilarPlaceTypes(typeId: string): EnhancedPlaceType[] {
  const baseType = getPlaceTypeById(typeId);
  if (!baseType) return [];
  
  return ENHANCED_PLACE_TYPES.filter(type => 
    type.category === baseType.category && 
    type.id !== typeId
  ).slice(0, 5);
}

/**
 * Search place types by query
 */
export function searchPlaceTypes(query: string): EnhancedPlaceType[] {
  const q = query.toLowerCase();
  
  return ENHANCED_PLACE_TYPES.filter(type => 
    type.name.toLowerCase().includes(q) ||
    type.keywords.some(keyword => keyword.toLowerCase().includes(q)) ||
    type.searchTerms.some(term => term.toLowerCase().includes(q))
  ).sort((a, b) => {
    // Prioritize exact matches in name
    if (a.name.toLowerCase().includes(q) && !b.name.toLowerCase().includes(q)) return -1;
    if (!a.name.toLowerCase().includes(q) && b.name.toLowerCase().includes(q)) return 1;
    return 0;
  });
}