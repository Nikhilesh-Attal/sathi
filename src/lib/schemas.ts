
import { z } from 'zod';

// --- Itinerary / Planner Schemas ---
const ActivitySchema = z.object({
    time: z.string().describe("Suggested time for the activity (e.g., '9:00 AM' or 'Afternoon')."),
    description: z.string().describe("A detailed description of the activity, including what makes it interesting."),
    historicalInfo: z.string().optional().describe("Brief, interesting historical context or fun facts about the place or activity."),
});

const ItineraryDaySchema = z.object({
    day: z.number().describe('The day number of the itinerary (e.g., 1, 2, 3).'),
    title: z.string().describe('A catchy title for the day\u0027s plan (e.g., "Historical Heart of the City").'),
    activities: z.array(ActivitySchema).describe('An array of activities planned for the day.'),
});


// --- Comprehensive Planner (Now part of the Assistant) ---
const ComprehensivePlanOutputSchema = z.object({
  destinationName: z.string().describe("The full name of the destination city and country (e.g., 'Paris, France')."),
  travelSummary: z.string().describe("A summary of the trip's logistics, focusing on inter-city travel (e.g., flights, trains) and key accommodation advice."),
  itinerary: z.array(ItineraryDaySchema).describe('A detailed, day-by-day itinerary for the trip.'),
  totalEstimatedCost: z.number().describe('The total estimated cost for the entire trip in the specified currency.'),
  currency: z.string().describe('The currency symbol or code used for the estimation (e.g., $, ₹, €).'),
});


// --- AI Assistant ---
export const AssistantInputSchema = z.object({
  query: z.string().describe("The user's full request. This can be a simple question or a detailed request for a travel plan."),
  language: z.string().describe('The language the user is asking the question in (e.g., "en", "hi", "es").'),
  // Optional context for plan generation
  currentLocation: z.string().optional(),
  destination: z.string().optional(),
  duration: z.coerce.number().optional(),
  interests: z.string().optional(),
  budget: z.string().optional(),
  currency: z.string().optional(),
});
export type AssistantInput = z.infer<typeof AssistantInputSchema>;

export const AssistantOutputSchema = z.object({
  answer: z.string().describe('A helpful and relevant answer to the user\'s question. If the user asked for a travel plan, this should be a comprehensive, day-by-day itinerary formatted in Markdown. If it was a simple question, it should be a direct answer. It might also contain a table with transport options or a cost breakdown.'),
  planDetails: ComprehensivePlanOutputSchema.optional().describe('If a full plan was generated, this structured object contains the details. This can be used for more structured rendering on the client-side.')
});
export type AssistantOutput = z.infer<typeof AssistantOutputSchema>;


// --- Translator ---
export const TranslatorInputSchema = z.object({
  text: z.string(),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
});
export type TranslatorInput = z.infer<typeof TranslatorInputSchema>;

export const TranslatorOutputSchema = z.object({
  translatedText: z.string().describe('The translated text.'),
});
export type TranslatorOutput = z.infer<typeof TranslatorOutputSchema>;

// --- Text-to-Speech ---
export const TtsInputSchema = z.object({
  text: z.string().describe('The text to convert to speech.'),
});
export type TtsInput = z.infer<typeof TtsInputSchema>;

export const TtsOutputSchema = z.object({
  media: z.string().describe('The URL or base64 data of the audio file.'),
});
export type TtsOutput = z.infer<typeof TtsOutputSchema>;


// --- Place Discovery ---
export const ExploreInputSchema = z.object({
  latitude: z.number().describe("The user's latitude."),
  longitude: z.number().describe("The user's longitude."),
  offset: z.number().optional().describe("The offset for pagination (number of items to skip)."),
  limit: z.number().optional().describe("The maximum number of items to return per page."),
  loadMore: z.boolean().optional().describe("Flag to indicate if this is a load more request."),
  qualityFilter: z.enum(['all', 'good', 'excellent']).optional().describe("Data quality filter level for results."),
});
export type ExploreInput = z.infer<typeof ExploreInputSchema>;

export const PlaceSchema = z.object({
    place_id: z.string().describe("A unique ID for the place, generated as a UUID."),
    name: z.string().describe('The name of the place.'),
    description: z.string().optional().describe("A short, engaging, one-sentence description of the place for a travel app."),
    vicinity: z.string().optional().describe('A plausible-sounding address or general location.'),
    rating: z.number().optional().describe('A fictional user rating between 3.5 and 5.0.'),
    photoUrl: z.string().optional().describe("A placeholder URL for a photo of the place."),
    photoHint: z.string().optional().describe("One or two keywords for a stock photo, e.g., 'boutique hotel' or 'modern museum'."),
    types: z.array(z.string()).optional().describe("An array of types describing the place."),
    point: z.object({ lon: z.number(), lat: z.number() }).optional().describe("The geographic coordinates of the place."),
});
export type Place = z.infer<typeof PlaceSchema>;

export const ExploreOutputSchema = z.object({
  places: z.array(PlaceSchema).describe('An array of suggested fictional places to visit.'),
  hotels: z.array(PlaceSchema).describe('An array of suggested fictional hotels.'),
  restaurants: z.array(PlaceSchema).describe('An array of suggested fictional restaurants.'),
});
export type ExploreOutput = z.infer<typeof ExploreOutputSchema>;
