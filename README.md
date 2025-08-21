# SATHI - Your AI Travel Ally

Welcome to SATHI, your personal AI-powered travel companion designed to make your journeys unforgettable. This document provides a comprehensive overview of the project's current status, architecture, and features.

## Core Mission

SATHI is a smart travel assistant, not just a booking platform. It helps users plan their trips, discover new places, and navigate their travels with confidence by providing intelligent, AI-driven guidance. The goal is to make travel planning as exciting as the trip itself.

---

## Current Project Status: Hybrid AI Model

The application currently operates on a hybrid model that leverages Google's powerful Gemini models via the Genkit framework while incorporating robust caching strategies to minimize costs and improve performance.

### Key Architectural Principles in Use:

1.  **Centralized AI with Genkit**: All AI-powered features are currently routed through Genkit, which interacts with the Google Gemini family of models (`gemini-1.5-flash-latest`, `gemini-2.0-flash-preview-image-generation`, `gemini-2.5-flash-preview-tts`).

2.  **Aggressive Firestore Caching**: To reduce redundant AI calls, the application employs a Firestore-backed caching strategy for its most expensive operations.
    *   **Trip Plans**: When a plan for a specific destination and duration is generated, it is saved to a shared `trips` collection. Subsequent requests for the same plan are served from this cache, avoiding new AI calls.
    *   **Travel Guide**: Answers to common questions in the AI Travel Guide are cached. If a user asks a question that has been answered before, the response is retrieved from the cache.
    *   **Place Discovery**: Data from the free OpenStreetMap API is cached to prevent re-fetching data for the same geographic coordinates.

3.  **Rule-Based Logic as a First Pass**: The "Explore Nearby" feature prioritizes fetching real-world data from the free OpenStreetMap API. Only if this source fails or returns no results does the system fall back to using AI to generate creative, fictional places.

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
