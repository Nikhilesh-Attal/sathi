
'use server';
/**
 * @fileOverview A Genkit tool for finding transport options between two cities.
 * This tool simulates fetching real-time data for flights and trains.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Input schema for the transport tool
const TransportToolInputSchema = z.object({
  fromCity: z.string().describe('The departure city.'),
  toCity: z.string().describe('The arrival city.'),
});

// Output schema for the transport tool
const TransportToolOutputSchema = z.array(
  z.object({
    type: z.enum(['Flight', 'Train']).describe('The mode of transport.'),
    duration: z.string().describe('Estimated travel time (e.g., "3 hours", "1h 45m").'),
    cost: z.string().describe('Estimated cost (e.g., "Rs. 1500", "Rs. 2500").'),
    provider: z.string().describe('The name of the airline or train company (e.g., "IndiGo", "Indian Railways").'),
  })
);

/**
 * A mock function to simulate fetching transport data.
 * In a real application, this would call an external API.
 */
async function getMockTransportData(from: string, to: string) {
  // Simple deterministic "mock" data based on city names
  const fromCityCode = from.slice(0, 3).toUpperCase();
  const toCityCode = to.slice(0, 3).toUpperCase();
  const combinedLength = from.length + to.length;

  return [
    {
      type: 'Flight',
      duration: `${Math.floor(combinedLength / 5)}h ${combinedLength % 60}m`,
      cost: `Rs. ${(combinedLength * 950) % 15000}`,
      provider: `Air ${from.charAt(0)}`,
    },
    {
      type: 'Flight',
      duration: `${Math.floor(combinedLength / 6)}h ${combinedLength % 60}m`,
      cost: `Rs. ${(combinedLength * 1200) % 18000}`,
      provider: `Fly${to.slice(0, 3)}`,
    },
    {
      type: 'Train',
      duration: `${combinedLength}h 30m`,
      cost: `Rs. ${(combinedLength * 200) % 3000}`,
      provider: `${fromCityCode} to ${toCityCode} Express`,
    },
  ];
}


// Define the Genkit Tool
export const findTransportOptionsTool = ai.defineTool(
  {
    name: 'findTransportOptionsTool',
    description: 'Finds real-time transport options (flights, trains) between two cities, including duration and cost.',
    inputSchema: TransportToolInputSchema,
    outputSchema: TransportToolOutputSchema,
  },
  async (input) => {
    console.log(`[Tool: findTransportOptionsTool] Called with: From: ${input.fromCity}, To: ${input.toCity}`);
    // Here, we call our mock data function.
    // In a real app, you would replace this with a call to an actual travel API.
    return getMockTransportData(input.fromCity, input.toCity);
  }
);
