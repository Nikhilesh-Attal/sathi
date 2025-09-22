'use client';

import { useState, useEffect } from 'react';
import UnlimitedPlacesList from '@/components/UnlimitedPlacesList';
import PaginatedPlacesList from '@/components/PaginatedPlacesList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Loader2, Database, Layers } from 'lucide-react';

// Default location (Delhi, India)
const DEFAULT_LOCATION = {
  latitude: 28.6139,
  longitude: 77.2090
};

// Preset locations for testing
const PRESET_LOCATIONS = [
  { name: 'Delhi, India', lat: 28.6139, lon: 77.2090 },
  { name: 'Mumbai, India', lat: 19.0760, lon: 72.8777 },
  { name: 'Bangalore, India', lat: 12.9716, lon: 77.5946 },
  { name: 'Jaipur, India', lat: 26.9124, lon: 75.7873 },
  { name: 'Chennai, India', lat: 13.0827, lon: 80.2707 },
  { name: 'Kolkata, India', lat: 22.5726, lon: 88.3639 },
  { name: 'Hyderabad, India', lat: 17.3850, lon: 78.4867 },
  { name: 'Pune, India', lat: 18.5204, lon: 73.8567 }
];

export default function TestUnlimitedPage() {
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [customLat, setCustomLat] = useState(DEFAULT_LOCATION.latitude.toString());
  const [customLon, setCustomLon] = useState(DEFAULT_LOCATION.longitude.toString());
  const [gettingLocation, setGettingLocation] = useState(false);
  const [activeTab, setActiveTab] = useState('unlimited');

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
          
          console.log('[TestUnlimited] Updated location:', newLocation);
        },
        (error) => {
          console.error('[TestUnlimited] Geolocation error:', error);
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
    console.log('[TestUnlimited] Manual location update:', { latitude: lat, longitude: lon });
  };

  // Use preset location
  const usePresetLocation = (preset: typeof PRESET_LOCATIONS[0]) => {
    setLocation({ latitude: preset.lat, longitude: preset.lon });
    setCustomLat(preset.lat.toString());
    setCustomLon(preset.lon.toString());
    console.log('[TestUnlimited] Using preset location:', preset.name, preset);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
            <Database className="h-8 w-8" />
            Unlimited Results Test
          </h1>
          <p className="text-muted-foreground text-lg">
            Compare paginated vs unlimited data fetching with maximum results
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
            {/* Current Location */}
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
                Current: <span className="font-mono">{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</span>
              </div>
            </div>
            
            {/* Manual Input */}
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

            {/* Preset Locations */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Quick locations for testing:</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_LOCATIONS.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    size="sm"
                    onClick={() => usePresetLocation(preset)}
                    className="text-xs"
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Comparison: Unlimited vs Paginated Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="font-semibold text-green-700">✅ Unlimited Results</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Fetches ALL available data in one request</li>
                  <li>• No pagination - gets maximum results (10,000+ limit)</li>
                  <li>• Shows total count and data source breakdown</li>
                  <li>• Better for data analysis and complete overview</li>
                  <li>• Higher memory usage but complete data set</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-700">🔄 Paginated Results</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Loads data in smaller chunks (100 items per batch)</li>
                  <li>• Infinite scroll - loads more as you scroll</li>
                  <li>• Lower initial load time and memory usage</li>
                  <li>• Better for browsing and user experience</li>
                  <li>• Progressive loading with smooth UX</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="unlimited" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Unlimited Results
            </TabsTrigger>
            <TabsTrigger value="paginated" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Paginated Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unlimited" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="h-5 w-5 text-green-600" />
                  Unlimited Results Mode
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Fetches ALL available places in a single request with no practical limit.
                  This mode is ideal for getting the complete dataset and understanding what data is available.
                </p>
              </CardHeader>
            </Card>
            
            <UnlimitedPlacesList
              latitude={location.latitude}
              longitude={location.longitude}
            />
          </TabsContent>

          <TabsContent value="paginated" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Layers className="h-5 w-5 text-blue-600" />
                  Paginated Results Mode
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Loads places progressively with infinite scroll. Better for user experience 
                  and performance when dealing with large datasets.
                </p>
              </CardHeader>
            </Card>
            
            <PaginatedPlacesList
              latitude={location.latitude}
              longitude={location.longitude}
              initialPlaces={[]}
            />
          </TabsContent>
        </Tabs>

        {/* Technical Information */}
        <Card>
          <CardHeader>
            <CardTitle>Technical Implementation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Backend Changes</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Default limit increased from 50 to 10,000</li>
                  <li>• Qdrant fetch limit increased to unlimited</li>
                  <li>• API route supports high limit values (50,000+)</li>
                  <li>• Pagination still available for progressive loading</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Frontend Features</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• UnlimitedPlacesList component for maximum data</li>
                  <li>• Data source breakdown and statistics</li>
                  <li>• Enhanced error handling and loading states</li>
                  <li>• Memory-efficient rendering with React keys</li>
                </ul>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                <strong>Note:</strong> Check the browser console for detailed logs about data fetching, 
                source breakdown, and performance metrics. The system will attempt to get data from 
                Qdrant first (if available), then fall back to external APIs like Geoapify, 
                OpenStreetMap, RapidAPI, and OpenTripMap.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}