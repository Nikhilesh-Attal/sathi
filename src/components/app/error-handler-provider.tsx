'use client';

import * as React from 'react';
import { useErrorHandler } from './error-boundary';

interface ErrorHandlerProviderProps {
  children: React.ReactNode;
}

export function ErrorHandlerProvider({ children }: ErrorHandlerProviderProps) {
  // Initialize global error handling
  useErrorHandler();
  
  return <>{children}</>;
}