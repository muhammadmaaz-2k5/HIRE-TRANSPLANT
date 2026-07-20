'use client';

import * as React from 'react';
import { Construction } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function AdminPlaceholder({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">Module under construction</p>
      </div>
      <Card className="border-border/60">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Construction className="h-6 w-6" />
          </div>
          <div>
            <p className="font-medium">{title} is part of the roadmap</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The dashboard overview is live with real data. This module ships in a later phase.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
