'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Star, Loader2, RefreshCw, Database } from 'lucide-react';

interface Place {
  name: string;
  description?: string;
  rating?: number;
  category?: string;
  address?: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  source: string;
  itemType?: string;
}

interface UnlimitedPlacesListProps {
  latitude: number;
  longitude: number;
}

export default function UnlimitedPlacesList({ 
  latitude, 
  longitude
}: UnlimitedPlacesListProps) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [totalFetched, setTotalFetched] = useState(0);

  const fetchAllPlaces = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`[UnlimitedPlacesList] Fetching ALL places for: ${latitude}, ${longitude}`);
      
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude,
          longitude,
          offset: 0,
          limit: 50000, // Very high limit to get everything
          loadMore: false
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.places) {
        setPlaces(data.places);
        setTotalFetched(data.places.length);
        setLastFetchTime(new Date());
        console.log(`[UnlimitedPlacesList] Fetched ${data.places.length} places from ${data.source || 'unknown'} source`);
        
        // Log source breakdown
        const sourceBreakdown = data.places.reduce((acc: any, place: Place) => {
          acc[place.source] = (acc[place.source] || 0) + 1;
          return acc;
        }, {});
        console.log(`[UnlimitedPlacesList] Source breakdown:`, sourceBreakdown);
      } else {
        setPlaces([]);
        setTotalFetched(0);
      }
    } catch (error: any) {
      console.error('[UnlimitedPlacesList] Error fetching places:', error);
      setError(error.message);
      setPlaces([]);
      setTotalFetched(0);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when location changes
  useEffect(() => {
    fetchAllPlaces();
  }, [latitude, longitude]);

  // Group places by source for better visualization
  const placesBySource = places.reduce((acc: any, place) => {
    if (!acc[place.source]) {
      acc[place.source] = [];
    }
    acc[place.source].push(place);
    return acc;
  }, {});

  const sourceColors: { [key: string]: string } = {
    'qdrant': 'bg-green-100 text-green-800',
    'geoapify': 'bg-blue-100 text-blue-800',
    'openstreetmap': 'bg-purple-100 text-purple-800',
    'rapidapi': 'bg-orange-100 text-orange-800',
    'opentripmap': 'bg-yellow-100 text-yellow-800',
    'ai-fallback': 'bg-gray-100 text-gray-800',
    'emergency-fallback': 'bg-red-100 text-red-800'
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            All Places - Unlimited Results
          </h2>
          <p className="text-muted-foreground text-sm">
            Fetches maximum available data from all sources
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {lastFetchTime && (
            <div className="text-sm text-muted-foreground">
              Last updated: {lastFetchTime.toLocaleTimeString()}
            </div>
          )}
          <Button 
            onClick={fetchAllPlaces} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Fetching...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalFetched}</div>
            <p className="text-xs text-muted-foreground">Total Places</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{Object.keys(placesBySource).length}</div>
            <p className="text-xs text-muted-foreground">Data Sources</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {places.filter(p => p.rating && p.rating >= 4.0).length}
            </div>
            <p className="text-xs text-muted-foreground">High Rated (4.0+)</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {new Set(places.map(p => p.itemType || p.category)).size}
            </div>
            <p className="text-xs text-muted-foreground">Unique Categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Source Breakdown */}
      {Object.keys(placesBySource).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Data Source Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(placesBySource).map(([source, sourcePlaces]) => (
                <Badge 
                  key={source}
                  className={sourceColors[source] || 'bg-gray-100 text-gray-800'}
                >
                  {source}: {(sourcePlaces as Place[]).length}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200">
          <CardContent className="pt-6 text-red-600">
            <div className="font-medium">Error fetching places:</div>
            <div className="text-sm mt-1">{error}</div>
          </CardContent>
        </Card>
      )}

      {/* Places Grid */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-12 w-12 animate-spin mr-4" />
            <div>
              <div className="font-medium">Fetching unlimited results...</div>
              <div className="text-sm text-muted-foreground">
                This may take a while as we're getting ALL available data
              </div>
            </div>
          </CardContent>
        </Card>
      ) : places.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {places.map((place, index) => (
            <Card 
              key={`${place.name}-${place.coordinates.latitude}-${place.coordinates.longitude}-${index}`}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base line-clamp-2">{place.name}</CardTitle>
                  <Badge 
                    variant="outline" 
                    className={`ml-2 text-xs ${sourceColors[place.source] || ''}`}
                  >
                    {place.itemType || place.category || 'place'}
                  </Badge>
                </div>
                {place.rating && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{place.rating.toFixed(1)}</span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {place.description || 'No description available'}
                </p>
                
                {place.address && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="line-clamp-1">{place.address}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-2 border-t">
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${sourceColors[place.source] || ''}`}
                  >
                    {place.source}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {place.coordinates.latitude.toFixed(4)}, {place.coordinates.longitude.toFixed(4)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !loading && (
        <Card>
          <CardContent className="text-center py-12">
            <MapPin className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <div className="text-lg font-medium mb-2">No places found</div>
            <div className="text-sm text-muted-foreground">
              No data available for this location from any source
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}