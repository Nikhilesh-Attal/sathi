
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/app/logo';
import { Linkedin, Twitter, Youtube } from 'lucide-react';

export default function PrivacyPage() {
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
            <h1 className="text-4xl font-bold tracking-tighter text-primary">Privacy Policy</h1>
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p>Last updated: {new Date().toLocaleDateString()}</p>
              <p>
                Your privacy is important to us. It is SATHI's policy to respect your privacy regarding any information we may collect from you across our website, and other sites we own and operate.
              </p>
              <p>
                We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we’re collecting it and how it will be used.
              </p>
              <h2 className="text-2xl font-bold">Information We Collect</h2>
              <p>
                Log data: When you visit our website, our servers may automatically log the standard data provided by your web browser. It may include your computer’s Internet Protocol (IP) address, your browser type and version, the pages you visit, the time and date of your visit, the time spent on each page, and other details.
              </p>
              <h2 className="text-2xl font-bold">Security</h2>
              <p>
                We value your trust in providing us your Personal Information, thus we are striving to use commercially acceptable means of protecting it. But remember that no method of transmission over the internet, or method of electronic storage is 100% secure and reliable, and we cannot guarantee its absolute security.
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
