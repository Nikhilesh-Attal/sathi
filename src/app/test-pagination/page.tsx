'use client';

import { useState, useEffect } from 'react';
import PaginatedPlacesList from '@/components/PaginatedPlacesList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Loader2 } from 'lucide-react';

// Default location (Delhi, India)
const DEFAULT_LOCATION = {
  latitude: 28.6139,
  longitude: 77.2090
};

export default function TestPaginationPage() {
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [customLat, setCustomLat] = useState(DEFAULT_LOCATION.latitude.toString());
  const [customLon, setCustomLon] = useState(DEFAULT_LOCATION.longitude.toString());
  const [gettingLocation, setGettingLocation] = useState(false);
  const [initialPlaces, setInitialPlaces] = useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [key, setKey] = useState(0); // Force re-render of PaginatedPlacesList

  // Get user's current location
  const getCurrentLocation = () => {
    setGettingLocation(true);
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setLocation(newLocation);
          setCustomLat(newLocation.latitude.toString());
          setCustomLon(newLocation.longitude.toString());
          setGettingLocation(false);
          
          console.log('[TestPagination] Updated location:', newLocation);
        },
        (error) => {
          console.error('[TestPagination] Geolocation error:', error);
          setGettingLocation(false);
          alert('Unable to get your current location. Using default location (Delhi).');
        }
      );
    } else {
      setGettingLocation(false);
      alert('Geolocation is not supported by this browser.');
    }
  };

  // Update location from custom inputs
  const updateLocation = () => {
    const lat = parseFloat(customLat);
    const lon = parseFloat(customLon);
    
    if (isNaN(lat) || isNaN(lon)) {
      alert('Please enter valid latitude and longitude values.');
      return;
    }
    
    if (lat < -90 || lat > 90) {
      alert('Latitude must be between -90 and 90.');
      return;
    }
    
    if (lon < -180 || lon > 180) {
      alert('Longitude must be between -180 and 180.');
      return;
    }
    
    setLocation({ latitude: lat, longitude: lon });
    console.log('[TestPagination] Manual location update:', { latitude: lat, longitude: lon });
  };

  // Fetch initial places when location changes
  useEffect(() => {
    const fetchInitialPlaces = async () => {
      setLoadingInitial(true);
      setInitialPlaces([]);
      
      try {
        console.log('[TestPagination] Fetching initial places for:', location);
        
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: location.latitude,
            longitude: location.longitude,
            offset: 0,
            limit: 500, // Fetch many more results initially
            loadMore: false
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (data.places) {
          setInitialPlaces(data.places);
          console.log('[TestPagination] Initial places loaded:', data.places.length);
        }
      } catch (error: any) {
        console.error('[TestPagination] Error fetching initial places:', error);
      } finally {
        setLoadingInitial(false);
      }
    };

    fetchInitialPlaces();
    setKey(prev => prev + 1); // Force re-render of PaginatedPlacesList
  }, [location]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Pagination Test Page</h1>
          <p className="text-muted-foreground">
            Test infinite scroll pagination with real location data
          </p>
        </div>

        {/* Location Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Button 
                onClick={getCurrentLocation} 
                disabled={gettingLocation}
                variant="outline"
              >
                {gettingLocation ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Getting Location...
                  </>
                ) : (
                  'Use My Location'
                )}
              </Button>
              
              <div className="text-sm text-muted-foreground">
                Current: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="any"
                placeholder="Latitude"
                value={customLat}
                onChange={(e) => setCustomLat(e.target.value)}
                className="w-32"
              />
              <Input
                type="number"
                step="any"
                placeholder="Longitude"
                value={customLon}
                onChange={(e) => setCustomLon(e.target.value)}
                className="w-32"
              />
              <Button onClick={updateLocation}>
                Update Location
              </Button>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Quick locations to try:</strong></p>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => { setCustomLat('28.6139'); setCustomLon('77.2090'); }}
                  className="text-blue-600 hover:underline"
                >
                  Delhi (28.6139, 77.2090)
                </button>
                <button 
                  onClick={() => { setCustomLat('19.0760'); setCustomLon('72.8777'); }}
                  className="text-blue-600 hover:underline"
                >
                  Mumbai (19.0760, 72.8777)
                </button>
                <button 
                  onClick={() => { setCustomLat('12.9716'); setCustomLon('77.5946'); }}
                  className="text-blue-600 hover:underline"
                >
                  Bangalore (12.9716, 77.5946)
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Test Pagination</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ol className="list-decimal list-inside space-y-1">
              <li>Set your location using the controls above</li>
              <li>Wait for initial places to load</li>
              <li>Scroll down to the bottom of the places list</li>
              <li>Watch as new places automatically load (infinite scroll)</li>
              <li>Check the browser console for detailed pagination logs</li>
            </ol>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-blue-800 text-xs">
                <strong>Note:</strong> The first load fetches data from Qdrant (if available) or falls back to external APIs. 
                Subsequent loads use pagination parameters to fetch more results from the same data source.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Places List with Pagination */}
        {loadingInitial ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mr-3" />
              <span>Loading initial places...</span>
            </CardContent>
          </Card>
        ) : (
          <PaginatedPlacesList
            key={key} // Force re-render when location changes
            latitude={location.latitude}
            longitude={location.longitude}
            initialPlaces={initialPlaces}
          />
        )}
      </div>
    </div>
  );
}