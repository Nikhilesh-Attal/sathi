
'use client';

import * as React from 'react';
import { MainTabs, MainTabsContent, MainTabsWrapper, useTabContext } from '@/components/app/main-tabs';
import { Logo } from '@/components/app/logo';
import { Button } from '@/components/ui/button';
import { LogOut, User, Bot, MapPin, Bookmark, Languages } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { SavedPlacesProvider, useSavedPlaces } from '@/context/saved-places-context';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingSpinner } from '@/components/app/loading-spinner';
import Link from 'next/link';
import { cn } from '@/lib/utils';

function Header() {
  const { userProfile } = useSavedPlaces();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      if (auth && auth.currentUser) {
        await auth.signOut();
      }
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Still navigate even if signout fails
      router.push('/');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-muted/95 backdrop-blur-sm">
      <div className="container flex h-16 items-center px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <Logo />
              <span className="font-bold sm:inline-block text-primary text-xl">
                SATHI
              </span>
            </Link>
            {/* Desktop Navigation */}
            <nav className="hidden md:flex">
                <MainTabs />
            </nav>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-4">
          {userProfile ? (
            <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Welcome, {userProfile.name}!</span>
            </div>
          ) : (
              <Skeleton className="h-8 w-32 rounded-md" />
          )}
          <Button onClick={handleLogout} variant="outline" size="icon" aria-label="Logout">
              <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

const MobileBottomNav = () => {
  const { activeTab, setActiveTab } = useTabContext();
  
  const navItems = [
    { value: 'explore', label: 'Explore', icon: MapPin },
    { value: 'assistant', label: 'Assistant', icon: Bot },
    /*{ value: 'saved', label: 'Saved', icon: Bookmark },*/
    { value: 'translator', label: 'Translator', icon: Languages },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => (
          <button
            key={item.value}
            onClick={() => setActiveTab(item.value)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
              activeTab === item.value ? 'text-primary' : 'text-muted-foreground hover:text-primary'
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

function DashboardPageContent() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <MainTabsWrapper>
        <Header />
        <MainTabsContent />
        <MobileBottomNav />
      </MainTabsWrapper>
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useSavedPlaces();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  return <>{children}</>;
}


export default function DashboardPage() {
  return (
    <SavedPlacesProvider>
      <AuthGuard>
        <DashboardPageContent />
      </AuthGuard>
    </SavedPlacesProvider>
  );
}
