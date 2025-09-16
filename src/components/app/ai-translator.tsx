'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getTranslation, convertTextToSpeech } from '@/app/actions';
import { TranslatorInputSchema, type TranslatorOutput } from '@/lib/schemas';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from './loading-spinner';
import { ArrowRightLeft, Languages, Mic, MicOff, Volume2, LoaderCircle } from 'lucide-react';
import { Label } from '../ui/label';

const languages = [
  { value: 'en', label: 'English', recognitionCode: 'en-US' },
  { value: 'hi', label: 'Hindi', recognitionCode: 'hi-IN' },
  { value: 'bn', label: 'Bengali', recognitionCode: 'bn-IN' },
  { value: 'gu', label: 'Gujarati', recognitionCode: 'gu-IN' },
  { value: 'kn', label: 'Kannada', recognitionCode: 'kn-IN' },
  { value: 'ml', label: 'Malayalam', recognitionCode: 'ml-IN' },
  { value: 'mr', label: 'Marathi', recognitionCode: 'mr-IN' },
  { value: 'pa', label: 'Punjabi', recognitionCode: 'pa-IN' },
  { value: 'ta', label: 'Tamil', recognitionCode: 'ta-IN' },
  { value: 'te', label: 'Telugu', recognitionCode: 'te-IN' },
  { value: 'es', label: 'Spanish', recognitionCode: 'es-ES' },
  { value: 'fr', label: 'French', recognitionCode: 'fr-FR' },
  { value: 'de', label: 'German', recognitionCode: 'de-DE' },
  { value: 'ja', label: 'Japanese', recognitionCode: 'ja-JP' },
  { value: 'zh', label: 'Chinese', recognitionCode: 'zh-CN' },
  { value: 'ar', label: 'Arabic', recognitionCode: 'ar-SA' },
];

const languageMap: { [key: string]: string } = languages.reduce((acc, lang) => {
  acc[lang.value] = lang.recognitionCode;
  return acc;
}, {} as { [key: string]: string });

export function AiTranslator() {
  const [translation, setTranslation] = React.useState<TranslatorOutput | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState(false);
  const [isAudioLoading, setIsAudioLoading] = React.useState(false);
  const [audioSrc, setAudioSrc] = React.useState<string | null>(null);
  const { toast } = useToast();

  const recognitionRef = React.useRef<any>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const [voices, setVoices] = React.useState<SpeechSynthesisVoice[]>([]);
  React.useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    const loadVoices = () => setVoices(synth.getVoices());
    loadVoices();
    synth.onvoiceschanged = loadVoices;
    return () => {
      // @ts-ignore
      synth.onvoiceschanged = null;
    };
  }, []);

  const form = useForm<z.infer<typeof TranslatorInputSchema>>({
    resolver: zodResolver(TranslatorInputSchema),
    defaultValues: {
      text: '',
      sourceLanguage: 'en',
      targetLanguage: 'hi',
    },
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        variant: 'destructive',
        title: 'Unsupported Browser',
        description: 'Speech recognition is not supported in this browser.',
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = languageMap[form.getValues('sourceLanguage')] || 'en-US';
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const spokenText = event.results[0][0].transcript;
      form.setValue('text', spokenText);
      form.handleSubmit(onSubmit)();
    };
    recognition.onerror = (event: any) => {
      toast({
        variant: 'destructive',
        title: 'Speech Recognition Error',
        description: event.error === 'no-speech' ? 'No speech detected. Please try again.' : event.error,
      });
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);

    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  React.useEffect(() => {
    if (audioSrc && audioRef.current) {
      audioRef.current
        .play()
        .then(() => console.log('Audio played'))
        .catch((e) => {
          console.error('Audio playback failed:', e);
          toast({ variant: 'destructive', title: 'Audio Error', description: 'Failed to play audio.' });
        });
    }
  }, [audioSrc, toast]);

  const sourceLang = form.watch('sourceLanguage');
  React.useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = languageMap[sourceLang] || 'en-US';
    }
  }, [sourceLang]);

  async function onSubmit(values: z.infer<typeof TranslatorInputSchema>) {
    if (!values.text.trim()) return;

    setIsProcessing(true);
    setTranslation(null);
    const result = await getTranslation(values);

    if (result.success && result.data) {
      setTranslation(result.data);
      handlePlayAudio(result.data.translatedText);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error || 'Translation failed',
      });
    }
    setIsProcessing(false);
  }

  function handleSwapLanguages() {
    const source = form.getValues('sourceLanguage');
    const target = form.getValues('targetLanguage');
    form.setValue('sourceLanguage', target);
    form.setValue('targetLanguage', source);
    const currentText = form.getValues('text');
    const currentTranslation = translation?.translatedText || '';
    form.setValue('text', currentTranslation);
    setTranslation(currentText ? { translatedText: currentText } : null);
  }

  const handleToggleRecording = () => {
    const rec = recognitionRef.current;
    if (!rec) {
      toast({
        title: 'Initializing microphone',
        description: 'Please wait a moment and try again.',
      });
      return;
    }
    if (isRecording) {
      setIsRecording(false);
      try {
        rec.stop();
      } catch (e) {
        // ignore
      }
    } else {
      form.setValue('text', '');
      setTranslation(null);
      try {
        setIsRecording(true);
        rec.start();
      } catch (e: any) {
        setIsRecording(false);
        toast({
          variant: 'destructive',
          title: 'Microphone Error',
          description: e?.message || 'Could not start recording.',
        });
      }
    }
  };

  const handlePlayAudio = async (textToPlay: string) => {
    if (!textToPlay || isAudioLoading) return;
    setIsAudioLoading(true);
    setAudioSrc(null);

    // First try Web Speech API (browser native TTS)
    if ('speechSynthesis' in window) {
      try {
        console.log('[handlePlayAudio] Using Web Speech API');
        window.speechSynthesis.cancel(); // Cancel any ongoing speech
        
        const utterance = new SpeechSynthesisUtterance(textToPlay);
        const targetLang = form.getValues('targetLanguage');
        const targetLocale = languageMap[targetLang] || 'en-US';
        utterance.lang = targetLocale;
        const matchedVoice = voices.find(v => v.lang?.toLowerCase().startsWith(targetLocale.toLowerCase()));
        if (matchedVoice) {
          utterance.voice = matchedVoice;
        }
        utterance.rate = 0.9;
        utterance.pitch = 1;
        
        utterance.onstart = () => {
          console.log('[handlePlayAudio] Speech started');
        };
        
        utterance.onend = () => {
          console.log('[handlePlayAudio] Speech ended');
          setIsAudioLoading(false);
        };
        
        utterance.onerror = (event) => {
          console.error('[handlePlayAudio] Speech error:', event);
          setIsAudioLoading(false);
          toast({
            variant: 'destructive',
            title: 'Speech Error',
            description: 'Failed to play speech. Trying alternative method...',
          });
          // Fallback to server TTS
          fallbackToServerTTS(textToPlay);
        };
        
        window.speechSynthesis.speak(utterance);
        return; // Exit early if Web Speech API works
      } catch (error) {
        console.warn('[handlePlayAudio] Web Speech API failed:', error);
      }
    }

    // Fallback to server TTS
    fallbackToServerTTS(textToPlay);
  };

  const fallbackToServerTTS = async (textToPlay: string) => {
    try {
      console.log('[fallbackToServerTTS] Using server TTS');
      const result = await convertTextToSpeech({ text: textToPlay });
      
      if (result.success && result.data) {
        // Check if it's a data URL with text (our fallback)
        if (result.data.media.startsWith('data:text/plain')) {
          const text = decodeURIComponent(result.data.media.split(',')[1]);
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            const targetLocale = languageMap[form.getValues('targetLanguage')] || 'en-US';
            utterance.lang = targetLocale;
            const matchedVoice = voices.find(v => v.lang?.toLowerCase().startsWith(targetLocale.toLowerCase()));
            if (matchedVoice) {
              utterance.voice = matchedVoice;
            }
            utterance.onend = () => setIsAudioLoading(false);
            utterance.onerror = () => {
              setIsAudioLoading(false);
              toast({
                variant: 'destructive',
                title: 'Audio Error',
                description: 'Text-to-speech is not available in your browser.',
              });
            };
            window.speechSynthesis.speak(utterance);
          } else {
            setIsAudioLoading(false);
            toast({
              variant: 'destructive',
              title: 'Audio Not Supported',
              description: 'Text-to-speech is not available in your browser.',
            });
          }
        } else {
          // It's a real audio URL
          setAudioSrc(result.data.media);
          setIsAudioLoading(false);
        }
      } else {
        setIsAudioLoading(false);
        toast({
          variant: 'destructive',
          title: 'Audio Error',
          description: result.error || 'Failed to generate audio',
        });
      }
    } catch (error) {
      setIsAudioLoading(false);
      toast({
        variant: 'destructive',
        title: 'Audio Error',
        description: 'Failed to generate audio. Please try again.',
      });
    }
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages />
          Voice Translator
        </CardTitle>
        <CardDescription>Press the microphone to speak, and get a real-time voice translation.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4">
              <FormField
                control={form.control}
                name="sourceLanguage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Speak in</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {languages.map((l) => (
                          <SelectItem key={l.value} value={l.value}>
                            {l.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-6 hidden md:flex"
                onClick={handleSwapLanguages}
              >
                <ArrowRightLeft />
              </Button>

              <FormField
                control={form.control}
                name="targetLanguage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Translate to</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {languages.map((l) => (
                          <SelectItem key={l.value} value={l.value}>
                            {l.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-center my-6">
              <Button
                type="button"
                size="lg"
                variant={isRecording ? 'destructive' : 'default'}
                className="rounded-full h-20 w-20"
                onClick={handleToggleRecording}
                disabled={isProcessing}
              >
                {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>You said:</Label>
                <div className="min-h-[120px] w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                  {form.getValues('text')}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Translation:</Label>
                <div className="relative">
                  <div className="min-h-[120px] w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm flex items-center justify-center">
                    {isProcessing ? <LoadingSpinner /> : translation?.translatedText || 'Translation will appear here...'}
                  </div>
                  {translation?.translatedText && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="absolute bottom-2 right-2"
                      onClick={() => handlePlayAudio(translation.translatedText!)}
                      disabled={isAudioLoading || isProcessing}
                    >
                      {isAudioLoading ? <LoaderCircle className="animate-spin" /> : <Volume2 />}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </Form>
        {audioSrc && <audio ref={audioRef} src={audioSrc} hidden autoPlay playsInline onCanPlayThrough={() => audioRef.current?.play()} />}
      </CardContent>
    </Card>
  );
}