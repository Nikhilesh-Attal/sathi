
'use client';

import * as React from 'react';
import Image from 'next/image';
import type { Place } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';

interface PlaceCardProps {
  item: Place;
  isSelected: boolean;
  onClick: () => void;
}

const typeToBadge = (item: Place): string => {
  if (item.itemType === 'hotel') return 'Hotel';
  if (item.itemType === 'restaurant') return 'Restaurant';
  
  const types = item.types || [];
  const typeHierarchy = ['park', 'museum', 'art_gallery', 'hindu_temple', 'church', 'mosque', 'zoo', 'point_of_interest', 'tourist_attraction', 'landmark', 'garden', 'historical', 'monument', 'market'];
  const topType = typeHierarchy.find(t => types.includes(t)) || types[0] || 'attraction';
  
  return topType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export function PlaceCard({ item, isSelected, onClick }: PlaceCardProps) {
  
  return (
    <div
      id={`place-card-${item.place_id}`}
      onClick={onClick}
      className={cn(
        'flex gap-3 p-2 rounded-lg cursor-pointer transition-colors border-2',
        isSelected ? 'bg-muted border-primary' : 'bg-card border-transparent hover:bg-muted/50'
      )}
    >
      <div className="relative w-24 h-24 rounded-md overflow-hidden shrink-0">
        <Image
          src={item.photoUrl || 'https://placehold.co/400x400.png'}
          alt={item.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          loading="lazy"
          className="object-cover"
          data-ai-hint={item.photoHint || 'travel place'}
        />
      </div>
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-semibold text-sm line-clamp-2">{item.name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-1">{item.vicinity}</p>
          <Badge variant="outline" className="mt-1 text-xs">{typeToBadge(item)}</Badge>
        </div>
        <div className="flex justify-between items-center mt-1">
          {item.rating && (
            <div className="flex items-center gap-1 text-primary text-xs">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span className="font-bold">{item.rating}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
