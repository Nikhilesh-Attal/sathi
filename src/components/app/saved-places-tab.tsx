
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bookmark, ClipboardCheck } from 'lucide-react';

export function SavedItemsTab() {
  // Since there is no database, the saved items functionality is removed.
  // This component now displays a placeholder message.
  return (
    <Card className="border-0 shadow-none">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Bookmark />
                Saved Items & Plans
            </CardTitle>
            <CardDescription>This feature is unavailable as the database has been removed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
             <div className="flex flex-col items-center justify-center min-h-[200px] text-center p-6 border-2 border-dashed rounded-lg">
                <ClipboardCheck className="h-16 w-16 text-muted mb-4" />
                <h3 className="text-xl font-semibold">Saving Disabled</h3>
                <p className="text-muted-foreground max-w-md mt-2">
                    To enable saving places and trip plans, a database connection is required. The app is currently running in a stateless mode.
                </p>
            </div>
        </CardContent>
    </Card>
  );
}
