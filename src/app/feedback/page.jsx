'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, Linkedin, Twitter, Heart, MessageCircle } from 'lucide-react';
import Link from 'next/link';

export default function FeedbackPage() {
  const sectionAnimation = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    transition: { duration: 0.6 },
    viewport: { once: true },
  };

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
              Share Your Thoughts!
            </h1>
            <p className="max-w-[600px] text-muted-foreground md:text-xl">
              We’d love to hear about your experience with SATHI. Your feedback helps us improve!
            </p>
            <form className="w-full max-w-md space-y-4">
              <Textarea
                placeholder="Tell us what you think..."
                className="min-h-[200px] resize-none border-primary/20 focus:border-primary"
              />
              <Button type="submit" className="w-full rounded-lg hover:scale-105 transition-transform">
                <Send className="mr-2 h-4 w-4" /> Send Feedback
              </Button>
            </form>
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