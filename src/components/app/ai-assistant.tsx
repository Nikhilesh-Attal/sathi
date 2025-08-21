
'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTabContext } from './main-tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from './loading-spinner';
import { Bot, Send, User, ThumbsUp, ThumbsDown, Download, Sparkles, MapPin, Calendar, Wallet, CircleDollarSign, Wand2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Separator } from '../ui/separator';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  feedback?: 'like' | 'dislike';
}

const PlannerFormSchema = z.object({
  currentLocation: z.string().optional(),
  destination: z.string().optional(),
  duration: z.coerce.number().positive().int().optional(),
  budget: z.string().optional(),
  currency: z.string().optional(),
  interests: z.string().optional(),
});

type PlannerFormData = z.infer<typeof PlannerFormSchema>;

const currencies = ["INR", "USD", "EUR", "GBP", "JPY"];

export function AiAssistant() {
  const {
    assistantMessages,
    setAssistantMessages,
    handleAssistantSubmit,
    isAssistantLoading
  } = useTabContext();

  const [input, setInput] = React.useState('');
  const { toast } = useToast();
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  
  const form = useForm<PlannerFormData>({
    resolver: zodResolver(PlannerFormSchema),
    defaultValues: {
      currency: "INR",
    }
  });

  React.useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [assistantMessages]);

  const handleDownload = (content: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SATHI-Plan.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFeedback = (messageId: string, feedback: 'like' | 'dislike') => {
    setAssistantMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, feedback: msg.feedback === feedback ? undefined : feedback }
          : msg
      )
    );
    toast({
      title: "Thank you for your feedback!",
    });
  };
  
  const handleFormSubmit = (data: PlannerFormData) => {
     if(isAssistantLoading) return;
    
    // Construct a user-friendly query from the form data
    let query = `Plan a trip`;
    if (data.destination) query += ` to ${data.destination}`;
    if (data.duration) query += ` for ${data.duration} days`;
    if (data.budget) query += ` on a ${data.budget} budget`;
    if (data.interests) query += ` with interests in ${data.interests}`;

    handleAssistantSubmit(query, data);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isAssistantLoading) return;

    handleAssistantSubmit(input);
    setInput('');
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sparkles className="text-primary" />AI Travel Assistant</CardTitle>
        <CardDescription>Your all-in-one tool for travel planning and guidance. Ask for an itinerary or any travel question.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Planner Form Section */}
        <div className="md:col-span-1">
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 p-4 border rounded-lg bg-card">
            <h3 className="font-semibold text-lg">Create a Detailed Plan</h3>
            <div className="space-y-2">
              <Label htmlFor="currentLocation" className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Current Location</Label>
              <Input id="currentLocation" {...form.register('currentLocation')} placeholder="e.g., Delhi" disabled={isAssistantLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination" className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Destination</Label>
              <Input id="destination" {...form.register('destination')} placeholder="e.g., Jaipur" disabled={isAssistantLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration" className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Duration (days)</Label>
              <Input id="duration" type="number" {...form.register('duration')} placeholder="e.g., 3" disabled={isAssistantLoading} />
            </div>
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="budget" className="flex items-center gap-2"><Wallet className="h-4 w-4" /> Budget</Label>
                 <Controller
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isAssistantLoading}>
                        <SelectTrigger><SelectValue placeholder="Style..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="budget">Budget</SelectItem>
                          <SelectItem value="mid-range">Mid-range</SelectItem>
                          <SelectItem value="luxury">Luxury</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="currency" className="flex items-center gap-2"><CircleDollarSign className="h-4 w-4" /> Currency</Label>
                  <Controller
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value || "INR"} disabled={isAssistantLoading}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  />
               </div>
             </div>
             <div className="space-y-2">
              <Label htmlFor="interests" className="flex items-center gap-2"><Wand2 className="h-4 w-4" /> Interests</Label>
              <Input id="interests" {...form.register('interests')} placeholder="e.g., History, Food, Photography" disabled={isAssistantLoading} />
            </div>

            <Button type="submit" className="w-full" disabled={isAssistantLoading}>
              {isAssistantLoading ? <LoadingSpinner className="mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Generate Plan
            </Button>
          </form>
        </div>

        {/* Chat Section */}
        <div className="flex flex-col h-[600px] bg-card rounded-lg border md:col-span-2">
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
             <div className="space-y-6">
              {assistantMessages.map((message) => (
                <div key={message.id} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                  {message.role === 'assistant' && <Avatar><AvatarFallback><Bot /></AvatarFallback></Avatar>}

                  <div className="flex flex-col gap-2 items-start max-w-[85%]">
                    <div className={cn("rounded-lg px-4 py-2 prose prose-sm dark:prose-invert max-w-none", message.role === 'user' ? 'bg-primary text-primary-foreground self-end' : 'bg-muted')}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                    </div>
                    {message.role === 'assistant' && message.id !== 'init1' && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Button variant="ghost" size="icon" className={cn("h-7 w-7", message.feedback === 'like' && 'text-primary bg-primary/10')} onClick={() => handleFeedback(message.id, 'like')}>
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className={cn("h-7 w-7", message.feedback === 'dislike' && 'text-destructive bg-destructive/10')} onClick={() => handleFeedback(message.id, 'dislike')}>
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(message.content)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {message.role === 'user' && <Avatar><AvatarFallback><User /></AvatarFallback></Avatar>}
                </div>
              ))}
              {isAssistantLoading && (
                <div className="flex items-start gap-3">
                  <Avatar><AvatarFallback><Bot /></AvatarFallback></Avatar>
                  <div className="rounded-lg px-4 py-3 bg-muted flex items-center">
                    <LoadingSpinner />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="border-t p-4 bg-background rounded-b-lg">
            <form onSubmit={handleChatSubmit} className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Or ask a simple question, e.g., 'What is the best time to visit Kerala?'"
                autoComplete="off"
                disabled={isAssistantLoading}
                aria-label="Your question or plan request"
              />
              <Button type="submit" size="icon" disabled={isAssistantLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
