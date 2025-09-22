
'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import type { Place } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, SlidersHorizontal } from 'lucide-react';
import { FiltersPanel } from './filters-panel';
import { EnhancedPlaceList } from './enhanced-place-list';
import { useLiveLocation } from '@/context/live-location-context';
import { LoadingSpinner } from './loading-spinner';

// Dynamically import the map to prevent SSR issues with Leaflet
const LeafletMap = dynamic(
  () => import('./leaflet-map').then((mod) => mod.LeafletMap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full" />,
  }
);

// Skeleton component for the loading state of the place list
function PlaceListSkeleton() {
    return (
        <div className="p-2 space-y-2">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3 p-2 rounded-lg">
                    <Skeleton className="w-24 h-24 rounded-md" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-5 w-1/4" />
                    </div>
                </div>
            ))}
        </div>
    );
}


export function ExplorePage() {
  const { livePlaces, liveLocation, isLoadingInitialData, error, sourceMessage } = useLiveLocation();
  console.log('[ExplorePage] liveLocation:', liveLocation);
  console.log('[ExplorePage] livePlaces:', livePlaces);
  
  // Debug: Log unique categories and itemTypes in the data
  React.useEffect(() => {
    if (livePlaces.length > 0) {
      const uniqueCategories = [...new Set(livePlaces.map(p => p.category).filter(Boolean))];
      const uniqueItemTypes = [...new Set(livePlaces.map(p => p.itemType).filter(Boolean))];
      const uniqueTypes = [...new Set(livePlaces.flatMap(p => p.types || []).filter(Boolean))];
      
      console.log('[ExplorePage] DEBUG - Data categories found:', uniqueCategories);
      console.log('[ExplorePage] DEBUG - Data itemTypes found:', uniqueItemTypes);
      console.log('[ExplorePage] DEBUG - Data types found:', uniqueTypes);
      
      // Sample a few places to see their structure
      console.log('[ExplorePage] DEBUG - Sample places:', livePlaces.slice(0, 5).map(p => ({
        name: p.name,
        category: p.category,
        itemType: p.itemType,
        types: p.types
      })));
    }
  }, [livePlaces]);

  const [filters, setFilters] = React.useState<string[]>([]);
  const [qualityFilter, setQualityFilter] = React.useState<'all' | 'good' | 'excellent'>('good'); // Default to good quality
  const [selectedPlaceId, setSelectedPlaceId] = React.useState<string | null>(null);

  const filteredItems = React.useMemo(() => {
    console.log('[ExplorePage] Filtering logic - filters:', filters, 'places count:', livePlaces.length);
    
    if (filters.length === 0) {
      console.log('[ExplorePage] No filters applied, showing all places:', livePlaces.length);
      return livePlaces;
    }
    
    const filtered = livePlaces.filter((item) => {
      // Create itemTypes array from multiple sources
      const itemTypes = [];
      
      // Add from types array
      if (item.types && item.types.length > 0) {
        itemTypes.push(...item.types);
      }
      
      // Add from itemType
      if (item.itemType) {
        itemTypes.push(item.itemType);
      }
      
      // Add from category
      if (item.category) {
        itemTypes.push(item.category);
      }
      
      // Fallback
      if (itemTypes.length === 0) {
        itemTypes.push('place');
      }
      
      const matches = filters.some(filter => itemTypes.includes(filter));
      
      if (item.name && (item.name.toLowerCase().includes('palace') || item.name.toLowerCase().includes('fort'))) {
        console.log('[ExplorePage] Debug place:', {
          name: item.name,
          category: item.category,
          itemType: item.itemType,
          types: item.types,
          itemTypes,
          filters,
          matches
        });
      }
      
      return matches;
    });
    
    console.log('[ExplorePage] After filtering:', filtered.length, 'places');
    if (filtered.length > 0) {
      console.log('[ExplorePage] Sample filtered places:', filtered.slice(0, 3).map(p => ({
        name: p.name,
        category: p.category,
        itemType: p.itemType,
        types: p.types
      })));
    }
    
    return filtered;
  }, [livePlaces, filters]);

  const renderContent = () => {
    if (isLoadingInitialData) {
      return (
        <div className="flex flex-col md:flex-row h-full">
          <div className="h-2/5 md:h-full md:w-1/2 lg:w-3/5">
            <Skeleton className="h-full w-full" />
          </div>
          <div className="h-3/5 md:h-full md:w-1/2 lg:w-2/5 flex flex-col border-t md:border-t-0 md:border-l">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5"/>
                Explore Nearby
              </h2>
              <p className="text-sm text-muted-foreground">Finding places near you...</p>
            </div>
            <PlaceListSkeleton />
          </div>
        </div>
      );
    }
    
    if (error) {
       return (
         <div className="flex flex-col items-center justify-center h-[600px] text-center space-y-4 p-4">
            <Alert variant="destructive" className="max-w-lg">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>An Error Occurred</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
       );
    }

    return (
      <div className="flex flex-col md:flex-row h-full">
        {/* Map View */}
        <div className="relative h-2/5 md:h-full md:w-1/2 lg:w-3/5 z-0">
          {liveLocation && <LeafletMap 
              location={liveLocation} 
              items={filteredItems}
              selectedPlaceId={selectedPlaceId}
              onMarkerClick={(id) => setSelectedPlaceId(id)}
            >
            </LeafletMap>}
        </div>
        {/* List View */}
        <div className="h-3/5 md:h-full md:w-1/2 lg:w-2/5 flex flex-col border-t md:border-t-0 md:border-l">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5"/>
                Places Near You
              </h2>
              <p className="text-sm text-muted-foreground">
                {filteredItems.length} places found. {sourceMessage}
              </p>
            </div>
            <FiltersPanel 
              onFilterChange={setFilters} 
              selectedFilters={filters}
              qualityFilter={qualityFilter}
              onQualityFilterChange={setQualityFilter}
              totalPlaces={livePlaces.length}
              filteredPlaces={filteredItems.length}
            />
            <EnhancedPlaceList 
              items={filteredItems} 
              onCardClick={setSelectedPlaceId} 
              selectedPlaceId={selectedPlaceId}
              showQualityScores={qualityFilter !== 'all'} 
            />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-background h-[calc(100vh-10rem-1px)]">
      {renderContent()}
    </div>
  );
}
