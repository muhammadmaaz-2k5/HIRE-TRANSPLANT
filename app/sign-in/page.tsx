'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Activity, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SignInPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    router.push('/admin');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="absolute left-1/2 top-0 -z-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
      <div className="absolute inset-0 -z-10 bg-grid [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)] opacity-50" />

      <Card className="w-full max-w-md border-border/60 shadow-xl">
        <CardHeader className="space-y-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">HIRE TRANSPLANT</span>
          </Link>
          <div>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription className="mt-1.5">
              Sign in to access the admin console.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@hire.health"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Sign in
            </Button>
          </form>

          <div className="mt-6 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Demo credentials</p>
            <p className="mt-1">Email: admin@hire.health</p>
            <p>Password: admin12345</p>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/sign-up" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
