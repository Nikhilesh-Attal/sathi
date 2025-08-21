
// src/context/live-location-context.tsx
'use client';

import * as React from 'react';
import type { Place } from '@/lib/types';
import { exploreNearby } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

interface LiveLocationContextType {
  liveLocation: { latitude: number; longitude: number } | null;
  livePlaces: Place[];
  isLoadingInitialData: boolean;
  error: string | null;
  dataSource: 'firestore' | 'osm' | 'ai';
  sourceMessage: string | null;
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
  const [error, setError] = React.useState<string | null>(null);
  const [dataSource, setDataSource] = React.useState<'firestore' | 'osm' | 'ai'>('osm');
  const [sourceMessage, setSourceMessage] = React.useState<string | null>(null);
  const { toast } = useToast();
  const hasFetched = React.useRef(false);

  React.useEffect(() => {
    if (hasFetched.current || typeof window === 'undefined') return;
    hasFetched.current = true;

    const fetchData = async (loc: { latitude: number; longitude: number; }, isFallback: boolean = false) => {
      setError(null);
      setIsLoadingInitialData(true);
      setLiveLocation(loc);

      if (isFallback) {
        toast({
          title: "Using Default Location",
          description: FALLBACK_MESSAGE,
        });
      }

      // src/context/live-location-context.tsx (inside your effect)
const res = await fetch('/api/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ latitude: loc.latitude, longitude: loc.longitude }),
});
if (!res.ok) throw new Error((await res.json().catch(()=>null))?.error || `Search failed ${res.status}`);
const { places = [], source, message } = await res.json();
setLivePlaces(places);
setDataSource(source || 'osm');
setSourceMessage(message || null);
setError(null);

      const result = await exploreNearby(loc);
      
      if (result.success && result.data) {
        const { places = [], source, message } = result.data as any;
        console.log('[useLiveLocation] Received places from exploreNearby:', places);
        
        setLivePlaces(places);
        setDataSource(source);
        setSourceMessage(message || null);

        if (message) {
           toast({
              title: "Displaying Curated Places",
              description: message,
              duration: 5000,
            });
        }
        
        if (places.length === 0) {
          setError("No places were found for this location. You might be in a very remote area!");
        }

        if (source === 'ai') {
          toast({
              title: "Creative Discovery",
              description: "No real-world places found nearby, so we've generated some creative suggestions with AI!",
              duration: 5000,
          });
        }
      } else {
        setError(result.error || 'An unknown error occurred while fetching places.');
        toast({
          variant: 'destructive',
          title: 'Could Not Fetch Places',
          description: result.error || 'An unknown error occurred.',
        });
      }
      setIsLoadingInitialData(false);
    };

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                fetchData({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
            },
            () => {
                console.warn("Geolocation permission denied. Using fallback.");
                fetchData(FALLBACK_LOCATION, true);
            }
        );
    } else {
        console.warn("Geolocation not supported. Using fallback.");
        fetchData(FALLBACK_LOCATION, true);
    }
  }, [toast]);

  return (
    <LiveLocationContext.Provider value={{ liveLocation, livePlaces, isLoadingInitialData, error, dataSource, sourceMessage }}>
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
