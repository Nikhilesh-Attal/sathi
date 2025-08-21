
'use server';

/**
 * @fileOverview Free text translation flow using the LibreTranslate API.
 *
 * - translateText - Translates text from a source language to a target language.
 */
import {
  TranslatorInputSchema,
  TranslatorOutputSchema,
  type TranslatorOutput,
} from '@/lib/schemas';

// No Genkit or AI prompt needed for this simple API call.

const languageCodeMap: { [key: string]: string } = {
  english: 'en',
  spanish: 'es',
  french: 'fr',
  german: 'de',
  japanese: 'ja',
  chinese: 'zh',
  hindi: 'hi',
  arabic: 'ar',
  bengali: 'bn',
  gujarati: 'gu',
  kannada: 'kn',
  malayalam: 'ml',
  marathi: 'mr',
  punjabi: 'pa',
  tamil: 'ta',
  telugu: 'te',
};

export async function translateText(input: TranslatorInput): Promise<TranslatorOutput> {
  const sourceCode = languageCodeMap[input.sourceLanguage];
  const targetCode = languageCodeMap[input.targetLanguage];

  if (!sourceCode || !targetCode) {
    throw new Error('Invalid source or target language selected.');
  }

  try {
    const response = await fetch('https://translate.argosopentech.com/translate', {
  method: 'POST',
  body: JSON.stringify({
    q: input.text,
    source: sourceCode,
    target: targetCode,
    format: 'text',
  }),
  headers: {
    'Content-Type': 'application/json',
  },
});
    
    if (!response.ok) {
        const errorBody = await response.text();
        console.error('LibreTranslate API Error:', errorBody);
        throw new Error(`Translation service failed with status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(`LibreTranslate: ${data.error}`);
    }

    return { translatedText: data.translatedText };

  } catch (error: any) {
    console.error('Failed to fetch translation from LibreTranslate:', error);
    throw new Error(`Failed to connect to the translation service. ${error.message}`);
  }
}
