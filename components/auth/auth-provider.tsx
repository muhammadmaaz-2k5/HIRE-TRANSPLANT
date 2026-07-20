'use client';

import * as React from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type UserRole = 'patient' | 'doctor' | 'coordinator' | 'admin';

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchProfile = React.useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', uid)
      .maybeSingle();
    if (error) {
      console.error('profile fetch error', error.message);
      return null;
    }
    return data as Profile | null;
  }, []);

  React.useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        const p = await fetchProfile(data.session.user.id);
        if (mounted) setProfile(p);
      }
      if (mounted) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      (async () => {
        setSession(newSession);
        if (newSession?.user) {
          const p = await fetchProfile(newSession.user.id);
          setProfile(p);
        } else {
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = React.useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = React.useCallback(
    async (email: string, password: string, fullName: string, role: UserRole) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role } },
      });
      if (error) return { error: error.message };
      // If signup returns a session (email confirmation off), fetch profile.
      if (data.session?.user) {
        const p = await fetchProfile(data.session.user.id);
        setProfile(p);
        setSession(data.session);
      }
      return { error: null };
    },
    [fetchProfile]
  );

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
