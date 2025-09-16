
'use client';

import * as React from 'react';
import type { Place, SavedItem, SavedPlan } from '@/lib/types';
import { auth } from '@/lib/firebase';
import { onIdTokenChanged, type User } from 'firebase/auth';
import { cacheService } from '@/lib/cache-service';

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
  // Session persistence methods
  getExplorationHistory: () => Place[];
  saveExplorationData: (places: Place[], location: { latitude: number; longitude: number }) => void;
  clearSessionData: () => void;
}

const SavedPlacesContext = React.createContext<SavedPlacesContextType | undefined>(undefined);

export function SavedPlacesProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Since there is no database, savedItems and savedPlans will be managed in session storage
  const [savedItems, setSavedItems] = React.useState<SavedItem[]>([]);
  const savedPlans: SavedPlan[] = []; // Plans not implemented yet

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

  // Load saved items from session on user change
  React.useEffect(() => {
    if (user) {
      const userSavedItems = cacheService.getSessionData(`savedItems_${user.uid}`) || [];
      setSavedItems(userSavedItems);
    } else {
      setSavedItems([]);
    }
  }, [user]);

  // Session-based save/unsave functions
  const saveItem = (item: Place, type: 'place' | 'hotel' | 'restaurant') => {
    if (!user) {
      console.warn("User must be logged in to save items");
      return;
    }

    const savedItem: SavedItem = {
      id: `${user.uid}_${item.place_id}_${Date.now()}`,
      place_id: item.place_id,
      name: item.name,
      vicinity: item.vicinity || '',
      rating: item.rating || 0,
      photoUrl: item.photoUrl || '',
      types: item.types || [],
      itemType: type,
      point: item.point,
      source: item.source,
      userId: user.uid,
      savedAt: new Date().toISOString(),
    };

    const newSavedItems = [...savedItems, savedItem];
    setSavedItems(newSavedItems);
    cacheService.setSessionData(`savedItems_${user.uid}`, newSavedItems);
    console.log(`Saved ${type}:`, item.name);
  };

  const unsaveItem = (itemPlaceId: string) => {
    if (!user) return;

    const newSavedItems = savedItems.filter(item => item.place_id !== itemPlaceId);
    setSavedItems(newSavedItems);
    cacheService.setSessionData(`savedItems_${user.uid}`, newSavedItems);
    console.log('Unsaved item:', itemPlaceId);
  };

  const isSaved = (itemPlaceId: string) => {
    return savedItems.some(item => item.place_id === itemPlaceId);
  };

  // Session persistence methods for exploration data
  const getExplorationHistory = (): Place[] => {
    const history = cacheService.getSessionData('explorationHistory') || [];
    return history;
  };

  const saveExplorationData = (places: Place[], location: { latitude: number; longitude: number }) => {
    const explorationData = {
      places,
      location,
      timestamp: Date.now(),
    };
    
    // Save current exploration
    cacheService.setSessionData('lastExploration', explorationData);
    
    // Add to history (keep last 10 explorations)
    const history = getExplorationHistory();
    const newHistory = [explorationData, ...history.slice(0, 9)];
    cacheService.setSessionData('explorationHistory', newHistory);
  };

  const clearSessionData = () => {
    cacheService.clearSessionData();
    setSavedItems([]);
    console.log('Session data cleared');
  };

  return (
    <SavedPlacesContext.Provider value={{ 
      savedItems, 
      savedPlans, 
      saveItem, 
      unsaveItem, 
      isSaved, 
      isLoading, 
      user, 
      userProfile,
      getExplorationHistory,
      saveExplorationData,
      clearSessionData
    }}>
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
