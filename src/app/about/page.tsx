
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/app/logo';
import Image from 'next/image';
import { Linkedin, Twitter, Youtube } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 z-50 bg-muted/95 backdrop-blur-sm">
        <Link href="/" className="flex items-center justify-center gap-2">
          <Logo />
          <span className="text-xl font-bold text-primary">SATHI</span>
        </Link>
        <nav className="ml-auto">
          <Button asChild variant="outline">
            <Link href="/">Back to Home</Link>
          </Button>
        </nav>
      </header>
      <main className="flex-1 py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-3xl space-y-12">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold tracking-tighter text-primary">About SATHI</h1>
                <p className="text-xl text-muted-foreground">Your AI Travel Ally.</p>
            </div>
            
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p>
                Welcome to SATHI, which means "companion" in Hindi. We are your personal AI-powered travel ally, designed to make your journeys unforgettable. In a world full of travel apps focused on bookings and transactions, SATHI stands apart. Our core mission is to be your smart assistant, not just another travel portal.
              </p>
              <p>
                We harness the power of generative AI to provide you with smart itineraries, real-time local guidance, dynamic discovery of places, and seamless communication tools. We believe that planning a trip should be an inspiring part of the adventure, not a chore. SATHI is here to be your trusted guide, every step of the way.
              </p>
            </div>
            
            <div className="text-center space-y-4 pt-8">
                <h2 className="text-3xl font-bold tracking-tighter">About the Creator</h2>
                 <div className="flex justify-center">
                   <Image
                      src="https://placehold.co/150x150"
                      alt="Creator's photo"
                      width={150}
                      height={150}
                      className="rounded-full"
                      data-ai-hint="portrait person"
                    />
                 </div>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  SATHI was brought to life by Nikhilesh Attal, a passionate developer and avid traveler who saw an opportunity to merge cutting-edge technology with the joy of exploration. With a background in AI and a love for discovering new cultures, the goal was to create a tool that feels less like an app and more like a knowledgeable friend accompanying you on your adventures.
                </p>
            </div>
          </div>
        </div>
      </main>
       <footer className="border-t bg-muted/40">
        <div className="container px-4 md:px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} SATHI. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="https://www.linkedin.com/in/nikhilesh-attal" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <Linkedin className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
            </Link>
            <Link href="https://x.com/AttalNikhilesh" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
              <Twitter className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
            </Link>
            <Link href="https://www.youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
              <Youtube className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
