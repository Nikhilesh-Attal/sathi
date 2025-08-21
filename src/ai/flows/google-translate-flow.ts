'use server';

/**
 * @fileOverview Official Google Cloud Translation flow using Genkit.
 *
 * - translateText - Translates text from a source language to a target language.
 */

const translate = require('google-translate-api');
import { TranslatorInputSchema, TranslatorOutputSchema, type TranslatorInput, type TranslatorOutput } from '@/lib/schemas';

export async function translateText(input: TranslatorInput): Promise<TranslatorOutput> {
  try {
    // Validate input
    const validatedInput = TranslatorInputSchema.parse(input);
    if (!validatedInput.text || !validatedInput.text.trim()) {
      throw new Error('Text to translate cannot be empty.');
    }

    // Check if languages are supported (basic validation)
    const supportedLanguages = ['en', 'hi', 'bn', 'gu', 'kn', 'ml', 'mr', 'pa', 'ta', 'te', 'es', 'fr', 'de', 'ja', 'zh', 'ar'];
    if (!supportedLanguages.includes(validatedInput.sourceLanguage) || !supportedLanguages.includes(validatedInput.targetLanguage)) {
      throw new Error('Unsupported language code provided.');
    }

    const res = await translate(validatedInput.text, {
      from: validatedInput.sourceLanguage,
      to: validatedInput.targetLanguage,
    });
    return TranslatorOutputSchema.parse({ translatedText: res.text });
  } catch (err) {
    console.error('Translation error:', err);
    if (err instanceof Error && err.message.includes('BAD_REQUEST')) {
      throw new Error('Invalid request to translation service. Please check language codes or text input.');
    }
    throw new Error('Translation failed.');
  }
}