'use server';
/**
 * @fileOverview AI-powered creative place discovery.
 * This flow generates fictional places to visit when real-world APIs are unavailable.
 * - discoverPlaces - Generates fictional places, hotels, and restaurants near a given set of coordinates.
 */

import {placeAI} from '@/ai/genkit';
import {z} from 'genkit';
import { v4 as uuidv4 } from 'uuid';
import { ExploreInputSchema, ExploreOutputSchema, PlaceSchema, type ExploreInput, type ExploreOutput, type Place } from '@/lib/schemas';


// Internal schema for what the AI should generate, without fields we can generate ourselves.
const AIPartialPlaceSchema = PlaceSchema.omit({ place_id: true }).extend({ historicalInfo: z.string().optional().describe("Brief, interesting historical context or fun facts about the fictional place.") });
type AIPartialPlace = z.infer<typeof AIPartialPlaceSchema>;

const AIOutputSchema = z.object({
    places: z.array(AIPartialPlaceSchema).describe('An array of 2-3 suggested fictional places to visit.'),
    hotels: z.array(AIPartialPlaceSchema).describe('An array of 1-2 suggested fictional hotels.'),
    restaurants: z.array(AIPartialPlaceSchema).describe('An array of 2-3 suggested fictional restaurants.'),
});

// The exported function that the application calls.
export async function discoverPlaces(input: ExploreInput): Promise<ExploreOutput> {
  return placeDiscoveryFlow(input);
}

const prompt = placeAI.definePrompt({
    name: 'placeDiscoveryPrompt',
    input: {schema: ExploreInputSchema},
    output: {schema: AIOutputSchema}, // Use the AI-specific output schema
    prompt: `You are a creative travel guide inventing plausible and interesting places for a user to discover. The user is at latitude {{latitude}} and longitude {{longitude}}.
    
    Generate a list of fictional places for this general area. Do not use real place names.
    
    - Create 2-3 "places to visit" (e.g., a quirky museum, a hidden garden, a futuristic monument).
    - Create 1-2 "hotels" (e.g., a boutique hotel with a theme, a high-tech pod hotel).
    - Create 2-3 "restaurants" (e.g., a fusion cafe, a rooftop restaurant with a view).

    For each place, provide the following:
    - \`name\`: A creative and appealing name (max 50 characters).
    - \`description\`: A short, captivating, one-sentence description (exactly 15-25 words).
    - \`vicinity\`: A short, plausible fictional address (max 30 characters), like "42 Wandering Lane" or "15 Garden Street".
    - \`rating\`: A randomly generated rating between 4.0 and 4.9, with one decimal place.
    - \`photoUrl\`: MUST be the placeholder string "https://placehold.co/600x400.png".
    - \`photoHint\`: One or two keywords for a stock photo search (e.g., 'quirky museum' or 'rooftop view').
    - \`historicalInfo\`: An optional string with a brief, interesting historical context or fun facts about the fictional place (max 100 characters).
    - \`types\`: A few plausible types, like ["museum", "art", "historical"].
    
    IMPORTANT: Keep all text fields concise. Do NOT repeat words or create extremely long strings. The vicinity field should be a simple, short address.
    
    Do NOT generate a 'place_id' field. Return ONLY the structured JSON object.`,
});

// Helper function to clean and validate AI response text
const cleanText = (text: string, maxLength: number): string => {
  if (!text) return '';
  // Remove excessive repetition patterns
  const cleaned = text
    .replace(/(\b\w+\b)(?:\s*,?\s*\1){5,}/gi, '$1') // Remove words repeated 5+ times
    .replace(/(\b\w+\b)(\s+\1){3,}/gi, '$1') // Remove words repeated with spaces
    .trim();
  
  // Truncate if still too long
  return cleaned.length > maxLength ? cleaned.substring(0, maxLength).trim() : cleaned;
};

// Helper function to add a UUID and ensure photoUrl exists.
const processAIPlace = (item: AIPartialPlace): Place => {
  const cleaned = {
    ...item,
    name: cleanText(item.name || 'Unnamed Place', 50),
    description: cleanText(item.description || 'A wonderful place to visit', 150),
    vicinity: cleanText(item.vicinity || 'Unknown Location', 30),
    historicalInfo: item.historicalInfo ? cleanText(item.historicalInfo, 100) : undefined,
  };
  
  return {
    ...cleaned,
    place_id: uuidv4(),
    photoUrl: item.photoUrl || 'https://placehold.co/600x400.png',
  };
};

// Generate fallback data when AI fails completely
const generateFallbackData = (latitude: number, longitude: number): ExploreOutput => {
  const fallbackPlace: Place = {
    place_id: uuidv4(),
    name: 'Mystery Landmark',
    description: 'A fascinating local landmark waiting to be discovered',
    vicinity: 'Local Area',
    rating: 4.2,
    photoUrl: 'https://placehold.co/600x400.png',
    photoHint: 'landmark building',
    types: ['landmark', 'tourist_attraction'],
    coordinates: { latitude, longitude },
    source: 'ai-fallback'
  };
  
  const fallbackHotel: Place = {
    place_id: uuidv4(),
    name: 'Comfort Inn',
    description: 'A comfortable place to stay with modern amenities',
    vicinity: 'Downtown Area',
    rating: 4.1,
    photoUrl: 'https://placehold.co/600x400.png',
    photoHint: 'modern hotel',
    types: ['lodging', 'hotel'],
    coordinates: { latitude, longitude },
    source: 'ai-fallback'
  };
  
  const fallbackRestaurant: Place = {
    place_id: uuidv4(),
    name: 'Local Eatery',
    description: 'Delicious local cuisine in a cozy atmosphere',
    vicinity: 'Main Street',
    rating: 4.3,
    photoUrl: 'https://placehold.co/600x400.png',
    photoHint: 'restaurant interior',
    types: ['restaurant', 'food'],
    coordinates: { latitude, longitude },
    source: 'ai-fallback'
  };
  
  return {
    places: [fallbackPlace],
    hotels: [fallbackHotel],
    restaurants: [fallbackRestaurant]
  };
};

const placeDiscoveryFlow = placeAI.defineFlow(
  {
    name: 'placeDiscoveryFlow',
    inputSchema: ExploreInputSchema,
    outputSchema: ExploreOutputSchema, // The flow still returns the full schema for app compatibility
  },
  async (input) => {
    try {
      const {output: aiOutput} = await prompt(input);
      
      if (!aiOutput) {
        console.log('[placeDiscoveryFlow] AI returned null/undefined output, using fallback');
        return generateFallbackData(input.latitude, input.longitude);
      }
      
      // Validate that we have the required arrays, even if empty
      const places = Array.isArray(aiOutput.places) ? aiOutput.places : [];
      const hotels = Array.isArray(aiOutput.hotels) ? aiOutput.hotels : [];
      const restaurants = Array.isArray(aiOutput.restaurants) ? aiOutput.restaurants : [];
      
      // If all arrays are empty, use fallback
      if (places.length === 0 && hotels.length === 0 && restaurants.length === 0) {
        console.log('[placeDiscoveryFlow] AI returned empty arrays, using fallback');
        return generateFallbackData(input.latitude, input.longitude);
      }
      
      return {
        places: places.map(processAIPlace),
        hotels: hotels.map(processAIPlace),
        restaurants: restaurants.map(processAIPlace),
      };
    } catch(e: any) {
      console.error("[placeDiscoveryFlow] AI generation failed, using fallback data:", e.message);
      // Instead of throwing an error, return fallback data
      return generateFallbackData(input.latitude, input.longitude);
    }
  }
);
