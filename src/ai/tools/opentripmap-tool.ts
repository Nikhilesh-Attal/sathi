'use server';
/**
 * @fileOverview A function for interacting with the OpenTripMap API.
 */
import { z } from 'zod';
import type { Place } from '@/lib/types';

const OpenTripMapInputSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  radius: z.number(), // Made required to avoid undefined
  kinds: z.string().optional(), // Category filter (e.g., 'tourism', 'accommodation')
});

type OpenTripMapInput = z.infer<typeof OpenTripMapInputSchema>;

// Use environment variable for API key
const API_KEY = process.env.OPENTRIPMAP_API_KEY;
if (!API_KEY) {
  throw new Error('OPENTRIPMAP_API_KEY is not set in the environment variables.');
}

/**
 * Fetches places from OpenTripMap based on location and category.
 */
export async function fetchPlacesFromOpenTripMap(input: OpenTripMapInput): Promise<Place[]> {
  const { latitude, longitude, radius, kinds } = input;

  const url = new URL('https://api.opentripmap.com/0.1/en/places/radius');
  url.searchParams.append('radius', radius.toString());
  url.searchParams.append('lat', latitude.toString());
  url.searchParams.append('lon', longitude.toString());
  url.searchParams.append('apikey', API_KEY);
  if (kinds) url.searchParams.append('kinds', kinds);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[fetchPlacesFromOpenTripMap] OpenTripMap API Error: Status ${response.status}`, errorBody);
      throw new Error(`OpenTripMap API Error: Status ${response.status}`);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      console.log(`[fetchPlacesFromOpenTripMap] No results from OpenTripMap.`);
      return [];
    }

    // Transform OpenTripMap data into our internal `Place` schema
    return data.features.map((feature: any): Place => {
      const properties = feature.properties;
      return {
        place_id: properties.xid || properties.id || `otm-${Math.random().toString(36).slice(2)}`,
        name: properties.name || 'Unnamed Place',
        vicinity: properties.address || 'Address not available',
        rating: properties.rate || undefined,
        types: properties.kinds ? properties.kinds.split(',') : ['place'],
        point: { lat: feature.geometry.coordinates[1], lon: feature.geometry.coordinates[0] },
        photoUrl: properties.preview ? `https://api.opentripmap.com${properties.preview.source}` : 'https://placehold.co/600x400.png',
        photoHint: properties.kinds || 'place',
        description: properties.wikipedia_extracts?.text || `A ${properties.kinds || 'point of interest'} named ${properties.name}.`,
      };
    }).slice(0, 25); // Limit to 25 results per category
  } catch (error) {
    console.error('[fetchPlacesFromOpenTripMap] An exception occurred while calling OpenTripMap API:', error);
    return []; // Return empty array on error
  }
}