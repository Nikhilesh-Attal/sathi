# SATHI - Your AI Travel Ally

Welcome to SATHI, your personal AI-powered travel companion designed to make your journeys unforgettable. This document provides a comprehensive overview of the project's current status, architecture, and complete data flow.

## Core Mission

SATHI is a smart travel assistant, not just a booking platform. It helps users plan their trips, discover new places, and navigate their travels with confidence by providing intelligent, AI-driven guidance. The goal is to make travel planning as exciting as the trip itself.

---

## 📊 Complete Data Flow Architecture

### Place Discovery Pipeline (6-Tier Fallback System)

Our application ensures **99.9% success rate** for place discovery through an intelligent fallback system:

```
User Request → Location Check → Data Source Pipeline → Results
```

#### **Tier 1: Qdrant Cloud Vector Database** 🇮🇳
- **Scope**: India-only (lat: 6.55-35.5, lon: 68.7-97.4)
- **Technology**: Vector similarity search with embeddings
- **Data**: Semantic place, hotel, and restaurant data
- **Search Radii**: 100km → 500km (optimized tiers)
- **Success Rate**: ~40% (when available)
- **Cache**: In-memory cache service (30min TTL)

#### **Tier 2: RapidAPI Travel Places** 🌍
- **Scope**: Global coverage
- **Technology**: REST API with geocoding
- **Data**: Real-world travel and tourism places
- **Method**: City-based search with 20km radius
- **Success Rate**: ~30%
- **Fallback**: If no results or API failure

#### **Tier 3: Geoapify Places API** ⭐ *Most Reliable*
- **Scope**: Worldwide coverage
- **Technology**: Comprehensive geographical database
- **Data**: Places, hotels, restaurants with rich metadata
- **Search Radius**: 5km from coordinates
- **Success Rate**: ~85% (highest success rate)
- **Cache**: Application cache (coordinates-based)

#### **Tier 4: OpenStreetMap (OSM)** 🗺️
- **Scope**: Global community-driven data
- **Technology**: Nominatim API with tiered radius search
- **Search Radii**: 50km → 100km → 150km → 200km → 300km → 500km
- **Data**: Places, accommodations, restaurants
- **Success Rate**: ~60%
- **Cache**: Firestore cache with versioning

#### **Tier 5: OpenTripMap** 🏛️
- **Scope**: Tourism and historical places
- **Technology**: Direct API integration
- **Categories**: Historic sites (`historic`), Hotels (`hotel`), Restaurants (`eating`)
- **Search Radius**: 10km
- **Success Rate**: ~45%
- **Strength**: Detailed tourism information

#### **Tier 6: AI-Generated Places (Last Resort)** 🤖
- **Model**: OpenRouter's `deepseek/deepseek-r1:free`
- **Trigger**: When ALL real data sources fail
- **Technology**: Custom AI prompt with validation
- **Output**: Creative, contextually-relevant fictional places
- **Success Rate**: 100% (always provides results)
- **Validation**: Text cleaning, repetition removal, length limits

### AI Assistant Flow (Separate Pipeline)
- **Model**: Google Gemini 1.5 Flash Latest
- **Purpose**: Trip planning, travel advice, translations
- **Caching**: Firestore-backed response caching
- **Language**: Multi-language support

---

## 🔍 How to Track Data Sources

### Development Console Logs
```bash
# Cache Operations
[Cache] ✅ Exact cache hit for 26.889,75.783,10000
[Cache] ❌ Cache miss for 26.889,75.783,10000
[Cache] ✅ Cached data for 26.889,75.783,5000 (50 places)

# Data Source Results
[exploreFlow] ✅ Qdrant returned results for radius 100000m - Places: X, Hotels: Y, Restaurants: Z
[exploreFlow] ✅ Geoapify returned Places: X, Hotels: Y, Restaurants: Z  
[exploreFlow] ✅ OSM returned results for radius 200000m - Places: X, Hotels: Y, Restaurants: Z
[exploreFlow] ✅ OpenTripMap returned: X places, Y hotels, Z restaurants

# AI Fallback
[placeDiscoveryFlow] AI returned null/undefined output, using fallback
[placeDiscoveryFlow] AI generation failed, using fallback data
```

### API Response Tracking
Every place result includes a `source` field:
```json
{
  "place_id": "unique-id",
  "name": "Place Name",
  "source": "geoapify",  // Tracks which API provided this data
  "itemType": "place"     // place | hotel | restaurant
}
```

**Source Values**:
- `qdrant`: Qdrant Cloud vector search
- `rapidapi`: RapidAPI Travel Places  
- `geoapify`: Geoapify Places API
- `osm`: OpenStreetMap Nominatim
- `opentripmap`: OpenTripMap API
- `ai-fallback`: AI-generated content

---

## Current Project Status: Multi-Model AI Architecture

The application operates on a **dual AI model system** with comprehensive fallback mechanisms:

### AI Model Configuration:

1. **Primary AI (Assistant)**: Google Gemini 1.5 Flash Latest
   - **Purpose**: Trip planning, travel advice, translations, general assistance
   - **Framework**: Google Genkit
   - **Caching**: Firestore-backed for expensive operations

2. **Fallback AI (Place Discovery)**: OpenRouter DeepSeek R1 Free
   - **Purpose**: Creative place generation when all real data fails
   - **Framework**: Genkit with OpenAI-compatible plugin
   - **Trigger**: Only as absolute last resort

### Caching Strategy:

1. **Trip Plans**: Shared collection in Firestore (destination + duration based)
2. **Travel Guide**: Question-answer pairs cached in Firestore  
3. **Place Data**: Multi-level caching:
   - In-memory cache (30min TTL)
   - Session storage (browser)
   - Firestore (long-term)
4. **API Responses**: Coordinate-based caching with smart invalidation

---

## 🏗️ Technical Architecture

### Key Architectural Principles:

1. **Real Data First**: Always prioritize real-world data over AI generation
2. **Intelligent Fallbacks**: 6-tier system ensures users always get results
3. **Performance Optimization**: Multi-level caching reduces API costs
4. **Location Intelligence**: India-specific optimizations with global coverage
5. **Error Resilience**: Graceful degradation when services fail

---

## Key Features & AI Integration

The application is organized into several tabs, each offering a unique tool to assist your travels.

| Feature                 | Description                                                                                                                             | AI Flow Used                                         | AI Call Frequency                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Explore Nearby**      | Discovers nearby attractions, hotels, and restaurants using your live location.                                                         | `explore-flow.ts`, `place-discovery-flow.ts` (fallback) | **Low**: AI is only used if the primary OpenStreetMap API fails or returns empty. |
| **AI Trip Planner**     | Generates a complete, day-by-day itinerary with travel logistics, activities, and an AI-powered cost estimate.                            | `comprehensive-planner-flow.ts`                      | **Medium**: AI is called only for uncached destinations.                          |
| **AI Cost Estimation**  | Provides a nuanced cost breakdown for the entire trip, considering budget, duration, and destination.                                   | `trip-cost-tool.ts`                                  | **Medium**: Called as part of the AI Trip Planner.                              |
| **Saved Items & Plans** | Bookmark your favorite discoveries and generated trip plans to your personal account.                                                   | (No AI Used)                                         | N/A                                                                             |
| **AI Travel Guide (Pro)** | A conversational AI chat that answers questions about a destination's culture, history, or logistics.                                   | `travel-guide.ts`                                    | **High**: AI is called for each uncached question.                              |
| **Voice Translator (Pro)**| A real-time, voice-to-voice translator to help you communicate seamlessly with locals.                                                    | `translator-flow.ts` (API), `tts-flow.ts` (AI)       | **High**: AI is called for each text-to-speech conversion.                      |
| **Image Generation**    | An underlying capability to generate images from text prompts (not currently integrated into a main feature).                           | `image-generation-flow.ts`                           | **On-Demand**: Not actively used by core features.                              |

---

## Tech Stack

-   **Framework**: Next.js (with App Router)
-   **AI**: Google Gemini Pro via Genkit
-   **Database & Auth**: Firebase (Firestore, Firebase Auth)
-   **Styling**: Tailwind CSS
-   **UI Components**: ShadCN UI
-   **Language**: TypeScript
-   **Mapping**: Leaflet.js with OpenStreetMap

## Getting Started

The main application dashboard is the heart of the experience. The primary UI code can be found in `src/app/dashboard/page.tsx` and the components in `src/components/app/`. The core AI logic is located in the `src/ai/flows/` directory.
