'use server';

/**
 * @fileOverview Google Translation flow with fallback support.
 *
 * - translateText - Translates text from a source language to a target language.
 */

import { TranslatorInputSchema, TranslatorOutputSchema, type TranslatorInput, type TranslatorOutput } from '@/lib/schemas';
import { translate } from '@vitalets/google-translate-api';

// Helper: timeout wrapper for fetch
async function fetchWithTimeout(resource: string, options: RequestInit & { timeoutMs?: number } = {}) {
  const { timeoutMs = 8000, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // @ts-ignore Node 18+ global fetch
    const res = await fetch(resource, { ...rest, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// Basic offline translations for common phrases
const BASIC_TRANSLATIONS: Record<string, Record<string, string>> = {
  'hello will you help me': {
    bn: 'হ্যালো তুমি কি আমাকে সাহায্য করবে',
    hi: 'नमस्ते क्या आप मेरी मदद करेंगे',
    gu: 'હેલો તમે મને મદદ કરશો',
    pa: 'ਹੈਲੋ ਕੀ ਤੁਸੀਂ ਮੇਰੀ ਮਦਦ ਕਰੋਗੇ',
    ta: 'வணக்கம் நீங்கள் எனக்கு உதவுவீர்களா',
    te: 'నమస్కారం మీరు నాకు సహాయం చేస్తారా',
    es: 'hola me ayudarás',
    fr: 'salut tu vas m\'aider'
  },
  hello: {
    bn: 'হ্যালো',
    hi: 'नमस्ते',
    gu: 'નમસ્તે',
    pa: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ',
    ta: 'வணக்கம்',
    te: 'నమస్కారం',
    es: 'hola',
    fr: 'salut'
  },
  'thank you': {
    bn: 'ধন্যবাদ',
    hi: 'धन्यवाद',
    gu: 'આભાર',
    pa: 'ਧੰਨਵਾਦ',
    ta: 'நன்றி',
    te: 'ధన్యవాదాలు',
    es: 'gracias',
    fr: 'merci'
  },
  yes: {
    bn: 'হ্যাঁ',
    hi: 'हाँ',
    gu: 'હા',
    pa: 'ਹਾਂ',
    ta: 'ஆம்',
    te: 'అవును',
    es: 'sí',
    fr: 'oui'
  },
  no: {
    bn: 'না',
    hi: 'नहीं',
    gu: 'ના',
    pa: 'ਨਹੀਂ',
    ta: 'இல்லை',
    te: 'కాదు',
    es: 'no',
    fr: 'non'
  }
};

export async function translateText(input: TranslatorInput): Promise<TranslatorOutput> {
  try {
    // Validate input
    const validatedInput = TranslatorInputSchema.parse(input);
    console.log('[translateText] Input:', validatedInput);

    if (!validatedInput.text || !validatedInput.text.trim()) {
      throw new Error('Text to translate cannot be empty.');
    }

    // If source and target are the same, return the original text
    if (validatedInput.sourceLanguage === validatedInput.targetLanguage) {
      return { translatedText: validatedInput.text };
    }

    // Check if languages are supported
    const supportedLanguages = ['en', 'hi', 'bn', 'gu', 'kn', 'ml', 'mr', 'pa', 'ta', 'te', 'es', 'fr', 'de', 'ja', 'zh', 'ar'];
    if (!supportedLanguages.includes(validatedInput.sourceLanguage) || !supportedLanguages.includes(validatedInput.targetLanguage)) {
      throw new Error(`Unsupported language: ${validatedInput.sourceLanguage} or ${validatedInput.targetLanguage}`);
    }

    // Check basic offline translations first for common phrases
    const textLower = validatedInput.text.toLowerCase().trim();
    if (BASIC_TRANSLATIONS[textLower] && BASIC_TRANSLATIONS[textLower][validatedInput.targetLanguage]) {
      const basicTranslation = BASIC_TRANSLATIONS[textLower][validatedInput.targetLanguage];
      console.log('[translateText] Using basic offline translation:', basicTranslation);
      return { translatedText: basicTranslation };
    }

    console.log('[translateText] Attempting @vitalets/google-translate-api...');

    // Try @vitalets/google-translate-api first (more maintained fork)
    try {
      const res = await translate(validatedInput.text, {
        from: validatedInput.sourceLanguage,
        to: validatedInput.targetLanguage,
      });
      console.log('[translateText] Google Translate success:', res.text);
      return TranslatorOutputSchema.parse({ translatedText: res.text });
    } catch (googleError) {
      console.warn('[translateText] @vitalets/google-translate-api failed:', googleError);

      // Fallback: Try LibreTranslate API (configurable endpoint)
      console.log('[translateText] Attempting LibreTranslate fallback...');

      try {
        const libreUrl = process.env.LIBRETRANSLATE_URL?.trim() || 'https://libretranslate.de/translate';

        const response = await fetchWithTimeout(libreUrl, {
          method: 'POST',
          body: JSON.stringify({
            q: validatedInput.text,
            source: validatedInput.sourceLanguage,
            target: validatedInput.targetLanguage,
            format: 'text',
          }),
          headers: {
            'Content-Type': 'application/json',
          },
          timeoutMs: 8000,
        });

        if (!response.ok) {
          throw new Error(`LibreTranslate API failed with status: ${response.status}`);
        }

        const data: any = await response.json();

        // Some instances return { translatedText }, some return { translatedText: string }, others { translatedText: '...' }
        const translated = data?.translatedText || data?.translation || data?.translated_text;
        if (!translated) {
          throw new Error(`LibreTranslate unexpected response shape: ${JSON.stringify(data).slice(0, 200)}...`);
        }

        console.log('[translateText] LibreTranslate success:', translated);
        return { translatedText: String(translated) };
      } catch (libreError) {
        console.warn('[translateText] LibreTranslate also failed:', libreError);
        
        // Last resort: return original text with language indicator
        const fallbackMessage = `[Translation unavailable] ${validatedInput.text}`;
        console.log('[translateText] All services failed, returning fallback message');
        return { translatedText: fallbackMessage };
      }
    }
  } catch (err: any) {
    console.error('[translateText] All translation methods failed:', err);

    // Last resort: provide a helpful error message with original text
    const fallbackMessage = `[Translation error] ${input.text || 'Unable to translate text. Please try again later.'}`;
    return { translatedText: fallbackMessage };
  }
}
