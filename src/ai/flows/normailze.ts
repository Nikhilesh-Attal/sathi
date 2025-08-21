import { v4 as uuidv4 } from "uuid";

export type Place = {
  place_id: string;
  name: string;
  description?: string;
  vicinity?: string;
  rating?: number;
  photoUrl?: string;
  photoHint?: string;
  types: string[];
  point: { lat: number; lon: number };
  source: string;
};

// ---- Normalizers ---- //

export function normalizeQdrantResult(item: any): Place {
  return {
    place_id: item.payload?.id || uuidv4(),
    name: item.payload?.name || "Unknown Place",
    description: item.payload?.description || "",
    vicinity: item.payload?.address || "",
    rating: item.payload?.rating || 4.2,
    photoUrl: item.payload?.photoUrl || "https://placehold.co/600x400?text=Place",
    photoHint: item.payload?.photoHint || "travel",
    types: item.payload?.types || ["place"],
    point: {
      lat: item.payload?.latitude || item.vector?.lat || 0,
      lon: item.payload?.longitude || item.vector?.lon || 0,
    },
    source: "qdrant",
  };
}

export function normalizeGeoapifyResult(item: any): Place {
  return {
    place_id: item.place_id || uuidv4(),
    name: item.name || item.properties?.name || "Unnamed Place",
    description: item.properties?.description || "",
    vicinity: item.properties?.formatted || "",
    rating: Math.random() * (5 - 3.5) + 3.5, // fake rating 3.5–5
    photoUrl: "https://placehold.co/600x400?text=Geoapify",
    photoHint: "geoapify location",
    types: item.properties?.categories || ["place"],
    point: {
      lat: item.properties?.lat || item.lat,
      lon: item.properties?.lon || item.lon,
    },
    source: "geoapify",
  };
}

export function normalizeOSMResult(item: any): Place {
  return {
    place_id: item.id?.toString() || uuidv4(),
    name: item.tags?.name || "Unnamed OSM Place",
    description: item.tags?.tourism || "",
    vicinity: item.tags?.addr_full || "",
    rating: Math.random() * (5 - 3.5) + 3.5,
    photoUrl: "https://placehold.co/600x400?text=OSM",
    photoHint: "map",
    types: [item.tags?.amenity || "place"],
    point: { lat: item.lat, lon: item.lon },
    source: "osm",
  };
}

export function normalizeFallbackResult(item: any): Place {
  return {
    place_id: uuidv4(),
    name: item.name,
    description: item.description,
    vicinity: item.address,
    rating: item.rating || 4,
    photoUrl: "https://placehold.co/600x400?text=Fallback",
    photoHint: item.category || "travel",
    types: [item.category || "place"],
    point: {
      lat: item.coordinates?.latitude,
      lon: item.coordinates?.longitude,
    },
    source: "ai-fallback",
  };
}
