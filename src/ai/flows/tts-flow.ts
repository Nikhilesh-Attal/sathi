
// 'use server';

// /**
//  * @fileOverview AI-powered text-to-speech flow.
//  *
//  * - textToSpeech - Converts text to speech.
//  * - TtsInput - The input type for the textToSpeech function.
//  * - TtsOutput - The return type for the textToSpeech function.
//  */

// import {ai} from '@/ai/genkit';
// import {z} from 'genkit';
// import {googleAI} from '@genkit-ai/googleai';
// import wav from 'wav';

// const TtsInputSchema = z.object({
//   text: z.string().describe('The text to convert to speech.'),
// });

// export type TtsInput = z.infer<typeof TtsInputSchema>;

// const TtsOutputSchema = z.object({
//   media: z.string().describe("The audio data URI in WAV format. Expected format: 'data:audio/wav;base64,<encoded_data>'."),
// });
// export type TtsOutput = z.infer<typeof TtsOutputSchema>;

// export async function textToSpeech(input: TtsInput): Promise<TtsOutput> {
//     return ttsFlow(input);
// }

// async function toWav(
//   pcmData: Buffer,
//   channels = 1,
//   rate = 24000,
//   sampleWidth = 2
// ): Promise<string> {
//   return new Promise((resolve, reject) => {
//     const writer = new wav.Writer({
//       channels,
//       sampleRate: rate,
//       bitDepth: sampleWidth * 8,
//     });

//     let bufs = [] as any[];
//     writer.on('error', reject);
//     writer.on('data', function (d) {
//       bufs.push(d);
//     });
//     writer.on('end', function () {
//       resolve(Buffer.concat(bufs).toString('base64'));
//     });

//     writer.write(pcmData);
//     writer.end();
//   });
// }

// const ttsFlow = ai.defineFlow(
//   {
//     name: 'ttsFlow',
//     inputSchema: TtsInputSchema,
//     outputSchema: TtsOutputSchema,
//   },
//   async (input) => {
//     const { media } = await ai.generate({
//       model: googleAI.model('gemini-2.5-flash-preview-tts'),
//       config: {
//         responseModalities: ['AUDIO'],
//         speechConfig: {
//           voiceConfig: {
//             prebuiltVoiceConfig: { voiceName: 'Algenib' },
//           },
//         },
//       },
//       prompt: input.text,
//     });

//     if (!media) {
//       throw new Error('No media returned from TTS model.');
//     }

//     const audioBuffer = Buffer.from(
//       media.url.substring(media.url.indexOf(',') + 1),
//       'base64'
//     );
    
//     const wavData = await toWav(audioBuffer);

//     return {
//       media: 'data:audio/wav;base64,' + wavData,
//     };
//   }
// );


'use server';

import { ai } from '@/ai/genkit';
import { TtsInputSchema, TtsOutputSchema, type TtsInput, type TtsOutput } from '@/lib/schemas';
import { googleAI } from '@genkit-ai/googleai';

export async function textToSpeech(input: TtsInput): Promise<TtsOutput> {
  try {
    const validatedInput = TtsInputSchema.parse(input);
    console.log('[textToSpeech] Input:', validatedInput);
    
    if (!validatedInput.text || !validatedInput.text.trim()) {
      throw new Error('Text to convert cannot be empty.');
    }

    // Try to use Gemini TTS first (if available)
    try {
      console.log('[textToSpeech] Attempting Gemini TTS...');
      
      const { media } = await ai.generate({
        model: 'googleai/gemini-1.5-flash-latest', // Use available model
        prompt: `Please provide text-to-speech for: "${validatedInput.text}"`,
      });

      if (media && media.url) {
        console.log('[textToSpeech] Gemini TTS success');
        return TtsOutputSchema.parse({ media: media.url });
      }
    } catch (geminiError) {
      console.warn('[textToSpeech] Gemini TTS not available:', geminiError);
    }

    // Fallback: Create a simple audio URL for Web Speech API to handle on client
    // This creates a data URL that the client can use with speechSynthesis
    console.log('[textToSpeech] Using client-side TTS fallback');
    const textData = encodeURIComponent(validatedInput.text);
    const audioData = `data:text/plain;charset=utf-8,${textData}`;
    
    return TtsOutputSchema.parse({ media: audioData });
  } catch (err: any) {
    console.error('[textToSpeech] Error:', err);
    throw new Error(`Failed to generate audio: ${err.message}`);
  }
}
