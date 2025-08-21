
import { config } from 'dotenv';
config();

import '@/ai/flows/ai-assistant-flow.ts';
import '@/ai/flows/translator-flow.ts';
import '@/ai/flows/tts-flow.ts';
import '@/ai/flows/explore-flow.ts';
import '@/ai/flows/image-generation-flow.ts';
import '@/ai/flows/restaurant-discovery-flow.ts';
import '@/ai/flows/place-discovery-flow.ts';
import '@/ai/tools/find-transport-options-tool.ts';
import '@/ai/tools/trip-cost-tool.ts';
import '@/ai/tools/qdrant-tool.ts';
