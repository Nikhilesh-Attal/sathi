/**
 * Travel Experience Enhancer
 * Advanced UX features for rich travel discovery and planning
 */

import type { Place } from './types';
import { getCategoryById, getHighPriorityCategories, type PlaceCategory } from './place-categories';
import { enrichPlace, getCategoryStatistics, type PlaceEnrichment } from './place-categorization-service-complete';

export interface TravelInsight {
  type: 'cultural' | 'historical' | 'natural' | 'religious' | 'practical';
  title: string;
  description: string;
  importance: 'high' | 'medium' | 'low';
  icon: string;
  relatedPlaces?: string[]; // Place IDs
}

export interface ItinerarySuggestion {
  id: string;
  title: string;
  description: string;
  duration: string;
  difficulty: 'easy' | 'moderate' | 'challenging';
  places: Place[];
  route: string;
  estimatedCost: {
    min: number;
    max: number;
    currency: 'INR' | 'USD';
  };
  bestTimeToVisit: string;
  tips: string[];
}

export interface LocalExperience {
  id: string;
  category: 'food' | 'culture' | 'adventure' | 'shopping' | 'festival';
  title: string;
  description: string;
  location: Place;
  timing: string;
  cost: 'free' | 'budget' | 'moderate' | 'premium';
  localTips: string[];
  photos?: string[];
}

export interface TravelWeatherInfo {
  location: { lat: number; lon: number };
  currentWeather: {
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    visibility: string;
  };
  forecast: Array<{
    date: string;
    high: number;
    low: number;
    condition: string;
    precipitationChance: number;
  }>;
  travelAdvice: string[];
}

export interface PlaceRecommendation {
  place: Place;
  score: number;
  reasons: string[];
  similarPlaces: Place[];
  userProfile: 'adventure' | 'culture' | 'relaxation' | 'photography' | 'history';
  bestVisitTime: string;
  crowdLevel: 'low' | 'medium' | 'high';
}

export interface TravelExperienceReport {
  location: {
    name: string;
    coordinates: { lat: number; lon: number };
    region: string;
  };
  overview: {
    totalPlaces: number;
    categorizedPlaces: number;
    topCategories: Array<{
      category: PlaceCategory;
      count: number;
      percentage: number;
    }>;
    diversityScore: number; // 0-100
  };
  insights: TravelInsight[];
  recommendations: PlaceRecommendation[];
  itineraries: ItinerarySuggestion[];
  localExperiences: LocalExperience[];
  practicalInfo: {
    bestMonthsToVisit: string[];
    averageStayDuration: string;
    budgetEstimate: {
      daily: { min: number; max: number };
      accommodation: { min: number; max: number };
      food: { min: number; max: number };
      activities: { min: number; max: number };
    };
    transportation: string[];
    safetyRating: number; // 1-10
    accessibility: string;
  };
  processingInfo: {
    timestamp: string;
    processingTime: number;
    placesAnalyzed: number;
    version: string;
  };
}

class TravelExperienceEnhancer {
  private readonly VERSION = '1.0.0';

  /**
   * Generate comprehensive travel experience report
   */
  async generateTravelReport(
    places: Place[],
    locationName: string,
    coordinates: { lat: number; lon: number }
  ): Promise<TravelExperienceReport> {
    const startTime = Date.now();
    console.log(`[TravelExperience] 🌟 Generating travel report for ${locationName}`);

    // Enrich places with categorization
    console.log(`[TravelExperience] 🔍 Enriching ${places.length} places...`);
    const enrichedPlaces = await this.enrichPlacesForReport(places);

    // Generate insights
    const insights = this.generateTravelInsights(enrichedPlaces, locationName);

    // Create recommendations
    const recommendations = this.generatePlaceRecommendations(enrichedPlaces);

    // Generate itineraries
    const itineraries = this.generateItinerarySuggestions(enrichedPlaces, locationName);

    // Create local experiences
    const localExperiences = this.generateLocalExperiences(enrichedPlaces, locationName);

    // Calculate statistics
    const stats = getCategoryStatistics(places);
    const overview = this.generateOverview(stats, enrichedPlaces);

    // Generate practical information
    const practicalInfo = this.generatePracticalInfo(enrichedPlaces, locationName);

    const processingTime = Date.now() - startTime;

    console.log(`[TravelExperience] ✅ Travel report generated in ${processingTime}ms`);

    return {
      location: {
        name: locationName,
        coordinates,
        region: this.inferRegion(locationName, coordinates)
      },
      overview,
      insights,
      recommendations,
      itineraries,
      localExperiences,
      practicalInfo,
      processingInfo: {
        timestamp: new Date().toISOString(),
        processingTime,
        placesAnalyzed: places.length,
        version: this.VERSION
      }
    };
  }

  /**
   * Enrich places for comprehensive analysis
   */
  private async enrichPlacesForReport(places: Place[]): Promise<PlaceEnrichment[]> {
    const enrichedPlaces: PlaceEnrichment[] = [];
    
    // Process in batches to avoid overwhelming
    const batchSize = 5;
    for (let i = 0; i < places.length; i += batchSize) {
      const batch = places.slice(i, i + batchSize);
      const batchPromises = batch.map(place => enrichPlace(place));
      const batchResults = await Promise.all(batchPromises);
      enrichedPlaces.push(...batchResults);
      
      // Small delay between batches
      if (i + batchSize < places.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return enrichedPlaces;
  }

  /**
   * Generate travel insights from enriched places
   */
  private generateTravelInsights(enrichedPlaces: PlaceEnrichment[], locationName: string): TravelInsight[] {
    const insights: TravelInsight[] = [];
    
    // Cultural insights
    const culturalPlaces = enrichedPlaces.filter(p => 
      p.detectedCategory?.id.includes('temple') || 
      p.detectedCategory?.id.includes('mosque') || 
      p.detectedCategory?.id.includes('church') ||
      p.detectedCategory?.id.includes('museum') ||
      p.detectedCategory?.id.includes('cultural')
    );

    if (culturalPlaces.length > 0) {
      insights.push({
        type: 'cultural',
        title: 'Rich Cultural Heritage',
        description: `${locationName} offers ${culturalPlaces.length} cultural and religious sites, showcasing diverse traditions and spiritual practices.`,
        importance: 'high',
        icon: '🏛️',
        relatedPlaces: culturalPlaces.map(p => p.originalPlace.place_id || '').filter(Boolean)
      });
    }

    // Historical insights
    const historicalPlaces = enrichedPlaces.filter(p => 
      p.detectedCategory?.id.includes('fort') || 
      p.detectedCategory?.id.includes('palace') || 
      p.detectedCategory?.id.includes('monument') ||
      p.detectedCategory?.id.includes('archaeological')
    );

    if (historicalPlaces.length > 0) {
      insights.push({
        type: 'historical',
        title: 'Historical Significance',
        description: `Discover ${historicalPlaces.length} historical landmarks that tell the story of ${locationName}'s rich past and architectural heritage.`,
        importance: 'high',
        icon: '🏰',
        relatedPlaces: historicalPlaces.map(p => p.originalPlace.place_id || '').filter(Boolean)
      });
    }

    // Natural beauty insights
    const naturalPlaces = enrichedPlaces.filter(p => 
      p.detectedCategory?.id.includes('hill') || 
      p.detectedCategory?.id.includes('waterfall') || 
      p.detectedCategory?.id.includes('lake') ||
      p.detectedCategory?.id.includes('garden') ||
      p.detectedCategory?.id.includes('beach')
    );

    if (naturalPlaces.length > 0) {
      insights.push({
        type: 'natural',
        title: 'Natural Beauty',
        description: `Experience ${naturalPlaces.length} stunning natural attractions, from scenic viewpoints to peaceful gardens and water bodies.`,
        importance: 'medium',
        icon: '🌿',
        relatedPlaces: naturalPlaces.map(p => p.originalPlace.place_id || '').filter(Boolean)
      });
    }

    // Practical insights
    insights.push({
      type: 'practical',
      title: 'Travel Tips',
      description: 'Plan your visit during cooler months for comfortable exploration. Many religious sites require modest dress code.',
      importance: 'medium',
      icon: '💡'
    });

    return insights;
  }

  /**
   * Generate personalized place recommendations
   */
  private generatePlaceRecommendations(enrichedPlaces: PlaceEnrichment[]): PlaceRecommendation[] {
    const recommendations: PlaceRecommendation[] = [];

    // Sort by confidence and category importance
    const sortedPlaces = enrichedPlaces
      .filter(p => p.detectedCategory && p.confidence > 0.5)
      .sort((a, b) => {
        const aScore = (a.confidence * 0.7) + ((a.detectedCategory?.priority || 0) * 0.3);
        const bScore = (b.confidence * 0.7) + ((b.detectedCategory?.priority || 0) * 0.3);
        return bScore - aScore;
      });

    // Generate recommendations for top places
    for (const enriched of sortedPlaces.slice(0, 10)) {
      const place = enriched.originalPlace;
      const category = enriched.detectedCategory!;
      
      const reasons = [
        `Categorized as ${category.name} with ${Math.round(enriched.confidence * 100)}% confidence`,
        ...(enriched.enrichedData.culturalSignificance ? ['Significant cultural importance'] : []),
        ...(place.rating && place.rating > 4 ? [`Highly rated (${place.rating}★)`] : [])
      ];

      // Find similar places
      const similarPlaces = enrichedPlaces
        .filter(p => p.detectedCategory?.id === category.id && p.originalPlace.place_id !== place.place_id)
        .slice(0, 3)
        .map(p => p.originalPlace);

      recommendations.push({
        place,
        score: enriched.confidence,
        reasons,
        similarPlaces,
        userProfile: this.inferUserProfile(category),
        bestVisitTime: this.getBestVisitTime(category),
        crowdLevel: this.estimateCrowdLevel(category, place)
      });
    }

    return recommendations;
  }

  /**
   * Generate curated itinerary suggestions
   */
  private generateItinerarySuggestions(enrichedPlaces: PlaceEnrichment[], locationName: string): ItinerarySuggestion[] {
    const itineraries: ItinerarySuggestion[] = [];

    // Historical Heritage Tour
    const historicalPlaces = enrichedPlaces
      .filter(p => p.detectedCategory?.id.includes('fort') || p.detectedCategory?.id.includes('palace') || p.detectedCategory?.id.includes('monument'))
      .map(p => p.originalPlace)
      .slice(0, 4);

    if (historicalPlaces.length >= 2) {
      itineraries.push({
        id: 'historical-heritage',
        title: `${locationName} Historical Heritage Tour`,
        description: 'Explore the rich historical legacy through ancient forts, royal palaces, and commemorative monuments',
        duration: '1 Day',
        difficulty: 'moderate',
        places: historicalPlaces,
        route: 'Start early morning → Fort/Palace → Lunch → Monument → Evening return',
        estimatedCost: { min: 500, max: 1500, currency: 'INR' },
        bestTimeToVisit: 'October to March',
        tips: [
          'Wear comfortable walking shoes',
          'Carry water and snacks',
          'Check opening hours in advance',
          'Photography restrictions may apply'
        ]
      });
    }

    // Spiritual Journey
    const spiritualPlaces = enrichedPlaces
      .filter(p => p.detectedCategory?.id.includes('temple') || p.detectedCategory?.id.includes('mosque') || p.detectedCategory?.id.includes('church'))
      .map(p => p.originalPlace)
      .slice(0, 3);

    if (spiritualPlaces.length >= 2) {
      itineraries.push({
        id: 'spiritual-journey',
        title: `${locationName} Spiritual Journey`,
        description: 'A peaceful exploration of sacred sites and places of worship representing diverse faiths',
        duration: 'Half Day',
        difficulty: 'easy',
        places: spiritualPlaces,
        route: 'Morning prayers → Temple/Church/Mosque → Meditation time → Peaceful return',
        estimatedCost: { min: 200, max: 800, currency: 'INR' },
        bestTimeToVisit: 'Early morning or evening',
        tips: [
          'Dress modestly and respectfully',
          'Remove shoes where required',
          'Maintain silence in prayer areas',
          'Participate respectfully in rituals if invited'
        ]
      });
    }

    // Nature and Relaxation
    const naturePlaces = enrichedPlaces
      .filter(p => p.detectedCategory?.id.includes('hill') || p.detectedCategory?.id.includes('lake') || p.detectedCategory?.id.includes('garden'))
      .map(p => p.originalPlace)
      .slice(0, 3);

    if (naturePlaces.length >= 2) {
      itineraries.push({
        id: 'nature-relaxation',
        title: `${locationName} Nature & Relaxation`,
        description: 'Unwind amidst natural beauty, scenic viewpoints, and peaceful gardens',
        duration: 'Full Day',
        difficulty: 'easy',
        places: naturePlaces,
        route: 'Morning hill station → Picnic lunch → Garden walk → Sunset viewing',
        estimatedCost: { min: 800, max: 2000, currency: 'INR' },
        bestTimeToVisit: 'Pleasant weather months',
        tips: [
          'Carry warm clothing for hill stations',
          'Perfect for photography',
          'Ideal for family outings',
          'Pack refreshments and water'
        ]
      });
    }

    return itineraries;
  }

  /**
   * Generate local experiences recommendations
   */
  private generateLocalExperiences(enrichedPlaces: PlaceEnrichment[], locationName: string): LocalExperience[] {
    const experiences: LocalExperience[] = [];

    // Market experiences
    const markets = enrichedPlaces
      .filter(p => p.detectedCategory?.id.includes('market'))
      .map(p => p.originalPlace);

    for (const market of markets.slice(0, 2)) {
      experiences.push({
        id: `market-${market.place_id}`,
        category: 'shopping',
        title: `Local Shopping at ${market.name}`,
        description: 'Experience authentic local shopping, bargaining, and discover unique handicrafts and souvenirs',
        location: market,
        timing: 'Morning to Evening',
        cost: 'budget',
        localTips: [
          'Bargaining is expected and part of the culture',
          'Carry cash as many vendors don't accept cards',
          'Try local street food from trusted vendors',
          'Ask locals for the best stalls and authentic items'
        ]
      });
    }

    // Cultural experiences
    const culturalSites = enrichedPlaces
      .filter(p => p.detectedCategory?.id.includes('museum') || p.detectedCategory?.id.includes('cultural'))
      .map(p => p.originalPlace);

    for (const site of culturalSites.slice(0, 1)) {
      experiences.push({
        id: `cultural-${site.place_id}`,
        category: 'culture',
        title: `Cultural Immersion at ${site.name}`,
        description: 'Deep dive into local history, art, and traditions through guided tours and exhibitions',
        location: site,
        timing: 'Morning preferred',
        cost: 'moderate',
        localTips: [
          'Guided tours provide richer context',
          'Photography rules vary by location',
          'Interactive exhibits are especially engaging',
          'Check for special events or temporary exhibitions'
        ]
      });
    }

    // Food experiences
    const restaurants = enrichedPlaces
      .filter(p => p.enrichedData.itemType === 'restaurant')
      .map(p => p.originalPlace);

    if (restaurants.length > 0) {
      experiences.push({
        id: 'local-cuisine',
        category: 'food',
        title: `Authentic ${locationName} Cuisine Experience`,
        description: 'Savor traditional local dishes, regional specialties, and street food favorites',
        location: restaurants[0],
        timing: 'Lunch and dinner',
        cost: 'budget',
        localTips: [
          'Try regional specialties unique to this area',
          'Street food is often the most authentic',
          'Ask locals for their favorite eating spots',
          'Vegetarian options are widely available'
        ]
      });
    }

    return experiences;
  }

  /**
   * Generate overview statistics
   */
  private generateOverview(stats: any, enrichedPlaces: PlaceEnrichment[]): TravelExperienceReport['overview'] {
    const categoryCount: { [categoryId: string]: { category: PlaceCategory; count: number } } = {};
    
    for (const enriched of enrichedPlaces) {
      if (enriched.detectedCategory) {
        const id = enriched.detectedCategory.id;
        if (!categoryCount[id]) {
          categoryCount[id] = { category: enriched.detectedCategory, count: 0 };
        }
        categoryCount[id].count++;
      }
    }

    const topCategories = Object.values(categoryCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(item => ({
        category: item.category,
        count: item.count,
        percentage: Math.round((item.count / stats.totalPlaces) * 100)
      }));

    // Calculate diversity score based on category distribution
    const uniqueCategories = Object.keys(categoryCount).length;
    const maxPossibleCategories = 15; // Reasonable max for diversity
    const diversityScore = Math.min(Math.round((uniqueCategories / maxPossibleCategories) * 100), 100);

    return {
      totalPlaces: stats.totalPlaces,
      categorizedPlaces: stats.categorized,
      topCategories,
      diversityScore
    };
  }

  /**
   * Generate practical travel information
   */
  private generatePracticalInfo(enrichedPlaces: PlaceEnrichment[], locationName: string): TravelExperienceReport['practicalInfo'] {
    // Infer best months based on region/location type
    const bestMonths = this.inferBestMonths(locationName);
    
    // Estimate budget based on place types and local context
    const budgetEstimate = this.estimateBudget(enrichedPlaces, locationName);
    
    return {
      bestMonthsToVisit: bestMonths,
      averageStayDuration: this.estimateStayDuration(enrichedPlaces.length),
      budgetEstimate,
      transportation: ['Local buses', 'Auto-rickshaws', 'Taxis', 'Walking'],
      safetyRating: 8, // Default safe rating for most Indian destinations
      accessibility: 'Moderate - Some sites may have steps or uneven terrain'
    };
  }

  /**
   * Helper methods for intelligent recommendations
   */
  private inferUserProfile(category: PlaceCategory): PlaceRecommendation['userProfile'] {
    if (category.id.includes('fort') || category.id.includes('palace') || category.id.includes('monument')) {
      return 'history';
    }
    if (category.id.includes('hill') || category.id.includes('waterfall') || category.id.includes('beach')) {
      return 'adventure';
    }
    if (category.id.includes('temple') || category.id.includes('museum')) {
      return 'culture';
    }
    if (category.id.includes('garden') || category.id.includes('lake')) {
      return 'relaxation';
    }
    return 'photography';
  }

  private getBestVisitTime(category: PlaceCategory): string {
    if (category.id.includes('temple') || category.id.includes('mosque')) {
      return 'Early morning or evening';
    }
    if (category.id.includes('hill') || category.id.includes('waterfall')) {
      return 'Pleasant weather months';
    }
    if (category.id.includes('museum')) {
      return 'Morning hours';
    }
    return 'Anytime during operating hours';
  }

  private estimateCrowdLevel(category: PlaceCategory, place: Place): 'low' | 'medium' | 'high' {
    // Popular categories tend to be more crowded
    if (category.priority >= 9 || (place.rating && place.rating > 4.2)) {
      return 'high';
    }
    if (category.priority >= 7) {
      return 'medium';
    }
    return 'low';
  }

  private inferRegion(locationName: string, coordinates: { lat: number; lon: number }): string {
    // Simple region inference based on coordinates and name
    if (coordinates.lat > 28) return 'North India';
    if (coordinates.lat < 15) return 'South India';
    if (coordinates.lon < 77) return 'West India';
    return 'Central India';
  }

  private inferBestMonths(locationName: string): string[] {
    // Default to pleasant months for most of India
    return ['October', 'November', 'December', 'January', 'February', 'March'];
  }

  private estimateBudget(enrichedPlaces: PlaceEnrichment[], locationName: string): TravelExperienceReport['practicalInfo']['budgetEstimate'] {
    // Basic budget estimation for India
    const baseMultiplier = locationName.toLowerCase().includes('metro') || 
                          locationName.toLowerCase().includes('delhi') || 
                          locationName.toLowerCase().includes('mumbai') ? 1.5 : 1;

    return {
      daily: { min: 1500 * baseMultiplier, max: 4000 * baseMultiplier },
      accommodation: { min: 1000 * baseMultiplier, max: 8000 * baseMultiplier },
      food: { min: 500 * baseMultiplier, max: 2000 * baseMultiplier },
      activities: { min: 200 * baseMultiplier, max: 1500 * baseMultiplier }
    };
  }

  private estimateStayDuration(placeCount: number): string {
    if (placeCount >= 15) return '3-5 days';
    if (placeCount >= 8) return '2-3 days';
    if (placeCount >= 4) return '1-2 days';
    return 'Half to full day';
  }
}

// Export singleton instance
export const travelExperienceEnhancer = new TravelExperienceEnhancer();

// Convenience functions
export async function generateTravelReport(
  places: Place[],
  locationName: string,
  coordinates: { lat: number; lon: number }
): Promise<TravelExperienceReport> {
  return travelExperienceEnhancer.generateTravelReport(places, locationName, coordinates);
}

/**
 * Quick recommendation engine for immediate suggestions
 */
export function getQuickRecommendations(places: Place[], limit: number = 5): Place[] {
  // Simple quick recommendations based on ratings and name quality
  return places
    .filter(place => place.name && place.name.length > 3)
    .sort((a, b) => {
      const aScore = (a.rating || 0) + (a.name.length > 10 ? 0.5 : 0) + (a.types && a.types.length > 0 ? 0.3 : 0);
      const bScore = (b.rating || 0) + (b.name.length > 10 ? 0.5 : 0) + (b.types && b.types.length > 0 ? 0.3 : 0);
      return bScore - aScore;
    })
    .slice(0, limit);
}

/**
 * Generate themed discovery suggestions
 */
export function getThemedDiscoveries(places: Place[]): {
  theme: string;
  icon: string;
  description: string;
  places: Place[];
}[] {
  const themes = [
    {
      theme: 'Heritage Trail',
      icon: '🏛️',
      keywords: ['fort', 'palace', 'monument', 'heritage', 'historical'],
      description: 'Explore the architectural marvels and historical significance'
    },
    {
      theme: 'Spiritual Journey', 
      icon: '🕉️',
      keywords: ['temple', 'church', 'mosque', 'shrine', 'spiritual'],
      description: 'Experience peace and spirituality at sacred places'
    },
    {
      theme: 'Nature Escape',
      icon: '🌿',
      keywords: ['hill', 'waterfall', 'lake', 'garden', 'park'],
      description: 'Connect with nature and enjoy scenic beauty'
    },
    {
      theme: 'Cultural Immersion',
      icon: '🎭',
      keywords: ['museum', 'cultural', 'art', 'gallery', 'traditional'],
      description: 'Dive deep into local arts, culture, and traditions'
    }
  ];

  return themes.map(theme => ({
    theme: theme.theme,
    icon: theme.icon,
    description: theme.description,
    places: places.filter(place => {
      const searchText = `${place.name} ${place.description || ''} ${place.types?.join(' ') || ''}`.toLowerCase();
      return theme.keywords.some(keyword => searchText.includes(keyword));
    }).slice(0, 6)
  })).filter(theme => theme.places.length > 0);
}