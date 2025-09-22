
// src/lib/types.ts
export type { TranslatorInput, TranslatorOutput } from '@/lib/schemas';
export type { TtsInput, TtsOutput } from '@/ai/flows/tts-flow';
export type { ExploreInput, ExploreOutput } from '@/lib/schemas';
export type { AssistantInput, AssistantOutput } from '@/lib/schemas';

// Extended Place type for UI
export interface Place {
  place_id: string;
  name: string;
  description?: string;
  vicinity?: string;
  rating?: number;
  photoUrl?: string;
  photoHint?: string;
  types?: string[];
  point?: { lat: number, lon: number };
  itemType: 'place' | 'hotel' | 'restaurant' | 'user';
  // Optional fields for new API structure
  city?: string;
  address?: string;
  imageUrl?: string;
  createdAt?: number;
  // Alternative coordinate formats (for different APIs)
  latitude?: number;
  longitude?: number;
  geometry?: {
    location?: {
      lat: number;
      lng: number;
    };
  };
  formatted_address?: string;
  photos?: Array<{photo_reference: string}>;
}

// A unified type for any item that can be saved. It's based on the Google Place schema
// to ensure consistency across the application.
export interface SavedItem extends Place {
    savedType: 'place' | 'hotel' | 'restaurant'; // Type to know what it is
}

// Since there is no DB, this is now just a type definition for potential future use.
export interface SavedPlan {
    planId: string;
    userId: string;
    savedAt: string; // ISO date string
    sourceQuery?: {
        destination: string;
        duration: number;
        budget: string;
    }
}
