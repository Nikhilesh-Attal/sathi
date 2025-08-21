'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DeprecatedAppPage() {
  return (
    <div className="flex h-screen items-center justify-center bg-muted p-4">
      <Card className="text-center">
        <CardHeader>
          <CardTitle>Page Not In Use</CardTitle>
          <CardDescription>
            This page is deprecated and no longer part of the main application flow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Please use the main dashboard to access all features.</p>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
