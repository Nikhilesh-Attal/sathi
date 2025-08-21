'use server';
/**
 * @fileOverview AI-powered creative place discovery.
 * This flow generates fictional places to visit when real-world APIs are unavailable.
 * - discoverPlaces - Generates fictional places, hotels, and restaurants near a given set of coordinates.
 */

import {ai} from '@/ai/genkit';
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

const prompt = ai.definePrompt({
    name: 'placeDiscoveryPrompt',
    input: {schema: ExploreInputSchema},
    output: {schema: AIOutputSchema}, // Use the AI-specific output schema
    prompt: `You are a creative travel guide inventing plausible and interesting places for a user to discover. The user is at latitude {{latitude}} and longitude {{longitude}}.
    
    Generate a list of fictional places for this general area. Do not use real place names.
    
    - Create 2-3 "places to visit" (e.g., a quirky museum, a hidden garden, a futuristic monument).
    - Create 1-2 "hotels" (e.g., a boutique hotel with a theme, a high-tech pod hotel).
    - Create 2-3 "restaurants" (e.g., a fusion cafe, a rooftop restaurant with a view).

    For each place, provide the following:
    - \`name\`: A creative and appealing name.
    - \`description\`: A short, captivating, one-sentence description (around 15-20 words).
    - \`vicinity\`: A plausible but fictional address, like "42 Wandering Lane".
    - \`rating\`: A randomly generated rating between 4.0 and 4.9, with one decimal place.
    - \`photoUrl\`: MUST be the placeholder string "https://placehold.co/600x400.png".
    - \`photoHint\`: One or two keywords for a stock photo search (e.g., 'quirky museum' or 'rooftop view').
    - \`historicalInfo\`: An optional string with a brief, interesting historical context or fun facts about the fictional place.
    - \`types\`: A few plausible types, like ["museum", "art", "historical"].
    
    Do NOT generate a 'place_id' field. Return ONLY the structured JSON object.`,
});

// Helper function to add a UUID and ensure photoUrl exists.
const processAIPlace = (item: AIPartialPlace): Place => ({
  ...item,
  place_id: uuidv4(),
  photoUrl: item.photoUrl || 'https://placehold.co/600x400.png',
});

const placeDiscoveryFlow = ai.defineFlow(
  {
    name: 'placeDiscoveryFlow',
    inputSchema: ExploreInputSchema,
    outputSchema: ExploreOutputSchema, // The flow still returns the full schema for app compatibility
  },
  async (input) => {
    try {
      const {output: aiOutput} = await prompt(input);
      
      if (!aiOutput || !aiOutput.places || !aiOutput.hotels || !aiOutput.restaurants) {
          throw new Error('The AI returned an empty or invalid structure.');
      }
      
      return {
        places: aiOutput.places.map(processAIPlace),
        hotels: aiOutput.hotels.map(processAIPlace),
        restaurants: aiOutput.restaurants.map(processAIPlace),
      };
    } catch(e: any) {
      console.error("[placeDiscoveryFlow] Full error object:", e);
      // Provide a more detailed, user-friendly error message.
      throw new Error(
          `The AI had trouble dreaming up places. The request might be too complex or the AI service is experiencing issues (e.g., API key or quota). Full error: ${e.message}`
      );
    }
  }
);
