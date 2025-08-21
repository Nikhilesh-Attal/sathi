
'use server';
/**
 * @fileOverview A Genkit tool for estimating the cost of a trip using an AI model.
 * This provides more nuanced estimations than a simple rule-based system.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFromCache, setInCache, createCacheKey } from '@/lib/cache';

// Input schema for the cost estimation tool
const CostEstimationInputSchema = z.object({
  destination: z.string().describe('The destination city and country.'),
  duration: z.number().describe('The duration of the trip in days.'),
  budget: z.enum(['budget', 'mid-range', 'luxury']).describe('The travel style or budget level.'),
  currency: z.string().describe('The currency for the cost estimation (e.g., "INR", "USD", "EUR").'),
  startLocation: z.string().optional().describe('The starting city for the trip, if different from the destination.'),
});
type CostEstimationInput = z.infer<typeof CostEstimationInputSchema>;

// Output schema for the cost estimation tool
const CostEstimationOutputSchema = z.object({
  totalEstimatedCost: z.number().describe('The total estimated cost for the trip.'),
  currency: z.string().describe('The currency of the estimated cost.'),
});
export type CostEstimationOutput = z.infer<typeof CostEstimationOutputSchema>;


const costEstimatorPrompt = ai.definePrompt({
  name: 'tripCostEstimatorPrompt',
  input: { schema: CostEstimationInputSchema },
  output: { schema: CostEstimationOutputSchema },
  prompt: `You are an expert travel cost estimator. Based on the user's request, calculate a realistic total estimated cost for their trip.
  
  Consider factors like accommodation, food, local transport, and a buffer for activities.
  - Destination: {{destination}}
  - Duration: {{duration}} days
  - Budget Level: {{budget}}
  - Currency: {{currency}}
  - Starting From: {{startLocation}}

  If a start location is provided and is different from the destination, include an estimated cost for round-trip travel.
  
  Return ONLY the structured JSON object with the total cost and currency. Do not add any extra commentary.
  `,
});

// Define the Genkit Tool for trip cost estimation
export const estimateTripCostTool = ai.defineTool(
  {
    name: 'estimateTripCostTool',
    description: 'Estimates the total cost of a trip based on destination, duration, and budget level using an AI model. Can also include travel costs from a specified start location.',
    inputSchema: CostEstimationInputSchema,
    outputSchema: CostEstimationOutputSchema,
  },
  async (input: CostEstimationInput): Promise<CostEstimationOutput> => {
    console.log(`[Tool: estimateTripCostTool] Called with:`, input);

    // 1. Create a unique cache key
    const cacheKeyPrefix = `cost_${input.destination}_${input.duration}_${input.budget}_${input.currency}`.replace(/\s+/g, '_').toLowerCase();
    const cacheKey = createCacheKey(0, 0, cacheKeyPrefix);
    
    // 2. Check cache first
    const cachedData = await getFromCache(cacheKey);
    if (cachedData) {
      console.log(`[estimateTripCostTool] Cache HIT for key: ${cacheKey}`);
      return cachedData;
    }
    
    console.log(`[estimateTripCostTool] Cache MISS for key: ${cacheKey}. Calling AI.`);

    // 3. If cache miss, call the AI model
    const { output } = await costEstimatorPrompt(input);
    
    if (!output) {
      throw new Error('AI failed to generate a cost estimation.');
    }
    
    // 4. Store the result in cache for next time
    await setInCache(cacheKey, output);
    
    return output;
  }
);
