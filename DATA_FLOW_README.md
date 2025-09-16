# Sathi Travel App - Data Flow Documentation

## Overview
Sathi is a comprehensive travel companion app that helps users discover places, plan trips, and get translations. The app uses multiple data sources and AI models to provide rich, localized travel information.

## Data Sources & Flow Order

The app follows a specific order when fetching place data to ensure the best quality and most relevant results:

### 1. Primary Data Flow (Place Discovery)
**Order: Qdrant → RapidAPI → Geoapify → OSM → OpenTripMap → AI**

1. **Qdrant Vector Database** (`src/services/qdrant-service.ts`)
   - Semantic search for places using vector embeddings
   - Best for finding contextually similar places
   - Used primarily for Indian locations with optimized search radii

2. **RapidAPI Travel Places** (`src/services/rapidapi-service.ts`)
   - Commercial travel API with curated data
   - Falls back when Qdrant has no results
   - Provides high-quality, tourist-focused places

3. **Geoapify** (`src/services/geoapify-service.ts`)
   - Comprehensive location data with categories (places, hotels, restaurants)
   - Excellent coverage for global locations
   - Returns structured data with ratings and photos

4. **OpenStreetMap (OSM)** (`src/services/osm-service.ts`)
   - Open-source geographic database
   - Good for general location information
   - Falls back for areas with limited commercial data

5. **OpenTripMap** (`src/services/opentripmap-service.ts`)
   - Tourist attractions and points of interest
   - Cultural and historical sites focus
   - Wikipedia integration for detailed descriptions

6. **AI Fallback** (`src/ai/flows/place-discovery-flow.ts`)
   - **Model**: OpenRouter's DeepSeek via OpenAI-compatible API
   - **Purpose**: Generate place suggestions when all other sources fail
   - **Configuration**: Configured in `src/lib/genkit.ts`
   - **Constraints**: Limited response length, no repeated content

### 2. Translation System (`src/ai/flows/google-translate-flow.ts`)

**Translation Flow: Offline Basic → Google Translate → LibreTranslate → Fallback**

1. **Offline Basic Translations**
   - Hardcoded translations for common phrases
   - Instant response, no network required
   - Supports: English ↔ Bengali, Hindi, Gujarati, Punjabi, Tamil, Telugu, Spanish, French

2. **Google Translate API** (`@vitalets/google-translate-api`)
   - Primary translation service
   - High accuracy for most language pairs
   - Free tier with usage limits

3. **LibreTranslate** (configurable via `LIBRETRANSLATE_URL`)
   - Open-source translation API fallback
   - Default: `https://libretranslate.de/translate`
   - Timeout: 8 seconds

4. **Graceful Fallback**
   - Returns original text with "[Translation unavailable]" prefix
   - Never crashes the application

### 3. AI Assistant (`src/lib/genkit.ts`)
**Model**: Google Gemini via `@genkit-ai/googleai`
- Used for general assistance and travel advice
- Separate from the place discovery AI

## Key Features

### Caching System (`src/services/cache-service.ts`)
- In-memory LRU cache for API responses
- Reduces API calls and improves response times
- Configurable TTL (Time To Live) per cache type

### Location Context (`src/contexts/live-location-context.tsx`)
- Real-time location tracking
- Place discovery triggers based on location changes
- Efficient data fetching with proper cleanup

### Error Handling
- Comprehensive fallback strategies for all services
- Graceful degradation when services are unavailable
- User-friendly error messages

## Configuration

### Environment Variables
- `QDRANT_URL` - Qdrant database endpoint
- `QDRANT_API_KEY` - Qdrant authentication
- `RAPIDAPI_KEY` - RapidAPI authentication
- `GEOAPIFY_API_KEY` - Geoapify service key
- `OPENROUTER_API_KEY` - OpenRouter/DeepSeek API key
- `LIBRETRANSLATE_URL` - Custom LibreTranslate endpoint (optional)
- `GOOGLE_AI_API_KEY` - Google Gemini API key

### Supported Languages
- **English** (en)
- **Bengali** (bn)  
- **Hindi** (hi)
- **Gujarati** (gu)
- **Punjabi** (pa)
- **Tamil** (ta)
- **Telugu** (te)
- **Spanish** (es)
- **French** (fr)
- **German** (de)
- **Japanese** (ja)
- **Chinese** (zh)
- **Arabic** (ar)

## Development

### Running the App
```bash
npm run dev
```
Server runs on `http://localhost:9002`

### Key Files
- `src/app/api/search/route.ts` - Main search endpoint
- `src/services/explore-flow.ts` - Orchestrates data source calls
- `src/contexts/live-location-context.tsx` - Location management
- `src/lib/genkit.ts` - AI model configurations

### Testing
The app includes comprehensive logging for debugging data flow:
- `[Qdrant]` - Vector database operations
- `[RapidAPI]` - Commercial API calls  
- `[Geoapify]` - Location service calls
- `[translateText]` - Translation attempts
- `[Cache]` - Cache operations

## Architecture Benefits

1. **Resilience**: Multiple fallbacks ensure the app always provides results
2. **Performance**: Caching and efficient data source ordering
3. **Accuracy**: Combines multiple data sources for comprehensive coverage
4. **Offline Support**: Basic translations work without internet
5. **Scalability**: Modular service architecture allows easy additions
6. **User Experience**: Graceful degradation maintains functionality

## Troubleshooting

### Common Issues
1. **Translation failures**: Check if phrase exists in BASIC_TRANSLATIONS
2. **No place results**: Verify API keys and internet connectivity
3. **Slow responses**: Check cache configuration and API timeouts
4. **Location issues**: Ensure location permissions are granted

### Logs to Monitor
- API response times and success rates
- Cache hit/miss ratios  
- Translation fallback usage
- AI generation requests and responses