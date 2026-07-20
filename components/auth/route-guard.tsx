'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !session) {
      router.replace('/sign-in');
    }
  }, [loading, session, router]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm">Authenticating…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
