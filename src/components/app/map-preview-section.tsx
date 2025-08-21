
'use client';

import * as React from 'react';
import { motion } from "framer-motion";
import { Building, MapPin, Utensils, User } from "lucide-react";
import dynamic from 'next/dynamic';
import { renderToStaticMarkup } from 'react-dom/server';
import { divIcon } from 'leaflet';
import type { Place } from '@/lib/types';

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(mod => mod.Tooltip), { ssr: false });

const staticItems: (Place & {itemType: 'place' | 'hotel' | 'restaurant' | 'user'})[] = [
    // Center point (user location)
    { place_id: 'user', itemType: 'user' as const, name: 'Udaipur, India', point: { lat: 24.5854, lon: 73.7125 } },
    // Fictional Places, Hotels, Restaurants, Markets, Temples, Monuments in Udaipur area
    { place_id: 'p1', itemType: 'place' as const, name: 'City Palace', point: { lat: 24.5760, lon: 73.6835 } },
    { place_id: 'p2', itemType: 'place' as const, name: 'Jagmandir', point: { lat: 24.5713, lon: 73.6792 } },
    { place_id: 'p3', itemType: 'place' as const, name: 'Saheliyon-ki-Bari', point: { lat: 24.6094, lon: 73.6896 } },
    { place_id: 'p4', itemType: 'place' as const, name: 'Sajjangarh Monsoon Palace', point: { lat: 24.5954, lon: 73.6521 } },
    { place_id: 'p5', itemType: 'place' as const, name: 'Bagore Ki Haveli', point: { lat: 24.5808, lon: 73.6829 } },
    { place_id: 'h1', itemType: 'hotel' as const, name: 'The Oberoi Udaivilas', point: { lat: 24.5779, lon: 73.6749 } },
    { place_id: 'h2', itemType: 'hotel' as const, name: 'Taj Lake Palace', point: { lat: 24.5755, lon: 73.6800 } },
    { place_id: 'r1', itemType: 'restaurant' as const, name: 'Ambrai Restaurant', point: { lat: 24.5794, lon: 73.6822 } },
    { place_id: 'r2', itemType: 'restaurant' as const, name: 'Upre', point: { lat: 24.5800, lon: 73.6830 } },
];

const createIcon = (icon: React.ReactElement, color: string, isUser = false) => {
  const iconMarkup = renderToStaticMarkup(
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '28px',
      height: '28px',
      color: isUser ? 'hsl(var(--primary-foreground))' : color,
      backgroundColor: isUser ? 'hsl(var(--primary))' : 'white',
      borderRadius: '50%',
      boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
    }}>
      {React.cloneElement(icon, { strokeWidth: 2, size: 16 })}
    </div>
  );
 return divIcon({ html: iconMarkup, className: 'bg-none border-none', iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -28] });
};

const icons = {
  user: createIcon(<User />, 'hsl(var(--primary-foreground))', true),
  hotel: createIcon(<Building />, '#3b82f6'),
  restaurant: createIcon(<Utensils />, '#16a34a'),
  place: createIcon(<MapPin />, '#ef4444'),
};

const getIconForType = (type: Place['itemType'] | 'user') => {
  return icons[type as keyof typeof icons] || icons.place;
};

function MapPreview({ livePlaces, liveLocation }: { livePlaces: Place[], liveLocation: { latitude: number, longitude: number } | null }) {
  const [displayItems, setDisplayItems] = React.useState<(Place & {itemType: 'place' | 'hotel' | 'restaurant' | 'user'})[]>(staticItems);
  const [center, setCenter] = React.useState<[number, number]>([24.5854, 73.7125]);
  const [zoom, setZoom] = React.useState(13);
  const mapRef = React.useRef<L.Map | null>(null);

  React.useEffect(() => {
    if (livePlaces.length > 0 && liveLocation) {
        const liveUserMarker = { place_id: 'live_user', itemType: 'user' as const, name: 'You are here', point: { lat: liveLocation.latitude, lon: liveLocation.longitude } };
        // Take a sample of live places to avoid cluttering the preview map
        const sampledLivePlaces = livePlaces.slice(0, 9);
        setDisplayItems([...sampledLivePlaces, liveUserMarker]);
        
        const newCenter: [number, number] = [liveLocation.latitude, liveLocation.longitude];
        setCenter(newCenter);
        setZoom(14);
        
        if (mapRef.current) {
          mapRef.current.flyTo(newCenter, 14, { animate: true, duration: 1.5 });
        }
    }
  }, [livePlaces, liveLocation]);


  return (
    <motion.div
      className="w-full h-[400px] md:h-[500px] rounded-lg shadow-xl border overflow-hidden"
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
    >
      <MapContainer 
        center={center} 
        zoom={zoom} 
        className="w-full h-full"
        scrollWheelZoom={false}
        zoomControl={false}
        whenCreated={(map) => { mapRef.current = map; }}
       >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {displayItems.map((item) => {
          if (!item.point) return null;
          const position: [number, number] = [item.point.lat, item.point.lon];
          return (
            <Marker key={item.place_id} position={position} icon={getIconForType(item.itemType)}>
              <Tooltip permanent={item.itemType === 'user'} direction="top" offset={[0, -28]} className={`leaflet-tooltip-preview ${item.itemType === 'user' ? 'font-bold text-primary' : ''}`}>
                 {item.name}
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>
      <style jsx global>{`
        .leaflet-tooltip-preview {
          background-color: transparent;
          border: none;
          box-shadow: none;
          color: hsl(var(--foreground));
          font-weight: 500;
          text-shadow: 0 0 3px hsl(var(--background)), 0 0 3px hsl(var(--background)), 0 0 3px hsl(var(--background));
        }
      `}</style>
    </motion.div>
  );
}

export function MapPreviewSection({ livePlaces, liveLocation }: { livePlaces: Place[], liveLocation: { latitude: number, longitude: number } | null }) {
    return (
        <section id="map-preview" className="w-full py-12 md:py-24 lg:py-32">
            <div className="container px-4 md:px-6">
                <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Discover What's Around You</h2>
                    <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed">
                        A live preview of attractions, hotels, and restaurants near your location.
                    </p>
                </div>
                <MapPreview livePlaces={livePlaces} liveLocation={liveLocation} />
            </div>
        </section>
    );
}
