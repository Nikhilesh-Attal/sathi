
'use client';

import { LoadingSpinner } from '@/components/app/loading-spinner';
import { Logo } from '@/components/app/logo';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

<<<<<<< HEAD
import loginAnimation from "../../../public/register.json";
import signupAnimation from "../../../public/sign up.json";
=======
import loginAnimation from "@/assets/animations/login.json";
import signupAnimation from "@/assets/animations/signup.json";
>>>>>>> 7377dd599ac4ccaf795fea8951644255cc9f8687
import Lottie from "lottie-react";

const motionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState('login');
  const [resetEmail, setResetEmail] = React.useState('');
  const [isResetting, setIsResetting] = React.useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = React.useState(false);

  const handleAuth = async (e: React.FormEvent, type: 'login' | 'signup') => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const form = e.currentTarget as HTMLFormElement;
    const email = (form.elements.namedItem('email') as HTMLInputElement)?.value;
    const password = (form.elements.namedItem('password') as HTMLInputElement)?.value;
    
    try {
      if (!auth) {
        throw new Error("Firebase is not configured correctly. Please check the console.");
      }

      let authResult;
      if (type === 'signup') {
        // With no database, we don't need the user's name during signup for a profile.
        // We can get it from the Auth object later if needed.
        authResult = await createUserWithEmailAndPassword(auth, email, password);
        if (authResult?.user) {
          toast({ title: "Account Created!", description: "You have been successfully signed up." });
        }
      } else {
        authResult = await signInWithEmailAndPassword(auth, email, password);
        if (authResult?.user) {
          toast({ title: "Login Successful!", description: "Welcome back." });
        }
      }
      
      // Only navigate if we have a valid user
      if (authResult?.user) {
        router.push('/dashboard');
      } else {
        throw new Error('Authentication failed - no user returned');
      }
    } catch (err: any) {
      console.error("Authentication error:", err);
      
      // Handle null or undefined errors gracefully
      if (!err) {
        setError('An unknown error occurred during authentication.');
        return;
      }
      
      const friendlyMessage = err.code?.replace('auth/', '').replace(/-/g, ' ') || err.message || 'An unexpected error occurred.';
      setError(`Error: ${friendlyMessage}`);
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: friendlyMessage.charAt(0).toUpperCase() + friendlyMessage.slice(1),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toast({ variant: 'destructive', title: 'Email required', description: 'Please enter your email address.' });
      return;
    }
    setIsResetting(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({
        title: 'Password Reset Email Sent',
        description: `An email has been sent to ${resetEmail} with instructions to reset your password.`,
      });
      setIsResetDialogOpen(false);
      setResetEmail('');
    } catch (err: any) {
      const friendlyMessage = err.code?.replace('auth/', '').replace(/-/g, ' ') || 'An unexpected error occurred.';
      toast({
        variant: 'destructive',
        title: 'Reset Failed',
        description: friendlyMessage.charAt(0).toUpperCase() + friendlyMessage.slice(1),
      });
    } finally {
      setIsResetting(false);
    }
  };


  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="hidden bg-muted lg:flex lg:flex-col p-8">
        <Link href="/" className="flex items-center gap-4">
          <Logo />
          <div className="text-left">
            <h1 className="text-2xl font-bold font-headline text-primary">
              SATHI
            </h1>
            <p className="text-sm text-muted-foreground font-sans">
              Your AI Travel Ally
            </p>
          </div>
        </Link>
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.5 }}
                className="relative w-full h-96 my-8 max-w-md"
              >
                <Lottie
                  animationData={activeTab === "login" ? loginAnimation : signupAnimation}
                  loop
                  autoplay
                  className="w-full h-full rounded-lg"
                />
              </motion.div>
          </AnimatePresence>
        </div>
        <blockquote className="mt-auto space-y-2">
           <AnimatePresence mode="wait">
              <motion.div
                 key={activeTab}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 transition={{ duration: 0.3 }}
              >
                {activeTab === 'login' ? (
                  <>
                    <p className="text-lg">“Welcome back, adventurer! Your next journey awaits.”</p>
                    <footer className="text-sm text-muted-foreground">SATHI</footer>
                  </>
                ) : (
                  <>
                    <p className="text-lg">“The world is a book and those who do not travel read only one page.”</p>
                    <footer className="text-sm text-muted-foreground">Saint Augustine</footer>
                  </>
                )}
            </motion.div>
          </AnimatePresence>
        </blockquote>
      </div>
      <div className="flex items-center justify-center py-12 px-4 min-h-screen">
        <div className="mx-auto w-full max-w-sm">
          <div className="lg:hidden flex items-center justify-center gap-4 mb-8">
            <Link href="/" className="flex items-center gap-4">
              <Logo />
              <div className="text-left">
                <h1 className="text-2xl font-bold font-headline text-primary">
                  SATHI
                </h1>
                <p className="text-sm text-muted-foreground font-sans">
                  Your AI Travel Ally
                </p>
              </div>
            </Link>
          </div>
          <Tabs defaultValue="login" onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <motion.div initial="hidden" animate="visible" exit="exit" variants={motionVariants} transition={{ duration: 0.3 }}>
                <Card className="border-0 shadow-none">
                  <form onSubmit={(e) => handleAuth(e, 'login')}>
                    <CardHeader className="text-center">
                      <CardTitle className="text-3xl">Welcome Back</CardTitle>
                      <CardDescription>
                        Enter your email below to login to your account.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="m@example.com"
                          required
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" name="password" type="password" required disabled={isLoading} />
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                      <Button className="w-full" type="submit" disabled={isLoading}>
                        {isLoading && <LoadingSpinner className="mr-2" />}
                        Login
                      </Button>
                      <div className="text-center text-sm">
                        <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                          <AlertDialogTrigger asChild>
                            <Button variant="link" type="button" className="underline p-0 h-auto">Forgot your password?</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Reset Password</AlertDialogTitle>
                              <AlertDialogDescription>
                                Enter your email address and we will send you a link to reset your password.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-2">
                                <Label htmlFor="reset-email">Email</Label>
                                <Input
                                  id="reset-email"
                                  name="reset-email"
                                  type="email"
                                  placeholder="m@example.com"
                                  value={resetEmail}
                                  onChange={(e) => setResetEmail(e.target.value)}
                                  required
                                  disabled={isResetting}
                                />
                            </div>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handlePasswordReset} disabled={isResetting}>
                                {isResetting && <LoadingSpinner className="mr-2" />}
                                Send Reset Link
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardFooter>
                  </form>
                </Card>
              </motion.div>
            </TabsContent>
            <TabsContent value="signup">
              <motion.div initial="hidden" animate="visible" exit="exit" variants={motionVariants} transition={{ duration: 0.3 }}>
                <Card className="border-0 shadow-none">
                  <form onSubmit={(e) => handleAuth(e, 'signup')}>
                    <CardHeader className="text-center">
                      <CardTitle className="text-3xl">Create an Account</CardTitle>
                      <CardDescription>
                        Enter your information to get started.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <Input
                          id="signup-email"
                          name="email"
                          type="email"
                          placeholder="m@example.com"
                          required
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <Input id="signup-password" name="password" type="password" required disabled={isLoading}/>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full" type="submit" disabled={isLoading}>
                        {isLoading && <LoadingSpinner className="mr-2" />}
                        Sign Up
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
           {error && <p className="text-center text-sm text-destructive mt-4">{error}</p>}
          <p className="px-8 text-center text-sm text-muted-foreground mt-4">
            By clicking continue, you agree to our{' '}
            <a
              href="/terms"
              className="underline underline-offset-4 hover:text-primary"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="/privacy"
              className="underline underline-offset-4 hover:text-primary"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
