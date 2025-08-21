
'use client';

import * as React from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import type { Place } from '@/lib/types';
import { Icon } from 'leaflet';
import { Building, MapPin, Utensils, User, History, Sprout, ShoppingCart, Landmark } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MarkerPopup } from './marker-popup';

interface LeafletMapProps {
  location: { latitude: number; longitude: number };
  items: Place[];
  selectedPlaceId: string | null;
  onMarkerClick: (placeId: string) => void;
  children?: React.ReactNode; // To allow passing MapClickHandler
}

// Sub-component to handle map view changes without re-initializing the map
function ChangeMapView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  React.useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

const createIcon = (icon: React.ReactElement, color: string) => {
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(
      renderToStaticMarkup(React.cloneElement(icon, { color }))
    )}`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
    className: 'bg-none drop-shadow-lg',
  });
};

const userIcon = createIcon(<User className="h-6 w-6" />, 'hsl(var(--primary))');
const icons = {
  hotel: createIcon(<Building className="h-6 w-6" />, '#3b82f6'), // blue
  restaurant: createIcon(<Utensils className="h-6 w-6" />, '#16a34a'), // green
  historical: createIcon(<History className="h-6 w-6" />, '#ca8a04'), // amber
  park: createIcon(<Sprout className="h-6 w-6" />, '#65a30d'), // lime
  parks: createIcon(<Sprout className="h-6 w-6" />, '#65a30d'), // lime
  garden: createIcon(<Sprout className="h-6 w-6" />, '#65a30d'), // lime
  market: createIcon(<ShoppingCart className="h-6 w-6" />, '#db2777'), // pink
  markets: createIcon(<ShoppingCart className="h-6 w-6" />, '#db2777'), // pink
  monument: createIcon(<Landmark className="h-6 w-6" />, '#7c3aed'), // violet
  monuments: createIcon(<Landmark className="h-6 w-6" />, '#7c3aed'), // violet
  tourist_spots: createIcon(<MapPin className="h-6 w-6" />, '#ef4444'), // red
  default: createIcon(<MapPin className="h-6 w-6" />, '#6b7280'), // gray
};

const getIcon = (item: Place) => {
    if (item.itemType === 'hotel') return icons.hotel;
    if (item.itemType === 'restaurant') return icons.restaurant;
    
    const mainType = item.types?.[0]?.replace(/\s+/g, '_');
    
    return icons[mainType as keyof typeof icons] || icons.default;
};


const getLatLng = (item: Place, fallbackLocation: { latitude: number, longitude: number }): [number, number] | null => {
  if (item.point && typeof item.point.lat === 'number' && typeof item.point.lon === 'number') {
    return [item.point.lat, item.point.lon];
  }
  // Fallback for items without coordinates - This should be rare with the new API
  console.warn(`Missing coordinates for place: ${item.name}. Skipping render.`);
  return null;
};

function PlaceMarker({ item, isSelected, onMarkerClick, fallbackLocation }: { item: Place; isSelected: boolean; onMarkerClick: (id: string) => void; fallbackLocation: { latitude: number; longitude: number } }) {
  const markerRef = React.useRef<L.Marker>(null);
  const position = getLatLng(item, fallbackLocation);

  React.useEffect(() => {
    if (isSelected && markerRef.current) {
      markerRef.current.openPopup();
    }
  }, [isSelected]);
  
  if (!position) return null; // Don't render marker if no valid coordinates

  return (
    <Marker
      key={item.place_id}
      position={position}
      icon={getIcon(item)}
      ref={markerRef}
      eventHandlers={{
        click: () => onMarkerClick(item.place_id),
      }}
    >
      <MarkerPopup item={item} />
    </Marker>
  );
}


export function LeafletMap({ location, items, selectedPlaceId, onMarkerClick, children }: LeafletMapProps) {
  const [map, setMap] = React.useState<L.Map | null>(null);

  React.useEffect(() => {
    return () => {
      if (map) {
        map.remove();
      }
    };
  }, [map]);

  const selectedPlace = React.useMemo(() => 
    items.find(item => item.place_id === selectedPlaceId),
  [items, selectedPlaceId]);

  const currentCenter: [number, number] = React.useMemo(() => {
    if (selectedPlace && selectedPlace.point) {
      return [selectedPlace.point.lat, selectedPlace.point.lon];
    }
    return [location.latitude, location.longitude];
  }, [location, selectedPlace]);

  return (
    <div className="h-full w-full rounded-lg border overflow-hidden">
      <MapContainer
        center={currentCenter}
        zoom={13}
        scrollWheelZoom={true} // Enabled for better usability
        className="h-full w-full"
        whenCreated={setMap}
      >
        <ChangeMapView center={currentCenter} zoom={selectedPlaceId ? 15 : 13} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {children}
        <Marker position={[location.latitude, location.longitude]} icon={userIcon} />

        {items.map((item) => (
          <PlaceMarker
            key={item.place_id}
            item={item}
            isSelected={item.place_id === selectedPlaceId}
            onMarkerClick={onMarkerClick}
            fallbackLocation={location}
          />
        ))}
      </MapContainer>
    </div>
  );
}
