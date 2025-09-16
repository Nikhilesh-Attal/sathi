'use client';

import * as React from 'react';
import { LoadingSpinner } from './loading-spinner';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingWithProgressProps {
  isLoading: boolean;
  progress: string;
  showRetry?: boolean;
  onRetry?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const progressMessages = [
  "Searching nearby attractions...",
  "Finding the best restaurants...", 
  "Discovering local hotels...",
  "Almost there! Finalizing results...",
];

export function LoadingWithProgress({ 
  isLoading, 
  progress, 
  showRetry = false, 
  onRetry, 
  size = 'md',
  className = ''
}: LoadingWithProgressProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = React.useState(0);
  const [elapsedTime, setElapsedTime] = React.useState(0);

  React.useEffect(() => {
    if (!isLoading) {
      setCurrentMessageIndex(0);
      setElapsedTime(0);
      return;
    }

    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    const messageTimer = setInterval(() => {
      setCurrentMessageIndex(prev => (prev + 1) % progressMessages.length);
    }, 3000);

    return () => {
      clearInterval(timer);
      clearInterval(messageTimer);
    };
  }, [isLoading]);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base', 
    lg: 'text-lg'
  };

  const spinnerSizes = {
    sm: 24,
    md: 32,
    lg: 48
  };

  if (!isLoading) return null;

  const showSlowLoadingMessage = elapsedTime > 10; // Show after 10 seconds

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 p-6 ${className}`}>
      <LoadingSpinner size={spinnerSizes[size]} />
      
      <div className="text-center space-y-2">
        <AnimatePresence mode="wait">
          <motion.p 
            key={progress + currentMessageIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className={`${sizeClasses[size]} font-medium text-foreground`}
          >
            {progress || progressMessages[currentMessageIndex]}
          </motion.p>
        </AnimatePresence>
        
        {elapsedTime > 5 && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-muted-foreground"
          >
            {elapsedTime < 15 ? 'This might take a moment...' : 'Taking longer than usual...'}
          </motion.p>
        )}
        
        {showSlowLoadingMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-muted p-4 rounded-lg border space-y-2"
          >
            <p className="text-sm text-muted-foreground">
              We're working hard to find the best places for you. This search involves multiple data sources for comprehensive results.
            </p>
            {showRetry && onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
          </motion.div>
        )}
      </div>
      
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-primary rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Skeleton loader for place cards
export function PlaceCardSkeleton() {
  return (
    <div className="flex gap-3 p-2 rounded-lg border-2 border-transparent bg-card animate-pulse">
      <div className="w-24 h-24 rounded-md bg-muted shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-6 bg-muted rounded w-16" />
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1">
            <div className="w-3.5 h-3.5 bg-muted rounded" />
            <div className="h-3 bg-muted rounded w-8" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading state for map preview
export function MapPreviewSkeleton() {
  return (
    <div className="w-full h-[400px] md:h-[500px] rounded-lg bg-muted animate-pulse flex items-center justify-center">
      <div className="text-center space-y-2">
        <LoadingSpinner size={48} />
        <p className="text-muted-foreground text-sm">Loading map and places...</p>
      </div>
    </div>
  );
}