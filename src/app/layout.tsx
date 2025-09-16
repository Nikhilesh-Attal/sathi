import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { SavedPlacesProvider } from '@/context/saved-places-context';
import { LiveLocationProvider } from '@/context/live-location-context';
import { ErrorBoundary } from '@/components/app/error-boundary';
import { ErrorHandlerProvider } from '@/components/app/error-handler-provider';
export const metadata: Metadata = {
  title: 'SATHI: Your AI Travel Ally',
  description: 'Your AI-powered companion for travel planning, discovery, and budgeting.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossOrigin=""/>

      </head>
      <body className="font-body antialiased">
        <ErrorBoundary>
          <ErrorHandlerProvider>
            <LiveLocationProvider>
              <SavedPlacesProvider>
                {children}
              </SavedPlacesProvider>
            </LiveLocationProvider>
          </ErrorHandlerProvider>
        </ErrorBoundary>
        <Toaster />
      </body>
    </html>
  );
}
