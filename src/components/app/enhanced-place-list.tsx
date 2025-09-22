'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Star, Clock, Award, Navigation } from 'lucide-react';
import type { Place } from '@/lib/types';
import { getPlaceQualityScore } from '@/lib/data-quality-filter';

interface EnhancedPlaceListProps {
  items: Place[];
  onCardClick: (placeId: string) => void;
  selectedPlaceId: string | null;
  showQualityScores?: boolean;
}

function formatDistance(distance?: number): string {
  if (!distance) return '';
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  }
  return `${(distance / 1000).toFixed(1)}km`;
}

function getQualityBadge(score: number, category: string) {
  const badgeProps = {
    excellent: { variant: 'default' as const, icon: '🏆', color: 'text-yellow-600' },
    good: { variant: 'secondary' as const, icon: '⭐', color: 'text-blue-600' },
    fair: { variant: 'outline' as const, icon: '👍', color: 'text-green-600' },
    poor: { variant: 'outline' as const, icon: '📍', color: 'text-gray-500' },
    irrelevant: { variant: 'destructive' as const, icon: '❌', color: 'text-red-600' }
  };

  const props = badgeProps[category as keyof typeof badgeProps] || badgeProps.fair;
  
  return (
    <Badge variant={props.variant} className={`text-xs ${props.color}`}>
      {props.icon} {Math.round(score * 100)}%
    </Badge>
  );
}

function PlaceCard({ 
  place, 
  isSelected, 
  onClick, 
  showQualityScore = false 
}: { 
  place: Place; 
  isSelected: boolean; 
  onClick: () => void;
  showQualityScore: boolean;
}) {
  const qualityScore = React.useMemo(() => 
    showQualityScore ? getPlaceQualityScore(place) : null, 
    [place, showQualityScore]
  );

  const getCategoryEmoji = (category: string) => {
    const emojiMap: Record<string, string> = {
      'historical': '🏛️',
      'monument': '🗿',
      'temple': '🕌',
      'park': '🌳',
      'hotel': '🏨',
      'restaurant': '🍽️',
      'museum': '🏛️',
      'palace': '👑',
      'fort': '🏰',
      'lake': '🌊',
      'market': '🛒',
      'entertainment': '🎭',
      'cafe': '☕',
      'misc': '📍'
    };
    return emojiMap[category] || '📍';
  };

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected
          ? 'ring-2 ring-primary bg-primary/5'
          : 'hover:bg-muted/50'
      }`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* Header with name and quality */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2 flex-1">
              {getCategoryEmoji(place.category || '')} {place.name}
            </h3>
            {qualityScore && (
              <div className="flex-shrink-0">
                {getQualityBadge(qualityScore.score, qualityScore.category)}
              </div>
            )}
          </div>

          {/* Category and distance */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs px-1 py-0">
                {place.category || 'Place'}
              </Badge>
              {place.itemType && place.itemType !== 'place' && (
                <Badge variant="secondary" className="text-xs px-1 py-0">
                  {place.itemType}
                </Badge>
              )}
            </div>
            {place.distance && (
              <div className="flex items-center gap-1">
                <Navigation className="h-3 w-3" />
                <span>{formatDistance(place.distance)}</span>
              </div>
            )}
          </div>

          {/* Address */}
          {place.address && (
            <div className="flex items-start gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{place.address}</span>
            </div>
          )}

          {/* Rating */}
          {place.rating && place.rating > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{place.rating.toFixed(1)}</span>
            </div>
          )}

          {/* Description */}
          {place.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {place.description}
            </p>
          )}

          {/* Quality reasons (for debugging - only show in development) */}
          {process.env.NODE_ENV === 'development' && qualityScore && qualityScore.reasons.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">
                Quality Details
              </summary>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground ml-4">
                {qualityScore.reasons.slice(0, 3).map((reason, i) => (
                  <li key={i} className="list-disc">
                    {reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function EnhancedPlaceList({ 
  items, 
  onCardClick, 
  selectedPlaceId, 
  showQualityScores = false 
}: EnhancedPlaceListProps) {
  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div className="space-y-3">
          <div className="text-4xl">🗺️</div>
          <div className="text-sm text-muted-foreground">
            No places found in this area
          </div>
          <div className="text-xs text-muted-foreground">
            Try adjusting your filters or location
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-2">
        {items.map((place) => (
          <PlaceCard
            key={place.place_id}
            place={place}
            isSelected={selectedPlaceId === place.place_id}
            onClick={() => onCardClick(place.place_id)}
            showQualityScore={showQualityScores}
          />
        ))}
      </div>
    </ScrollArea>
  );
}