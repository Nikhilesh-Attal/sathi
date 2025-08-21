// src/components/app/map-click-handler.tsx
'use client';

import { useMapEvents } from "react-leaflet";

interface MapClickHandlerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  setIsLoading: (isLoading: boolean) => void;
}

export function MapClickHandler({ onLocationSelect, setIsLoading }: MapClickHandlerProps) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      setIsLoading(true);
      onLocationSelect(lat, lng);
    },
  });
  return null;
}
