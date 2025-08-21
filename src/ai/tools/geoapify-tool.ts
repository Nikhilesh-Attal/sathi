import axios from "axios";

const GEOAPIFY_KEY = process.env.GEOAPIFY_KEY as string;

export interface GeoapifyPlace {
  name: string;
  category: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  distance?: number;
  rating?: number;
  source: string;
}

export interface GeoapifyParams {
  lat: number;
  lon: number;
  radius: number;
  categories?: string;
  limit?: number;
}

export async function fetchPlacesFromGeoapify(
  lat: number, 
  lon: number, 
  radius: number = 5000,
  categories: string = "tourism.sights"
): Promise<GeoapifyPlace[]> {
  try {
    console.log(`[Geoapify] Fetching places for lat: ${lat}, lon: ${lon}, radius: ${radius}m`);
    
    // Use Places API instead of tile API
    const response = await axios.get("https://api.geoapify.com/v2/places", {
      params: {
        categories: categories,
        filter: `circle:${lon},${lat},${radius}`,
        bias: `proximity:${lon},${lat}`,
        limit: 20,
        apiKey: GEOAPIFY_KEY,
      },
      timeout: 10000
    });

    if (!response.data?.features) {
      console.log('[Geoapify] No features found in response');
      return [];
    }

    const places: GeoapifyPlace[] = response.data.features.map((feature: any) => {
      const properties = feature.properties;
      const geometry = feature.geometry;
      
      return {
        name: properties.name || properties.formatted || 'Unknown Place',
        category: properties.categories?.[0] || categories,
        address: properties.formatted || properties.address_line1 || '',
        coordinates: {
          latitude: geometry.coordinates[1],
          longitude: geometry.coordinates[0]
        },
        distance: properties.distance ? Math.round(properties.distance) : undefined,
        rating: properties.rating,
        source: 'geoapify'
      };
    });

    console.log(`[Geoapify] ✅ Successfully fetched ${places.length} places`);
    return places;

  } catch (error: any) {
    console.error("[Geoapify] ❌ Error fetching places:", {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    // Return empty array instead of null for consistency
    return [];
  }
}

export async function fetchHotelsFromGeoapify(
  lat: number, 
  lon: number, 
  radius: number = 5000
): Promise<GeoapifyPlace[]> {
  return fetchPlacesFromGeoapify(lat, lon, radius, "accommodation.hotel");
}

export async function fetchRestaurantsFromGeoapify(
  lat: number, 
  lon: number, 
  radius: number = 5000
): Promise<GeoapifyPlace[]> {
  return fetchPlacesFromGeoapify(lat, lon, radius, "catering.restaurant");
}

export async function geocodeWithGeoapify(address: string): Promise<{
  latitude: number;
  longitude: number;
  formatted_address: string;
} | null> {
  try {
    const response = await axios.get("https://api.geoapify.com/v1/geocode/search", {
      params: {
        text: address,
        apiKey: GEOAPIFY_KEY,
        limit: 1
      },
      timeout: 10000
    });

    if (!response.data?.features?.length) {
      return null;
    }

    const feature = response.data.features[0];
    const [longitude, latitude] = feature.geometry.coordinates;

    return {
      latitude,
      longitude,
      formatted_address: feature.properties.formatted
    };

  } catch (error: any) {
    console.error("[Geoapify] ❌ Geocoding error:", error.message);
    return null;
  }
}

export async function reverseGeocodeWithGeoapify(
  lat: number, 
  lon: number
): Promise<string | null> {
  try {
    const response = await axios.get("https://api.geoapify.com/v1/geocode/reverse", {
      params: {
        lat,
        lon,
        apiKey: GEOAPIFY_KEY
      },
      timeout: 10000
    });

    if (!response.data?.features?.length) {
      return null;
    }

    return response.data.features[0].properties.formatted;

  } catch (error: any) {
    console.error("[Geoapify] ❌ Reverse geocoding error:", error.message);
    return null;
  }
}

export function normalizeGeoapifyResult(item: any) {
  return {
    id: `${item.name}-${item.coordinates.latitude}-${item.coordinates.longitude}`,
    name: item.name,
    lat: item.coordinates.latitude,
    lon: item.coordinates.longitude,
    category: item.category,
    address: item.address,
    distance: item.distance,
    source: "geoapify"
  };
}
