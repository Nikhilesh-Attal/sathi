'use server';

import { aiAssistant, type AssistantInput, type AssistantOutput } from '@/ai/flows/ai-assistant-flow';
import { translateText, type TranslatorInput } from '@/ai/flows/google-translate-flow';
import { textToSpeech, type TtsInput } from '@/ai/flows/tts-flow';
import { explorePlaces, type ExploreInput } from '@/ai/flows/explore-flow';
import { discoverPlaces } from '@/ai/flows/place-discovery-flow';

export async function getAiAssistantResponse(input: AssistantInput): Promise<{ success: true; data: AssistantOutput } | { success: false; error: string }> {
  try {
    console.log('[getAiAssistantResponse] Calling AI assistant with input:', input);
    const result = await aiAssistant(input);
    return { success: true, data: result };
  } catch (error: any) {
    console.error('[getAiAssistantResponse] Error:', error);
    const message = error.message || 'The AI assistant encountered an unexpected error.';
    return { success: false, error: message };
  }
}

export async function getTranslation(input: TranslatorInput): Promise<{ success: true; data: any } | { success: false; error: string }> {
  try {
    const result = await translateText(input);
    return { success: true, data: result };
  } catch (error: any) {
    console.error('[getTranslation] Error:', error);
    const message = error.message || 'Failed to translate text. Please try again.';
    return { success: false, error: message };
  }
}

export async function convertTextToSpeech(input: TtsInput): Promise<{ success: true; data: any } | { success: false; error: string }> {
  try {
    const result = await textToSpeech(input);
    return { success: true, data: result };
  } catch (error: any) {
    console.error('[convertTextToSpeech] Error:', error);
    const message = error.message || 'Failed to convert text to speech. Please try again.';
    return { success: false, error: message };
  }
}

export async function exploreNearby(input: ExploreInput): Promise<{ success: true; data: any } | { success: false; error: string }> {
  try {
    console.log('[exploreNearby] Starting hybrid explore flow...');
    let result = await explorePlaces(input);

    const hasResults = result.places.length > 0 || result.hotels.length > 0 || result.restaurants.length > 0;

    if (!hasResults) {
      console.log('[exploreNearby] Hybrid flow (Qdrant/OSM) returned no results. Falling back to AI discovery.');
      result = await discoverPlaces(input);
    }
    
    const combined = [
      ...result.places.map((p: any) => ({ ...p, itemType: 'place' as const })),
      ...result.hotels.map((h: any) => ({ ...h, itemType: 'hotel' as const })),
      ...result.restaurants.map((r: any) => ({ ...r, itemType: 'restaurant' as const })),
    ];

    console.log('[exploreNearby] Combined results:', combined);
    
    const source = hasResults ? 'qdrant_or_osm' : 'ai';
    return { success: true, data: { places: combined, source } };
  } catch (error: any) {
    console.error('[exploreNearby] Error in primary flow:', error);
    try {
      console.log('[exploreNearby] Primary flow failed. Attempting AI fallback as a last resort.');
      const result = await discoverPlaces(input);
      const combined = [
        ...result.places.map((p: any) => ({ ...p, itemType: 'place' as const })),
        ...result.hotels.map((h: any) => ({ ...h, itemType: 'hotel' as const })),
        ...result.restaurants.map((r: any) => ({ ...r, itemType: 'restaurant' as const })),
      ];
      return { success: true, data: { places: combined, source: 'ai' } };
    } catch (aiError: any) {
      console.error('[exploreNearby] Error in AI fallback:', aiError);
      const message = aiError.message || 'An unexpected error occurred while fetching places from all sources.';
      return { success: false, error: message };
    }
  }
}