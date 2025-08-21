
'use client';

import * as React from 'react';
import type { Place, SavedItem, SavedPlan } from '@/lib/types';
import { auth } from '@/lib/firebase';
import { onIdTokenChanged, type User } from 'firebase/auth';

interface UserProfile {
  name: string | null;
  email: string | null;
}

interface SavedPlacesContextType {
  savedItems: SavedItem[];
  savedPlans: SavedPlan[];
  saveItem: (item: Place, type: 'place' | 'hotel' | 'restaurant') => void;
  unsaveItem: (itemPlaceId: string) => void;
  isSaved: (itemPlaceId: string) => boolean;
  isLoading: boolean;
  user: User | null;
  userProfile: UserProfile | null;
}

const SavedPlacesContext = React.createContext<SavedPlacesContextType | undefined>(undefined);

export function SavedPlacesProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Since there is no database, savedItems and savedPlans will always be empty.
  const savedItems: SavedItem[] = [];
  const savedPlans: SavedPlan[] = [];

  React.useEffect(() => {
    if (!auth) {
      console.error("Firebase Auth is not initialized correctly.");
      setIsLoading(false);
      return;
    }

    const unsubscribeAuth = onIdTokenChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // With no database, we create a mock profile from the auth object.
        setUserProfile({
          name: currentUser.displayName || currentUser.email,
          email: currentUser.email,
        });
      } else {
        setUserProfile(null);
      }

      setIsLoading(false);
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // These functions no longer do anything as there's no database.
  const saveItem = () => {
    console.warn("Save item called, but no database is configured.");
  };

  const unsaveItem = () => {
    console.warn("Unsave item called, but no database is configured.");
  };

  const isSaved = () => {
    return false; // Always return false.
  };

  return (
    <SavedPlacesContext.Provider value={{ savedItems, savedPlans, saveItem, unsaveItem, isSaved, isLoading, user, userProfile }}>
      {children}
    </SavedPlacesContext.Provider>
  );
}

export function useSavedPlaces() {
  const context = React.useContext(SavedPlacesContext);
  if (context === undefined) {
    throw new Error('useSavedPlaces must be used within a SavedPlacesProvider');
  }
  return context;
}
