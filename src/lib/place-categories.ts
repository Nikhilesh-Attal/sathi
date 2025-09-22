/**
 * Comprehensive Place Categories for Enhanced User Experience
 * Supporting diverse Indian travel destinations and global places
 */

export interface PlaceCategory {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  googleTypes?: string[];
  osmTags?: Record<string, string[]>;
  icon: string;
  searchQueries: string[];
  priority: number; // Higher = more popular/important
}

export interface CategoryGroup {
  id: string;
  name: string;
  description: string;
  icon: string;
  categories: PlaceCategory[];
}

// ========================================
// RELIGIOUS & SPIRITUAL PLACES
// ========================================

export const religiousCategories: PlaceCategory[] = [
  {
    id: 'hindu-temple',
    name: 'Hindu Temples',
    description: 'Ancient and modern Hindu temples, mandirs, and shrines',
    keywords: ['temple', 'mandir', 'shrine', 'devasthanam', 'kovil', 'devalaya', 'shiva', 'vishnu', 'devi', 'hanuman', 'ganesha', 'krishna', 'rama'],
    googleTypes: ['place_of_worship', 'hindu_temple'],
    osmTags: {
      amenity: ['place_of_worship'],
      religion: ['hindu'],
      building: ['temple']
    },
    icon: '🕉️',
    searchQueries: ['hindu temple', 'temple', 'mandir', 'shrine', 'sacred site'],
    priority: 9
  },
  {
    id: 'mosque',
    name: 'Mosques',
    description: 'Islamic mosques, masjids, and prayer halls',
    keywords: ['mosque', 'masjid', 'jamia', 'islamic', 'prayer hall', 'minaret'],
    googleTypes: ['place_of_worship', 'mosque'],
    osmTags: {
      amenity: ['place_of_worship'],
      religion: ['muslim'],
      building: ['mosque']
    },
    icon: '🕌',
    searchQueries: ['mosque', 'masjid', 'islamic place'],
    priority: 8
  },
  {
    id: 'church',
    name: 'Churches & Cathedrals',
    description: 'Christian churches, cathedrals, and chapels',
    keywords: ['church', 'cathedral', 'chapel', 'basilica', 'christian', 'christ'],
    googleTypes: ['place_of_worship', 'church'],
    osmTags: {
      amenity: ['place_of_worship'],
      religion: ['christian'],
      building: ['church', 'cathedral', 'chapel']
    },
    icon: '⛪',
    searchQueries: ['church', 'cathedral', 'chapel', 'christian place'],
    priority: 7
  },
  {
    id: 'gurudwara',
    name: 'Gurudwaras',
    description: 'Sikh gurudwaras and prayer halls',
    keywords: ['gurudwara', 'gurdwara', 'sikh', 'langar', 'guru', 'sahib'],
    googleTypes: ['place_of_worship'],
    osmTags: {
      amenity: ['place_of_worship'],
      religion: ['sikh'],
      building: ['gurudwara']
    },
    icon: '🏛️',
    searchQueries: ['gurudwara', 'gurdwara', 'sikh temple'],
    priority: 6
  },
  {
    id: 'buddhist-site',
    name: 'Buddhist Sites',
    description: 'Buddhist monasteries, stupas, and meditation centers',
    keywords: ['monastery', 'stupa', 'buddhist', 'meditation', 'gompa', 'vihara', 'buddha'],
    googleTypes: ['place_of_worship'],
    osmTags: {
      amenity: ['place_of_worship', 'monastery'],
      religion: ['buddhist'],
      historic: ['monastery']
    },
    icon: '☸️',
    searchQueries: ['buddhist monastery', 'stupa', 'meditation center'],
    priority: 5
  }
];

// ========================================
// HISTORICAL & CULTURAL PLACES
// ========================================

export const historicalCategories: PlaceCategory[] = [
  {
    id: 'fort',
    name: 'Forts & Fortresses',
    description: 'Ancient forts, citadels, and defensive structures',
    keywords: ['fort', 'fortress', 'citadel', 'qila', 'garh', 'durg', 'haveli', 'palace fort'],
    googleTypes: ['tourist_attraction', 'historical_site'],
    osmTags: {
      historic: ['castle', 'fort', 'fortress'],
      tourism: ['attraction']
    },
    icon: '🏰',
    searchQueries: ['fort', 'fortress', 'citadel', 'historical fort', 'qila'],
    priority: 10
  },
  {
    id: 'palace',
    name: 'Palaces & Royal Buildings',
    description: 'Royal palaces, maharaja residences, and regal architecture',
    keywords: ['palace', 'mahal', 'rajbhawan', 'royal', 'maharaja', 'king', 'queen', 'darbar'],
    googleTypes: ['tourist_attraction', 'historical_site'],
    osmTags: {
      historic: ['palace'],
      tourism: ['attraction']
    },
    icon: '👑',
    searchQueries: ['palace', 'royal palace', 'mahal', 'maharaja palace'],
    priority: 9
  },
  {
    id: 'monument',
    name: 'Monuments & Memorials',
    description: 'Historical monuments, war memorials, and commemorative structures',
    keywords: ['monument', 'memorial', 'statue', 'pillar', 'victory tower', 'war memorial', 'shaheed'],
    googleTypes: ['tourist_attraction', 'historical_site'],
    osmTags: {
      historic: ['monument', 'memorial'],
      tourism: ['attraction']
    },
    icon: '🗿',
    searchQueries: ['monument', 'memorial', 'historical monument', 'victory tower'],
    priority: 8
  },
  {
    id: 'archaeological-site',
    name: 'Archaeological Sites',
    description: 'Ancient ruins, excavated sites, and archaeological discoveries',
    keywords: ['archaeological', 'ruins', 'ancient', 'excavation', 'heritage site', 'ancient city', 'harappan'],
    googleTypes: ['tourist_attraction', 'historical_site'],
    osmTags: {
      historic: ['archaeological_site', 'ruins'],
      tourism: ['attraction']
    },
    icon: '🏺',
    searchQueries: ['archaeological site', 'ancient ruins', 'heritage site'],
    priority: 7
  },
  {
    id: 'heritage-building',
    name: 'Heritage Buildings',
    description: 'Colonial buildings, heritage architecture, and cultural landmarks',
    keywords: ['heritage', 'colonial', 'british', 'victorian', 'art deco', 'indo-saracenic', 'architecture'],
    googleTypes: ['tourist_attraction', 'historical_site'],
    osmTags: {
      historic: ['building'],
      tourism: ['attraction'],
      building: ['heritage']
    },
    icon: '🏛️',
    searchQueries: ['heritage building', 'colonial architecture', 'historical building'],
    priority: 6
  }
];

// ========================================
// NATURE & OUTDOOR PLACES
// ========================================

export const natureCategories: PlaceCategory[] = [
  {
    id: 'hill-station',
    name: 'Hill Stations',
    description: 'Mountain retreats, hill stations, and scenic viewpoints',
    keywords: ['hill station', 'mountain', 'peak', 'hills', 'valley', 'scenic point', 'viewpoint', 'ghat'],
    googleTypes: ['natural_feature', 'tourist_attraction'],
    osmTags: {
      natural: ['peak', 'hill'],
      tourism: ['viewpoint', 'attraction'],
      place: ['village', 'town']
    },
    icon: '⛰️',
    searchQueries: ['hill station', 'mountain', 'scenic viewpoint', 'hills'],
    priority: 10
  },
  {
    id: 'waterfall',
    name: 'Waterfalls',
    description: 'Natural waterfalls and cascades',
    keywords: ['waterfall', 'falls', 'cascade', 'jog', 'stream'],
    googleTypes: ['natural_feature', 'tourist_attraction'],
    osmTags: {
      natural: ['waterfall'],
      tourism: ['attraction']
    },
    icon: '💧',
    searchQueries: ['waterfall', 'falls', 'cascade'],
    priority: 9
  },
  {
    id: 'lake',
    name: 'Lakes & Water Bodies',
    description: 'Natural and artificial lakes, reservoirs, and water bodies',
    keywords: ['lake', 'reservoir', 'pond', 'tank', 'sarovar', 'kund', 'dal lake'],
    googleTypes: ['natural_feature'],
    osmTags: {
      natural: ['water'],
      water: ['lake', 'reservoir']
    },
    icon: '🏞️',
    searchQueries: ['lake', 'reservoir', 'water body'],
    priority: 8
  },
  {
    id: 'national-park',
    name: 'National Parks & Wildlife',
    description: 'National parks, wildlife sanctuaries, and nature reserves',
    keywords: ['national park', 'wildlife sanctuary', 'reserve', 'tiger reserve', 'bird sanctuary', 'safari'],
    googleTypes: ['park', 'zoo'],
    osmTags: {
      leisure: ['nature_reserve'],
      boundary: ['national_park', 'protected_area']
    },
    icon: '🦁',
    searchQueries: ['national park', 'wildlife sanctuary', 'tiger reserve', 'safari'],
    priority: 9
  },
  {
    id: 'garden',
    name: 'Gardens & Parks',
    description: 'Botanical gardens, public parks, and landscaped spaces',
    keywords: ['garden', 'park', 'botanical', 'rose garden', 'public park', 'mughal garden'],
    googleTypes: ['park'],
    osmTags: {
      leisure: ['park', 'garden'],
      tourism: ['attraction']
    },
    icon: '🌸',
    searchQueries: ['botanical garden', 'park', 'garden', 'public park'],
    priority: 7
  },
  {
    id: 'beach',
    name: 'Beaches & Coastal Areas',
    description: 'Beaches, coastal areas, and marine destinations',
    keywords: ['beach', 'coast', 'shore', 'seaside', 'marina', 'lighthouse'],
    googleTypes: ['natural_feature'],
    osmTags: {
      natural: ['beach', 'coastline'],
      tourism: ['attraction']
    },
    icon: '🏖️',
    searchQueries: ['beach', 'coastline', 'seaside', 'lighthouse'],
    priority: 8
  }
];

// ========================================
// CULTURAL & EDUCATIONAL PLACES
// ========================================

export const culturalCategories: PlaceCategory[] = [
  {
    id: 'museum',
    name: 'Museums',
    description: 'Art, history, science, and specialty museums',
    keywords: ['museum', 'gallery', 'art gallery', 'science museum', 'history museum', 'planetarium'],
    googleTypes: ['museum'],
    osmTags: {
      tourism: ['museum'],
      amenity: ['arts_centre']
    },
    icon: '🏛️',
    searchQueries: ['museum', 'art gallery', 'science museum', 'planetarium'],
    priority: 8
  },
  {
    id: 'cultural-center',
    name: 'Cultural Centers',
    description: 'Cultural centers, performance halls, and community spaces',
    keywords: ['cultural center', 'auditorium', 'theater', 'performance hall', 'cultural complex'],
    googleTypes: ['establishment'],
    osmTags: {
      amenity: ['theatre', 'arts_centre', 'community_centre']
    },
    icon: '🎭',
    searchQueries: ['cultural center', 'theater', 'auditorium', 'performance hall'],
    priority: 6
  },
  {
    id: 'library',
    name: 'Libraries & Archives',
    description: 'Public libraries, research centers, and archives',
    keywords: ['library', 'archive', 'research center', 'public library', 'central library'],
    googleTypes: ['library'],
    osmTags: {
      amenity: ['library']
    },
    icon: '📚',
    searchQueries: ['library', 'public library', 'research center'],
    priority: 5
  }
];

// ========================================
// SHOPPING & COMMERCIAL PLACES
// ========================================

export const commercialCategories: PlaceCategory[] = [
  {
    id: 'market',
    name: 'Markets & Bazaars',
    description: 'Traditional markets, bazaars, and shopping areas',
    keywords: ['market', 'bazaar', 'shopping', 'mall', 'complex', 'emporium', 'handicrafts'],
    googleTypes: ['shopping_mall', 'establishment'],
    osmTags: {
      shop: ['mall', 'supermarket'],
      amenity: ['marketplace']
    },
    icon: '🛒',
    searchQueries: ['market', 'bazaar', 'shopping mall', 'handicraft market'],
    priority: 7
  },
  {
    id: 'handicraft-center',
    name: 'Handicraft Centers',
    description: 'Artisan workshops, craft centers, and traditional handicrafts',
    keywords: ['handicraft', 'craft', 'artisan', 'workshop', 'pottery', 'weaving', 'traditional'],
    googleTypes: ['establishment'],
    osmTags: {
      craft: ['pottery', 'textile'],
      shop: ['craft']
    },
    icon: '🎨',
    searchQueries: ['handicraft center', 'artisan workshop', 'craft center', 'pottery'],
    priority: 6
  }
];

// ========================================
// ENTERTAINMENT & RECREATION
// ========================================

export const entertainmentCategories: PlaceCategory[] = [
  {
    id: 'amusement-park',
    name: 'Amusement & Theme Parks',
    description: 'Amusement parks, theme parks, and entertainment complexes',
    keywords: ['amusement park', 'theme park', 'water park', 'adventure park', 'fun city'],
    googleTypes: ['amusement_park'],
    osmTags: {
      tourism: ['theme_park'],
      leisure: ['water_park']
    },
    icon: '🎢',
    searchQueries: ['amusement park', 'theme park', 'water park', 'adventure park'],
    priority: 8
  },
  {
    id: 'zoo',
    name: 'Zoos & Aquariums',
    description: 'Zoos, aquariums, and animal parks',
    keywords: ['zoo', 'aquarium', 'animal park', 'safari park', 'marine park'],
    googleTypes: ['zoo'],
    osmTags: {
      tourism: ['zoo'],
      amenity: ['zoo']
    },
    icon: '🦓',
    searchQueries: ['zoo', 'aquarium', 'animal park', 'safari park'],
    priority: 7
  }
];

// ========================================
// TRANSPORTATION & INFRASTRUCTURE
// ========================================

export const transportationCategories: PlaceCategory[] = [
  {
    id: 'railway-heritage',
    name: 'Railway Heritage',
    description: 'Heritage railway stations, toy trains, and rail museums',
    keywords: ['railway station', 'train station', 'toy train', 'heritage railway', 'rail museum'],
    googleTypes: ['transit_station', 'museum'],
    osmTags: {
      railway: ['station', 'heritage'],
      tourism: ['attraction']
    },
    icon: '🚂',
    searchQueries: ['heritage railway', 'toy train', 'railway station', 'rail museum'],
    priority: 7
  }
];

// ========================================
// CATEGORY GROUPS
// ========================================

export const categoryGroups: CategoryGroup[] = [
  {
    id: 'religious',
    name: 'Religious & Spiritual',
    description: 'Temples, mosques, churches, and sacred places',
    icon: '🕉️',
    categories: religiousCategories
  },
  {
    id: 'historical',
    name: 'Historical & Cultural',
    description: 'Forts, palaces, monuments, and heritage sites',
    icon: '🏰',
    categories: historicalCategories
  },
  {
    id: 'nature',
    name: 'Nature & Outdoors',
    description: 'Hill stations, waterfalls, parks, and natural attractions',
    icon: '⛰️',
    categories: natureCategories
  },
  {
    id: 'cultural',
    name: 'Museums & Culture',
    description: 'Museums, galleries, and cultural centers',
    icon: '🏛️',
    categories: culturalCategories
  },
  {
    id: 'commercial',
    name: 'Shopping & Markets',
    description: 'Markets, bazaars, and shopping destinations',
    icon: '🛒',
    categories: commercialCategories
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    description: 'Amusement parks, zoos, and recreational facilities',
    icon: '🎢',
    categories: entertainmentCategories
  },
  {
    id: 'transportation',
    name: 'Heritage Transport',
    description: 'Railway heritage and transportation landmarks',
    icon: '🚂',
    categories: transportationCategories
  }
];

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Get all categories flattened
 */
export function getAllCategories(): PlaceCategory[] {
  return categoryGroups.flatMap(group => group.categories);
}

/**
 * Get category by ID
 */
export function getCategoryById(id: string): PlaceCategory | undefined {
  return getAllCategories().find(cat => cat.id === id);
}

/**
 * Get categories by group
 */
export function getCategoriesByGroup(groupId: string): PlaceCategory[] {
  const group = categoryGroups.find(g => g.id === groupId);
  return group ? group.categories : [];
}

/**
 * Get high priority categories (priority >= 8)
 */
export function getHighPriorityCategories(): PlaceCategory[] {
  return getAllCategories().filter(cat => cat.priority >= 8);
}

/**
 * Search categories by keyword
 */
export function searchCategories(query: string): PlaceCategory[] {
  const lowercaseQuery = query.toLowerCase();
  return getAllCategories().filter(cat => 
    cat.name.toLowerCase().includes(lowercaseQuery) ||
    cat.description.toLowerCase().includes(lowercaseQuery) ||
    cat.keywords.some(keyword => keyword.toLowerCase().includes(lowercaseQuery)) ||
    cat.searchQueries.some(sq => sq.toLowerCase().includes(lowercaseQuery))
  );
}

/**
 * Get search queries for API calls
 */
export function getSearchQueriesForCategory(categoryId: string): string[] {
  const category = getCategoryById(categoryId);
  return category ? category.searchQueries : [];
}

/**
 * Detect category from place data
 */
export function detectPlaceCategory(place: any): PlaceCategory | null {
  const name = (place.name || '').toLowerCase();
  const description = (place.description || '').toLowerCase();
  const types = place.types || [];
  
  // Check all categories and score them
  const categoryScores: { category: PlaceCategory; score: number }[] = [];
  
  for (const category of getAllCategories()) {
    let score = 0;
    
    // Check keywords in name (higher weight)
    for (const keyword of category.keywords) {
      if (name.includes(keyword.toLowerCase())) {
        score += 3;
      }
      if (description.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
    
    // Check Google types
    if (category.googleTypes) {
      for (const type of types) {
        if (category.googleTypes.includes(type.toLowerCase())) {
          score += 2;
        }
      }
    }
    
    if (score > 0) {
      categoryScores.push({ category, score });
    }
  }
  
  // Return the highest scoring category
  if (categoryScores.length > 0) {
    categoryScores.sort((a, b) => b.score - a.score);
    return categoryScores[0].category;
  }
  
  return null;
}