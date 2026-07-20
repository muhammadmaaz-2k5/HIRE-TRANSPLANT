'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Activity, ArrowRight, Loader2, User, Users, Stethoscope, Shield } from 'lucide-react';
import { useAuth, type UserRole } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const roles: { value: UserRole; label: string; icon: typeof User }[] = [
  { value: 'patient', label: 'Patient', icon: User },
  { value: 'doctor', label: 'Doctor', icon: Stethoscope },
  { value: 'coordinator', label: 'Coordinator', icon: Users },
  { value: 'admin', label: 'Admin', icon: Shield },
];

export default function SignUpPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [role, setRole] = React.useState<UserRole>('patient');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    const { error } = await signUp(email, password, fullName, role);
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    router.push('/admin');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
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
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription className="mt-1.5">
              Join the transplant appointment platform.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
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
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <div className="grid grid-cols-2 gap-2">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={cn(
                      'flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors',
                      role === r.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <r.icon className="h-4 w-4" />
                    {r.label}
                  </button>
                ))}
              </div>
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
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/sign-in" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
