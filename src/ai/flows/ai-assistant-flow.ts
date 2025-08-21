'use server';

/**
 * @fileOverview A unified AI assistant flow that combines travel planning and guidance.
 * This flow can generate a comprehensive multi-day itinerary or answer specific travel-related questions.
 *
 * - aiAssistant - The main function that routes the user's query.
 * - AssistantInput - The input schema for the assistant.
 * - AssistantOutput - The output schema for the assistant.
 */

import { ai } from '@/ai/genkit';
import { findTransportOptionsTool } from '@/ai/tools/find-transport-options-tool';
import { estimateTripCostTool } from '@/ai/tools/trip-cost-tool';
import {
  AssistantInputSchema,
  AssistantOutputSchema,
  type AssistantInput,
  type AssistantOutput,
} from '@/lib/schemas';
import { getFromCache, setInCache, createCacheKey } from '@/lib/cache';

export async function aiAssistant(input: AssistantInput): Promise<AssistantOutput> {
  return assistantFlow(input);
}

const assistantPrompt = ai.definePrompt({
  name: 'aiAssistantPrompt',
  input: { schema: AssistantInputSchema },
  output: { schema: AssistantOutputSchema },
  tools: [findTransportOptionsTool, estimateTripCostTool],
  
  prompt: `You are SATHI, a master AI travel consultant. Your primary goal is to provide comprehensive, well-structured, and helpful information. You must analyze the user's query and determine if they are asking for a full travel plan or a specific question.

**User's Query:** {{query}}
**Language:** {{language}}
**Context (if provided):**
- From: {{{currentLocation}}}
- To: {{{destination}}}
- Duration: {{{duration}}} days
- Interests: {{{interests}}}
- Budget: {{{budget}}}
- Preferred Currency: {{{currency}}}

---

**Scenario 1: User asks for a full travel plan.**
If the query looks like a request for an itinerary (e.g., "plan a 5-day trip to Paris," "what can I do for a week in Tokyo?"), you MUST generate a complete plan.
  1.  **Generate Plan Details**: Create the full, structured \`planDetails\` object.
      *   \`destinationName\`: Full name of the city and country.
      *   \`travelSummary\`: Use \`findTransportOptionsTool\` to find travel options. Mention typical times and costs.
      *   \`itinerary\`: A detailed, day-by-day itinerary. Each activity must have a time, description, and an interesting \`historicalInfo\` fact for landmarks.
      *   \`totalEstimatedCost\`: You MUST use the \`estimateTripCostTool\` to get a total cost in the specified \`currency\`.
  2.  **Generate Formatted Answer**: Create a beautifully formatted Markdown string for the \`answer\` field that presents all the information from \`planDetails\`. Use headings, bold text, and lists to make it easy to read.

**Scenario 2: User asks a specific question.**
If the query is a question (e.g., "how to get from Delhi to Agra?", "what's the best food in Rome?", "tell me about the Eiffel Tower"), you must provide a direct, helpful answer.
  1.  **Use Tools if Necessary**:
      *   For transport questions ("how to get from A to B"), use \`findTransportOptionsTool\` and present the results in a clear Markdown table in your \`answer\`.
      *   For cost questions ("how much for...?"), use \`estimateTripCostTool\` and state the estimated cost clearly in your \`answer\`.
  2.  **General Knowledge**: For questions about culture, history, food, etc., answer based on your expertise. Include interesting facts and suggestions (e.g., recommend dishes for restaurants, share historical context for landmarks).
  3.  **Answer Formatting**: Format the \`answer\` field clearly using Markdown.
  4.  **No Plan Details**: In this scenario, the \`planDetails\` field in the output should be null or omitted.

**Final Instruction**: Always respond in the user's specified \`language\`. Your final response must be ONLY the structured JSON object matching the \`AssistantOutputSchema\`.
`,
});

// Define the main flow
const assistantFlow = ai.defineFlow(
  {
    name: 'assistantFlow',
    inputSchema: AssistantInputSchema,
    outputSchema: AssistantOutputSchema,
  },
  async (input) => {
    // 1. Create a unique cache key based on the query.
    const cacheKeyPrefix = `assistant_${input.query}`.replace(/\s+/g, '_').toLowerCase();
    const cacheKey = createCacheKey(0, 0, cacheKeyPrefix);

    // 2. Check cache first.
    const cachedData = await getFromCache(cacheKey);
    if (cachedData) {
      console.log(`[assistantFlow] Cache HIT for key: ${cacheKey}. Returning cached response.`);
      return cachedData;
    }

    console.log(`[assistantFlow] Cache miss for key: ${cacheKey}. Generating new response.`);

    try {
      const { output } = await assistantPrompt(input);
      if (!output) {
        throw new Error('The AI failed to generate a valid response.');
      }

      // 3. Store the successful response in the cache.
      await setInCache(cacheKey, output);

      return output;
    } catch (e: any) {
      console.error("[assistantFlow] Full error object:", e);
      // Provide a more detailed, user-friendly error message.
      throw new Error(
        `The AI Assistant encountered an issue. It may be due to a tool failure or network problem. Please try again. Original Error: ${e.message}`
      );
    }
  }
);