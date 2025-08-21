'use server';
/**
 * @fileOverview AI-powered creative restaurant discovery.
 * This flow generates fictional, appealing restaurants when real-world APIs are unavailable or return no results.
 * - discoverRestaurants - Generates fictional restaurants near a given set of coordinates.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { v4 as uuidv4 } from 'uuid';
import { ExploreInputSchema, PlaceSchema } from '@/lib/schemas';
import type { ExploreInput, Place } from '@/lib/types';


// Internal schema for what the AI should generate, without fields we can generate ourselves.
const AIPartialPlaceSchema = PlaceSchema.omit({ place_id: true });
const UpdatedAIPartialPlaceSchema = AIPartialPlaceSchema.extend({ recommendedDishes: z.array(z.string()).optional().describe("1-2 popular or signature dishes recommended for this fictional restaurant."), });

const AIOutputSchema = z.object({
    restaurants: z.array(AIPartialPlaceSchema).describe('An array of 2-3 suggested fictional restaurants.'),
});

// The exported function that the application calls.
export async function discoverRestaurants(input: ExploreInput): Promise<{ restaurants: Place[] }> {
  return restaurantDiscoveryFlow(input);
}

const prompt = ai.definePrompt({
    name: 'restaurantDiscoveryPrompt',
    input: {schema: ExploreInputSchema},
    output: {schema: AIOutputSchema},
    prompt: `You are a creative food blogger inventing plausible and interesting restaurants for a user to discover. The user is at latitude {{latitude}} and longitude {{longitude}}.
    
    Generate a list of 2-3 fictional restaurants for this general area. Do not use real restaurant names.
    
    For each restaurant, provide the following:
    - \`name\`: A creative and appealing name (e.g., "The Gilded Spoon," "Byte & Nosh Cafe").
    - \`description\`: A short, captivating, one-sentence description (around 15-20 words) that describes its theme or signature style.
    - \`vicinity\`: A plausible but fictional address, like "123 Culinary Corner".
    - \`rating\`: A randomly generated rating between 4.0 and 4.9, with one decimal place.
    - \`photoUrl\`: MUST be the placeholder string "https://placehold.co/600x400.png".
    - \`photoHint\`: One or two keywords for a stock photo search (e.g., 'fusion cafe' or 'rooftop view').
    - \`types\`: An array with one value: ["restaurant"].
    - \`recommendedDishes\`: An optional array of strings containing 1-2 popular or signature dishes recommended for this fictional restaurant.
    
    Do NOT generate a 'place_id' field. Return ONLY the structured JSON object.`,
});

// Helper function to add a UUID and ensure photoUrl exists.
const processAIPlace = (item: AIPartialPlace): Place => ({
  ...item,
  place_id: uuidv4(),
  photoUrl: item.photoUrl || 'https://placehold.co/600x400.png',
  itemType: 'restaurant', // Explicitly set the itemType
});

const restaurantDiscoveryFlow = ai.defineFlow(
  {
    name: 'restaurantDiscoveryFlow',
    inputSchema: ExploreInputSchema,
    outputSchema: z.object({ restaurants: z.array(UpdatedAIPartialPlaceSchema) }),
  },
  async (input) => {
    try {
      const {output: aiOutput} = await prompt(input);
      
      if (!aiOutput || !aiOutput.restaurants) {
          throw new Error('The AI returned an empty or invalid structure for restaurants.');
      }
      
      return {
        restaurants: aiOutput.restaurants.map(processAIPlace),
      };
    } catch(e: any) {
      console.error("Error in restaurantDiscoveryFlow:", e);
      throw new Error(
          `The AI had trouble dreaming up restaurants. Please check your inputs or the AI service. Full error: ${e.message}`
      );
    }
  }
);
