'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Star, Loader2 } from 'lucide-react';

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

interface PaginationInfo {
  offset: number;
  limit: number;
  hasMore: boolean;
  total: number;
}

interface PaginatedPlacesListProps {
  latitude: number;
  longitude: number;
  initialPlaces?: Place[];
}

export default function PaginatedPlacesList({ 
  latitude, 
  longitude, 
  initialPlaces = [] 
}: PaginatedPlacesListProps) {
  const [places, setPlaces] = useState<Place[]>(initialPlaces);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    offset: initialPlaces.length,
    limit: 100, // Larger batch size for better performance
    hasMore: true,
    total: initialPlaces.length
  });

  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastPlaceRef = useRef<HTMLDivElement | null>(null);

  const fetchMorePlaces = useCallback(async () => {
    if (loading || !pagination.hasMore) return;

    console.log(`[PaginatedPlacesList] Fetching more places: offset=${pagination.offset}, limit=${pagination.limit}`);
    setLoading(true);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude,
          longitude,
          offset: pagination.offset,
          limit: pagination.limit,
          loadMore: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.places && data.places.length > 0) {
        setPlaces(prevPlaces => {
          // Filter out duplicates by name and coordinates
          const existingPlaceKeys = new Set(
            prevPlaces.map(p => `${p.name}-${p.coordinates.latitude}-${p.coordinates.longitude}`)
          );
          
          const newPlaces = data.places.filter((place: Place) => 
            !existingPlaceKeys.has(`${place.name}-${place.coordinates.latitude}-${place.coordinates.longitude}`)
          );
          
          return [...prevPlaces, ...newPlaces];
        });

        setPagination(prev => ({
          ...prev,
          offset: prev.offset + data.places.length,
          hasMore: data.pagination?.hasMore || data.places.length === pagination.limit,
          total: prev.total + data.places.length
        }));

        console.log(`[PaginatedPlacesList] Added ${data.places.length} new places. Total: ${places.length + data.places.length}`);
      } else {
        setPagination(prev => ({ ...prev, hasMore: false }));
        console.log(`[PaginatedPlacesList] No more places available`);
      }
    } catch (error: any) {
      console.error('[PaginatedPlacesList] Error fetching more places:', error);
      setPagination(prev => ({ ...prev, hasMore: false }));
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude, loading, pagination.hasMore, pagination.offset, pagination.limit, places.length]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const lastEntry = entries[0];
        if (lastEntry.isIntersecting && pagination.hasMore && !loading) {
          console.log('[PaginatedPlacesList] Last item visible, triggering fetch');
          fetchMorePlaces();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    );

    if (lastPlaceRef.current) {
      observerRef.current.observe(lastPlaceRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [fetchMorePlaces, pagination.hasMore, loading]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Places Near You</h2>
        <Badge variant="secondary">
          {places.length} places found
        </Badge>
      </div>

      {/* Places List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {places.map((place, index) => (
          <Card 
            key={`${place.name}-${place.coordinates.latitude}-${place.coordinates.longitude}-${index}`}
            className="hover:shadow-lg transition-shadow"
            ref={index === places.length - 1 ? lastPlaceRef : null}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg line-clamp-2">{place.name}</CardTitle>
                <Badge variant="outline" className="ml-2 text-xs">
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
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {place.description || 'No description available'}
              </p>
              
              {place.address && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="line-clamp-1">{place.address}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between mt-3">
                <Badge variant="secondary" className="text-xs">
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

      {/* Loading Indicator */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading more places...</span>
        </div>
      )}

      {/* End of Results Message */}
      {!loading && !pagination.hasMore && places.length > 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>You've reached the end of the results!</p>
          <p className="text-sm">Total places found: {places.length}</p>
        </div>
      )}

      {/* No Results Message */}
      {!loading && places.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No places found</p>
          <p className="text-sm">Try adjusting your location or search criteria</p>
        </div>
      )}
    </div>
  );
}