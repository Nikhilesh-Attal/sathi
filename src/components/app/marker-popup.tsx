
'use client';

import * as React from 'react';
import Image from 'next/image';
import type { Place } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Star, MapPin } from 'lucide-react';
import { Popup } from 'react-leaflet';

interface MarkerPopupProps {
  item: Place;
}

export function MarkerPopup({ item }: MarkerPopupProps) {
  const gMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name)}&query_place_id=${item.place_id}`;
  
  return (
    <Popup maxWidth={250} autoPan={false}>
      <div className="text-sm space-y-1 w-48 font-body">
        {item.photoUrl && (
          <div className="relative h-24 -m-1 mb-2 rounded-t-md overflow-hidden">
            <Image
              src={item.photoUrl}
              alt={item.name}
              fill
              loading="lazy"
              className="object-cover"
            />
          </div>
        )}
        <h3 className="font-bold text-base">{item.name}</h3>
        <p className="text-muted-foreground text-xs">{item.vicinity}</p>
        <div className="flex justify-between items-center pt-1">
          {item.rating && (
            <div className="flex items-center gap-1 text-primary">
              <Star className="w-4 h-4 fill-current" />
              <span className="font-bold text-xs">{item.rating}</span>
            </div>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-auto p-1 text-xs"
            asChild
          >
            <a href={gMapsUrl} target="_blank" rel="noopener noreferrer">
              <MapPin className="h-3 w-3 mr-1" />
              View Map
            </a>
          </Button>
        </div>
      </div>
    </Popup>
  );
}
