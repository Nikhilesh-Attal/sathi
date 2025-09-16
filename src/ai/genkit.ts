import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {openAI} from 'genkitx-openai';

// Main AI instance for assistant (using Gemini)
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-1.5-flash-latest',
});

// Separate AI instance for place discovery (using OpenRouter DeepSeek)
export const placeAI = genkit({
  plugins: [
    openAI({
      apiKey: process.env.OPENAI_API_KEY, // This is the OpenRouter API key
      baseUrl: 'https://openrouter.ai/api/v1',
    })
  ],
  model: 'openai/deepseek/deepseek-r1:free',
});
