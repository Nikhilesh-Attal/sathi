// src/lib/normalizers.ts
type RawItem = {
  name?: string;
  category?: string;
  address?: string;
  coordinates?: { latitude?: number; longitude?: number };
  point?: { lon?: number; lat?: number };
  types?: string[];           // if some source already provides it
  source?: string;
  // ...any other source-specific fields
};

type SchemaItem = {
  place_id: string;
  name: string;
  description?: string;
  vicinity?: string;
  rating?: number;
  photoUrl?: string;
  photoHint?: string;
  types?: string[];
  point?: { lon: number; lat: number };
  [k: string]: any; // allow additionalProperties
};

const rand = (min: number, max: number) => Math.random() * (max - min) + min;

// Safe UUID (uses Web Crypto if available, else fallback)
export function makeUUID(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // RFC4122-ish fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function buildPhotoHint(category?: string, kind?: "place" | "hotel" | "restaurant"): string {
  const c = (category || "").toLowerCase();
  if (kind === "hotel" || c.includes("accommodation")) return "boutique hotel";
  if (kind === "restaurant" || c.includes("catering")) return "cozy restaurant";
  if (c.includes("museum")) return "modern museum";
  if (c.includes("temple") || c.includes("building")) return "historic landmark";
  return "city landmark";
}

function buildTypes(category?: string, kind?: "place" | "hotel" | "restaurant"): string[] {
  const arr = new Set<string>();
  if (category) arr.add(category);
  if (kind) arr.add(kind);
  return Array.from(arr).filter(Boolean);
}

function toLonLat(raw: RawItem): { lon: number; lat: number } | undefined {
  // prefer explicit point.first
  if (raw.point?.lon != null && raw.point?.lat != null) {
    return { lon: Number(raw.point.lon), lat: Number(raw.point.lat) };
  }
  // fallback to coordinates.latitude/longitude -> point.lon/lat
  const lat = raw.coordinates?.latitude;
  const lon = raw.coordinates?.longitude;
  if (lat != null && lon != null) return { lon: Number(lon), lat: Number(lat) };
  return undefined;
}

function sanitizeName(n?: string, fallback = "Unknown"): string {
  if (!n || !n.trim()) return fallback;
  return n.trim();
}

export function normalizeItem(
  raw: RawItem,
  kind: "place" | "hotel" | "restaurant"
): SchemaItem | null {
  const name = sanitizeName(raw.name);
  const point = toLonLat(raw);
  if (!name || !point) {
    // cannot satisfy schema
    return null;
  }

  const place_id = makeUUID();
  const rating = Number(rand(3.7, 4.9).toFixed(1)); // 3.7–4.9 feels realistic
  const photoHint = buildPhotoHint(raw.category, kind);
  const types = buildTypes(raw.category, kind);

  // lightweight, reliable placeholder that won’t break offline
  const photoUrl = `https://picsum.photos/seed/${encodeURIComponent(place_id)}/800/600`;

  const descriptionByKind =
    kind === "hotel"
      ? "A comfortable stay with easy access to nearby sights."
      : kind === "restaurant"
      ? "A crowd-favorite spot known for its flavors and warm vibe."
      : "A popular local highlight worth a visit.";

  const item: SchemaItem = {
    place_id,
    name,
    description: descriptionByKind,
    vicinity: raw.address || "",
    rating,
    photoUrl,
    photoHint,
    types,
    point,
    source: raw.source || "generated",
  };

  return item;
}

// Remove near-duplicates based on name + vicinity
export function dedupe(items: SchemaItem[]): SchemaItem[] {
  const seen = new Set<string>();
  const out: SchemaItem[] = [];
  for (const it of items) {
    const key = `${(it.name || "").toLowerCase()}|${(it.vicinity || "").toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(it);
    }
  }
  return out;
}

// Normalize a list defensively
export function normalizeList(
  raws: RawItem[] | undefined | null,
  kind: "place" | "hotel" | "restaurant"
): SchemaItem[] {
  if (!Array.isArray(raws)) return [];
  const mapped = raws
    .map((r) => normalizeItem(r, kind))
    .filter((x): x is SchemaItem => x !== null);
  return dedupe(mapped);
}
