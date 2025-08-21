
'use server';

/**
 * @fileOverview A Genkit flow for generating images using Gemini.
 *
 * - generateImage - Takes a text prompt and returns an image data URI.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define the input schema for the image generation flow
const ImageGenerationInputSchema = z.object({
  prompt: z.string().describe('A descriptive prompt for the image to be generated.'),
});
export type ImageGenerationInput = z.infer<typeof ImageGenerationInputSchema>;

// Define the output schema for the image generation flow
const ImageGenerationOutputSchema = z.object({
  url: z.string().describe("The generated image as a data URI (e.g., 'data:image/png;base64,...')."),
});
export type ImageGenerationOutput = z.infer<typeof ImageGenerationOutputSchema>;


// The exported function that other flows can call.
export async function generateImage(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
  return imageGenerationFlow(input);
}


// Define the flow that calls the Gemini image generation model
const imageGenerationFlow = ai.defineFlow(
  {
    name: 'imageGenerationFlow',
    inputSchema: ImageGenerationInputSchema,
    outputSchema: ImageGenerationOutputSchema,
  },
  async ({ prompt }) => {
    try {
      console.log(`[imageGenerationFlow] Generating image for prompt: "${prompt}"`);
      
      const { media } = await ai.generate({
        // IMPORTANT: This specific model is required for image generation.
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: prompt,
        config: {
          // Both TEXT and IMAGE must be specified in the response modalities.
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      if (!media || !media.url) {
        throw new Error('Image generation failed to return a valid media object.');
      }

      console.log(`[imageGenerationFlow] Successfully generated image.`);
      return { url: media.url };

    } catch (error: any) {
      console.error(`[imageGenerationFlow] FULL ERROR for prompt "${prompt}":`, error);
      // Propagate a more detailed user-friendly error.
      throw new Error(`Failed to generate image. The AI may be unable to process the request due to API key issues, content policies, or service availability. Full error: ${error.message}`);
    }
  }
);
