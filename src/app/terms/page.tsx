
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/app/logo';
import { Linkedin, Twitter, Youtube } from 'lucide-react';

export default function TermsPage() {
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
          <div className="mx-auto max-w-3xl space-y-6">
            <h1 className="text-4xl font-bold tracking-tighter text-primary">Terms of Service</h1>
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p>Last updated: {new Date().toLocaleDateString()}</p>
              <p>
                Welcome to SATHI! These terms and conditions outline the rules and regulations for the use of SATHI's Website, located at your-domain.com.
              </p>
              <p>
                By accessing this website we assume you accept these terms and conditions. Do not continue to use SATHI if you do not agree to take all of the terms and conditions stated on this page.
              </p>
              <h2 className="text-2xl font-bold">Cookies</h2>
              <p>
                We employ the use of cookies. By accessing SATHI, you agreed to use cookies in agreement with the SATHI's Privacy Policy.
              </p>
              <h2 className="text-2xl font-bold">License</h2>
              <p>
                Unless otherwise stated, SATHI and/or its licensors own the intellectual property rights for all material on SATHI. All intellectual property rights are reserved. You may access this from SATHI for your own personal use subjected to restrictions set in these terms and conditions.
              </p>
              <p>You must not:</p>
              <ul>
                <li>Republish material from SATHI</li>
                <li>Sell, rent or sub-license material from SATHI</li>
                <li>Reproduce, duplicate or copy material from SATHI</li>
                <li>Redistribute content from SATHI</li>
              </ul>
              <p>This Agreement shall begin on the date hereof.</p>
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
