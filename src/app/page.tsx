'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/app/logo';
import { Bot, MapPin, Languages, ClipboardList, Linkedin, Twitter, Heart, MessageCircle } from 'lucide-react';
import * as React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { useLiveLocation } from '@/context/live-location-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';

// Dynamically import the MapPreviewSection with SSR turned off.
const MapPreviewSection = dynamic(
  () => import('@/components/app/map-preview-section').then((mod) => mod.MapPreviewSection),
  {
    ssr: false,
    loading: () => (
      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Discover What's Around You</h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed">
              A live preview of attractions, hotels, and restaurants near your location.
            </p>
          </div>
          <Skeleton className="w-full h-[400px] md:h-[500px] rounded-lg shadow-xl border" />
        </div>
      </section>
    ),
  }
);

// Dynamically import the AiTranslator for the demo section
const AiTranslator = dynamic(
  () => import('@/components/app/ai-translator').then((mod) => mod.AiTranslator),
  { ssr: false }
);

export default function LandingPage() {
  const { livePlaces, liveLocation } = useLiveLocation();

  const sectionAnimation = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    transition: { duration: 0.6 },
    viewport: { once: true },
  };

  const features = [
    { 
      iconSrc: "/ai-assistant.avif", 
      title: "AI Travel Assistant", 
      description: "Get a full itinerary or ask any travel question. Your one-stop AI for planning.",
      testimonial: "Loved the itinerary suggestions!"
    },
    { 
      iconSrc: "/dynamic-discovery.png", 
      title: "Dynamic Discovery", 
      description: "Instantly find nearby attractions, hotels, and restaurants based on your live location.",
      testimonial: "Found so many hidden gems!"
    },
    { 
      iconSrc: "/vice-translator.jpg", 
      title: "Voice Translator", 
      description: "Communicate seamlessly with locals using our real-time, voice-to-voice translator.",
      testimonial: "Made traveling abroad so easy!"
    },
    { 
      iconSrc: "/free.png", 
      title: "Always Free", 
      description: "All features, including our most powerful AI tools, are completely free to use.",
      testimonial: "Can't believe it's free!"
    },
  ];

  const testimonials = [
    { avatar: "https://placehold.co/40x40.png", hint: "woman portrait", fallback: "PS", name: "Priya S.", quote: "\"The discover feature is amazing! I found so many hidden gems near my hotel in Bali that weren't in any guidebook.\"" },
    { avatar: "https://placehold.co/40x40.png", hint: "man portrait", fallback: "ML", name: "Marcus L.", quote: "\"As a budget traveler, the AI assistant is a lifesaver. It gave me a realistic cost breakdown and a full plan instantly.\"" },
    { avatar: "https://placehold.co/40x40.png", hint: "woman face", fallback: "SR", name: "Sofia R.", quote: "\"The AI Assistant answered all my niche questions about local etiquette in Morocco. It felt like I had a personal guide with me 24/7.\"" },
    { avatar: "https://placehold.co/40x40.png", hint: "man face", fallback: "AJ", name: "Alex J.", quote: "\"I used the translator in Japan and it was flawless. It made ordering food and asking for directions so much easier.\"" },
    { avatar: "https://placehold.co/40x40.png", hint: "woman portrait professional", fallback: "EC", name: "Elena C.", quote: "\"The comprehensive plan for my Italy trip was better than anything a travel agent could have made. And it was free!\"" },
    { avatar: "https://placehold.co/40x40.png", hint: "man face professional", fallback: "DL", name: "David L.", quote: "\"SATHI is my go-to for weekend getaways. The 'Explore Nearby' is perfect for spontaneous trips.\"" },
  ];

  const duplicatedTestimonials = [...testimonials, ...testimonials];

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 z-50 bg-muted/95 backdrop-blur-sm">
        <Link href="/" className="flex items-center justify-center gap-2">
          <Logo />
          <span className="text-xl font-bold text-primary">SATHI</span>
        </Link>
        <nav className="ml-auto hidden md:flex gap-4 sm:gap-6 items-center">
          <Link href="#features" className="text-sm font-medium hover:underline underline-offset-4">
            Features
          </Link>
          <Link href="#map-preview" className="text-sm font-medium hover:underline underline-offset-4">
            Discovery
          </Link>
          <Link href="#testimonials" className="text-sm font-medium hover:underline underline-offset-4">
            Testimonials
          </Link>
          <Link href="/about" className="text-sm font-medium hover:underline underline-offset-4">
            About
          </Link>
          <Button asChild>
            <Link href="/login">Login / Sign Up</Link>
          </Button>
        </nav>
        <div className="ml-auto md:hidden">
          <Button asChild>
            <Link href="/login">Get Started</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Modified Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-primary/5 relative">
          <div className="absolute inset-0 opacity-20 bg-cover bg-center" style={{ backgroundImage: 'url(/illustrations/smiling-traveler-silhouette.png)' }}></div>
          <div className="container px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center space-y-4 text-center">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter" style={{ fontFamily: 'cursive' }}>
                Your AI Travel Ally
              </h1>
              <p className="max-w-[700px] text-muted-foreground md:text-xl">
                Plan smarter with AI—discover hidden gems, translate languages, and more in real-time.
              </p>
              <Button size="lg" className="rounded-lg hover:scale-105 transition-transform">
                Get Started for Free
              </Button>
            </div>
          </div>
        </section>

        <motion.section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-muted" {...sectionAnimation}>
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm text-secondary-foreground">Key Features</div>
                <h2 className="text-4xl font-bold tracking-tighter sm:text-6xl relative inline-block after:content-[''] after:absolute after:bottom-[-8px] after:left-0 after:w-full after:h-1 after:bg-primary">
                  One App for Your Entire Journey
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Our AI-powered platform goes beyond traditional travel apps, offering a suite of intelligent tools to make your journey seamless and unforgettable.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center justify-center gap-8 sm:grid-cols-2 md:grid-cols-4 lg:gap-12 mt-12">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="grid gap-2 text-center p-4 rounded-lg hover:bg-card transition-all"
                >
                  <div className="flex justify-center items-center mb-4">
                    <Image src={feature.iconSrc} alt={feature.title} width={48} height={48} className="text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                  <p className="text-xs italic text-primary mt-2">{feature.testimonial}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* New Translator Demo Section */}
       {/*} <motion.section id="translator" className="w-full py-12 md:py-24 lg:py-32 bg-background" {...sectionAnimation}>
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm text-secondary-foreground">New Feature</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl" style={{ fontFamily: 'cursive' }}>
                  Break Language Barriers
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed">
                  Try our real-time voice translator right here on the homepage.
                </p>
              </div>
            </div>
            <div className="max-w-3xl mx-auto">
              <AiTranslator />
            </div>
          </div>
        </motion.section>
        */}
        {/* Modified Discover Section with overlay and CTA */}
        <div className="relative">
          <div className="absolute inset-0 opacity-20 flex items-center justify-center pointer-events-none">
            <Image src="/illustrations/hand-pointing.png" alt="Hand pointing to location" width={200} height={200} />
          </div>
          <MapPreviewSection livePlaces={livePlaces} liveLocation={liveLocation} />
          <div className="container px-4 md:px-6 text-center mt-8">
            <Button variant="outline" className="rounded-lg text-primary border-primary hover:bg-primary/10" style={{ fontFamily: 'cursive' }}>
              Explore Now!
            </Button>
          </div>
        </div>

        <motion.section id="testimonials" className="w-full py-12 md:py-24 lg:py-32 bg-muted" {...sectionAnimation}>
            <div className="container px-4 md:px-6">
                <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
                    <div className="space-y-2">
                        <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm text-secondary-foreground">Testimonials</div>
                        <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Loved by Travelers Worldwide</h2>
                        <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed">
                        Hear what our users have to say about their experiences with SATHI.
                        </p>
                    </div>
                </div>
            </div>

            <div
                className="w-full inline-flex flex-nowrap overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_128px,_black_calc(100%-200px),transparent_100%)]"
            >
                <ul className="flex items-center justify-center md:justify-start [&_li]:mx-4 [&_img]:max-w-none animate-infinite-scroll hover:[animation-play-state:paused]">
                    {duplicatedTestimonials.map((testimonial, index) => (
                        <li key={`${testimonial.name}-${index}`} className="flex-shrink-0">
                             <div className="relative p-6 bg-card rounded-lg shadow-md border border-primary/20 after:content-[''] after:absolute after:-bottom-4 after:left-1/2 after:-translate-x-1/2 after:border-8 after:border-transparent after:border-t-card">
                                <div className="flex flex-row items-center gap-4 pb-4">
                                <Avatar>
                                    <AvatarImage src={testimonial.avatar} alt="User Avatar" data-ai-hint={testimonial.hint} />
                                    <AvatarFallback>{testimonial.fallback}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h4 className="text-base font-bold">{testimonial.name}</h4>
                                    <div className="flex items-center gap-0.5">
                                    <Star className="w-4 h-4 fill-primary text-primary" />
                                    <Star className="w-4 h-4 fill-primary text-primary" />
                                    <Star className="w-4 h-4 fill-primary text-primary" />
                                    <Star className="w-4 h-4 fill-primary text-primary" />
                                    <Star className="w-4 h-4 fill-primary text-primary" />
                                    </div>
                                </div>
                                </div>
                                <blockquote className="text-sm text-muted-foreground italic">{testimonial.quote}</blockquote>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="text-center mt-8">
              <Link href="/testimonials" className="text-primary hover:underline" style={{ fontFamily: 'cursive' }}>
                Read More Stories
              </Link>
            </div>
        </motion.section>

      </main>

      <footer className="border-t bg-muted/40">
  <div className="container px-4 md:px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-8">
    <div className="text-center md:text-left">
      <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} SATHI. All rights reserved. Made with ♥ by SATHI</p>
    </div>
    <div className="flex flex-col md:flex-row gap-8">
      <div className="flex gap-4">
        <Link href="https://www.linkedin.com/in/nikhilesh-attal" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
          <Linkedin className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
        </Link>
        <Link href="https://x.com/AttalNikhilesh" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
          <Twitter className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
        </Link>
        <Link href="/liked" aria-label="Liked">
          <Heart className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
        </Link>
        <Link href="/feedback" aria-label="Feedback">
          <MessageCircle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
        </Link>
      </div>
      <nav className="flex flex-col md:flex-row gap-4 sm:gap-6 text-sm">
  <div>
    <h4 className="font-bold text-primary mb-2">Our Services</h4>
    <ul className="space-y-1">
      <li><Link href="/login" className="hover:underline underline-offset-4">AI Travel Assistant</Link></li>
      <li><Link href="/login" className="hover:underline underline-offset-4">Explore Nearby</Link></li>
      <li><Link href="/login" className="hover:underline underline-offset-4">Voice Translator</Link></li>
      <li><Link href="/login" className="hover:underline underline-offset-4">Free Tools</Link></li>
    </ul>
  </div>
  <div>
    <h4 className="font-bold text-primary mb-2">Support</h4>
    <ul className="space-y-1">
      <li><Link href="/faq" className="hover:underline underline-offset-4">FAQ</Link></li>
      <li><Link href="/contact" className="hover:underline underline-offset-4">Contact Us</Link></li>
      <li><Link href="/privacy" className="hover:underline underline-offset-4">Privacy</Link></li>
    </ul>
  </div>
  <div>
    <h4 className="font-bold text-primary mb-2">About</h4>
    <ul className="space-y-1">
      <li><Link href="/about" className="hover:underline underline-offset-4">About Us</Link></li>
      <li><Link href="/terms" className="hover:underline underline-offset-4">Terms of Service</Link></li>
    </ul>
  </div>
</nav>
    </div>
  </div>
</footer>
    </div>
  );
}