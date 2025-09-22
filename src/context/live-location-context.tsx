
// src/context/live-location-context.tsx
'use client';

import * as React from 'react';
import type { Place } from '@/lib/types';
import { exploreNearby } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { useSavedPlaces } from './saved-places-context';

interface LiveLocationContextType {
  liveLocation: { latitude: number; longitude: number } | null;
  livePlaces: Place[];
  isLoadingInitialData: boolean;
  isLoadingLocation: boolean;
  loadingProgress: string;
  error: string | null;
  dataSource: 'firestore' | 'osm' | 'ai';
  sourceMessage: string | null;
  refetchPlaces: () => void;
}

const LiveLocationContext = React.createContext<LiveLocationContextType | undefined>(undefined);

const FALLBACK_LOCATION = {
  latitude: 28.6139, // Delhi, India
  longitude: 77.2090,
};
const FALLBACK_MESSAGE = "Could not get your location. Showing results for a default location (Delhi)!";

export const LiveLocationProvider = ({ children }: { children: React.ReactNode }) => {
  const [liveLocation, setLiveLocation] = React.useState<{ latitude: number; longitude: number } | null>(null);
  const [livePlaces, setLivePlaces] = React.useState<Place[]>([]);
  const [isLoadingInitialData, setIsLoadingInitialData] = React.useState(true);
  const [isLoadingLocation, setIsLoadingLocation] = React.useState(false);
  const [loadingProgress, setLoadingProgress] = React.useState('Getting your location...');
  const [error, setError] = React.useState<string | null>(null);
  const [dataSource, setDataSource] = React.useState<'firestore' | 'osm' | 'ai'>('osm');
  const [sourceMessage, setSourceMessage] = React.useState<string | null>(null);
  const { toast } = useToast();
  const hasFetched = React.useRef(false);

  const fetchData = async (loc: { latitude: number; longitude: number; }, isFallback: boolean = false) => {
    try {
      setError(null);
      setIsLoadingInitialData(true);
      setIsLoadingLocation(true);
      setLiveLocation(loc);

      if (isFallback) {
        setLoadingProgress('Using default location (Delhi)...');
        toast({
          title: "Using Default Location",
          description: FALLBACK_MESSAGE,
        });
      } else {
        setLoadingProgress('Searching for nearby places...');
      }

      // Use the API search endpoint (single call instead of duplicate)
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          latitude: loc.latitude, 
          longitude: loc.longitude,
          qualityFilter: 'good' // Default to good quality filter
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || `Search failed ${res.status}`);
      }
      
      const { places = [], source, message } = await res.json();
      console.log('[useLiveLocation] Received places from API:', places.length, 'places');
      
      setLivePlaces(places);
      setDataSource(source || 'osm');
      setSourceMessage(message || null);
      setLoadingProgress('Places loaded successfully!');
      
      // Save exploration data to session (will be accessed by SavedPlacesProvider if available)
      if (places.length > 0) {
        try {
          // Store in the global cache service for now
          const explorationData = {
            places,
            location: loc,
            timestamp: Date.now(),
          };
          // This will be available when user logs in
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('lastExploration', JSON.stringify(explorationData));
          }
        } catch (e) {
          console.warn('Could not save exploration data to session');
        }
      }

      if (message) {
        toast({
          title: "Displaying Curated Places",
          description: message,
          duration: 5000,
        });
      }
      
      if (places.length === 0) {
        setError("No places were found for this location. You might be in a very remote area!");
        setLoadingProgress('No places found nearby');
      }

      if (source === 'ai') {
        toast({
          title: "Creative Discovery",
          description: "No real-world places found nearby, so we've generated some creative suggestions with AI!",
          duration: 5000,
        });
      }
    } catch (error: any) {
      console.error('[useLiveLocation] Error fetching data:', error);
      setError(error.message || 'An unknown error occurred while fetching places.');
      setLoadingProgress('Error loading places');
      toast({
        variant: 'destructive',
        title: 'Could Not Fetch Places',
        description: error.message || 'An unknown error occurred.',
      });
    } finally {
      setIsLoadingInitialData(false);
      setIsLoadingLocation(false);
    }
  };

  const refetchPlaces = React.useCallback(() => {
    if (liveLocation) {
      fetchData(liveLocation);
    }
  }, [liveLocation]);

  React.useEffect(() => {
    if (hasFetched.current || typeof window === 'undefined') return;
    hasFetched.current = true;

    if (navigator.geolocation) {
      setLoadingProgress('Getting your location...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLoadingProgress('Location found! Searching nearby places...');
          fetchData({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.warn("Geolocation error:", error.message, "Using fallback.");
          setLoadingProgress('Location access denied, using default location...');
          fetchData(FALLBACK_LOCATION, true);
        },
        {
          timeout: 10000, // 10 second timeout
          maximumAge: 300000, // 5 minutes
        }
      );
    } else {
      console.warn("Geolocation not supported. Using fallback.");
      setLoadingProgress('Geolocation not supported, using default location...');
      fetchData(FALLBACK_LOCATION, true);
    }
  }, [toast]);

  return (
    <LiveLocationContext.Provider value={{ 
      liveLocation, 
      livePlaces, 
      isLoadingInitialData, 
      isLoadingLocation,
      loadingProgress,
      error, 
      dataSource, 
      sourceMessage,
      refetchPlaces
    }}>
      {children}
    </LiveLocationContext.Provider>
  );
};

export const useLiveLocation = () => {
  const context = React.useContext(LiveLocationContext);
  if (context === undefined) {
    throw new Error('useLiveLocation must be used within a LiveLocationProvider');
  }
  return context;
};
