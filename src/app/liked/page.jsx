'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, Linkedin, Twitter } from 'lucide-react';
import Link from 'next/link';

export default function LikedPage() {
  const sectionAnimation = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    transition: { duration: 0.6 },
    viewport: { once: true },
  };

  const likedItems = [
    { id: 1, title: "Udaipur, India", description: "Stunning lakes and palaces!" },
    { id: 2, title: "Bali, Indonesia", description: "Hidden gems and beaches!" },
    { id: 3, title: "Morocco Markets", description: "Vibrant culture and food!" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 z-50 bg-muted/95 backdrop-blur-sm">
        <Link href="/" className="flex items-center justify-center gap-2">
          <span className="text-xl font-bold text-primary">SATHI</span>
        </Link>
        <nav className="ml-auto">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium hover:underline underline-offset-4">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </nav>
      </header>

      <main className="flex-1 py-12 md:py-24 lg:py-32">
        <motion.section className="container px-4 md:px-6" {...sectionAnimation}>
          <div className="flex flex-col items-center space-y-6 text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter" style={{ fontFamily: 'cursive' }}>
              Your Favorite Spots!
            </h1>
            <p className="max-w-[600px] text-muted-foreground md:text-xl">
              Check out the places and features you’ve loved with SATHI.
            </p>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {likedItems.map((item) => (
                <Card key={item.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5 text-primary" /> {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button variant="outline" className="mt-4 rounded-lg text-primary border-primary hover:bg-primary/10">
              Discover More
            </Button>
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
            </div>
            <nav className="flex flex-col md:flex-row gap-4 sm:gap-6 text-sm">
              <div>
                <h4 className="font-bold text-primary mb-2">Our Services</h4>
                <ul className="space-y-1">
                  <li><Link href="/ai-assistant" className="hover:underline underline-offset-4">AI Travel Assistant</Link></li>
                  <li><Link href="/discovery" className="hover:underline underline-offset-4">Dynamic Discovery</Link></li>
                  <li><Link href="/free-tools" className="hover:underline underline-offset-4">Free Tools</Link></li>
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