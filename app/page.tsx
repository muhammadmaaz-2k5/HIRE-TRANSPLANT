'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Calendar,
  CalendarCheck,
  ClipboardCheck,
  Clock,
  FileText,
  LineChart,
  Mic,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
  Video,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';

const features = [
  {
    icon: Mic,
    title: 'Voice AI Booking',
    desc: 'Patients say "Book me with Dr. Sarah next Tuesday" and the AI checks availability and confirms.',
  },
  {
    icon: CalendarCheck,
    title: 'Smart Scheduling',
    desc: 'Conflict-free slots, buffer times, holiday management, and automated waitlist promotion.',
  },
  {
    icon: Video,
    title: 'Live Video Consultation',
    desc: 'Secure WebRTC rooms with waiting room, screen sharing, mute, and camera controls.',
  },
  {
    icon: FileText,
    title: 'Document Management',
    desc: 'Secure patient uploads — ID, referrals, labs, imaging — with verification workflow.',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reporting',
    desc: 'No-show rates, doctor utilization, patient growth, and appointment trends.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Access',
    desc: 'Patient, Doctor, Coordinator, and Admin roles with protected routes and audit logs.',
  },
];

const phases = [
  { icon: Users, label: 'Auth & Roles', phase: 'Phase 2', done: true },
  { icon: Calendar, label: 'Appointments', phase: 'Phase 7', done: true },
  { icon: Mic, label: 'AI Assistant', phase: 'Phase 8', done: true },
  { icon: Video, label: 'Video Calls', phase: 'Phase 10', done: true },
  { icon: FileText, label: 'Documents', phase: 'Phase 13', done: true },
  { icon: BarChart3, label: 'Analytics', phase: 'Phase 15', done: true },
];

const stats = [
  { value: '40%', label: 'Lower no-show rate' },
  { value: '3.2x', label: 'Faster scheduling' },
  { value: '24/7', label: 'AI availability' },
  { value: '99.9%', label: 'Uptime SLA' },
];

const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#architecture', label: 'Architecture' },
  { href: '#roadmap', label: 'Roadmap' },
  { href: '/admin', label: 'Dashboard' },
];

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              HIRE TRANSPLANT
            </span>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm">
              <Link href="/sign-in">
                Launch Dashboard
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)] opacity-60" />
        <div className="absolute left-1/2 top-0 -z-10 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="mb-6 animate-fade-up border-primary/30 bg-primary/5 px-4 py-1.5 text-primary">
              <Zap className="mr-1.5 h-3.5 w-3.5" />
              AI-Powered Appointment Management
            </Badge>
            <h1 className="animate-fade-up animation-delay-100 text-balance text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              The operating system for{' '}
              <span className="bg-gradient-to-r from-primary to-chart-4 bg-clip-text text-transparent">
                transplant centers
              </span>
            </h1>
            <p className="animate-fade-up animation-delay-200 mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
              Voice booking, intelligent scheduling, secure video consultations, document management, and real-time analytics — all in one enterprise platform built for healthcare teams.
            </p>
            <div className="animate-fade-up animation-delay-300 mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 px-8">
                <Link href="/sign-in">
                  Explore the Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-8">
                <Link href="#features">
                  See Features
                </Link>
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="animate-fade-in animation-delay-500 mt-20 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
            {stats.map((s) => (
              <Card key={s.label} className="border-border/60 bg-card/60 p-6 text-center backdrop-blur-sm">
                <div className="text-3xl font-bold tracking-tight text-primary">{s.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything a modern clinic needs</h2>
          <p className="mt-4 text-muted-foreground">
            From AI-powered voice booking to secure video consultations, document management, and analytics — each capability is designed for the realities of transplant care.
          </p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card
              key={f.title}
              className="group relative overflow-hidden border-border/60 p-6 transition-all hover:border-primary/40 hover:shadow-lg"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Architecture */}
      <section id="architecture" className="relative border-y border-border/60 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Built on a modern stack</h2>
            <p className="mt-4 text-muted-foreground">
              Next.js, Supabase, PostgreSQL, OpenAI tool-calling, and WebRTC — orchestrated for scale, security, and low-latency AI.
            </p>
          </div>

          <div className="mt-16 grid gap-4 lg:grid-cols-3">
            <Card className="border-border/60 p-6">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-chart-1/15 text-chart-1">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">Portals</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Patient Portal</li>
                <li>Doctor Portal</li>
                <li>Admin Portal</li>
              </ul>
            </Card>
            <Card className="border-border/60 p-6">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-chart-2/15 text-chart-2">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">Services</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Appointment API</li>
                <li>AI Assistant (tool calling)</li>
                <li>Notification Service</li>
              </ul>
            </Card>
            <Card className="border-border/60 p-6">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-chart-4/15 text-chart-4">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">Infrastructure</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>PostgreSQL + Supabase</li>
                <li>Supabase Storage</li>
                <li>WebRTC Video</li>
              </ul>
            </Card>
          </div>

          {/* Phase roadmap */}
          <div id="roadmap" className="mt-12">
            <div className="mb-6 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" />
              Delivery roadmap
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {phases.map((p) => (
                <div key={p.label} className="relative flex items-center gap-3 rounded-lg border border-border/60 bg-card p-4">
                  {p.done && (
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-chart-2" title="Delivered" />
                  )}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <p.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">{p.phase}</div>
                    <div className="text-sm font-semibold">{p.label}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-chart-2" />
                Green dot = delivered and live in the dashboard
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-10 text-center sm:p-16">
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
          <ClipboardCheck className="mx-auto mb-6 h-12 w-12 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">See it in action</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Explore the admin dashboard with live appointment data, AI assistant, video rooms, documents, and analytics.
          </p>
          <Button asChild size="lg" className="mt-8 h-12 px-8">
            <Link href="/sign-in">
              Open Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-10 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Activity className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold">HIRE TRANSPLANT</span>
          </div>
          <p className="text-sm text-muted-foreground">
            AI-Powered Appointment Management System
          </p>
        </div>
      </footer>
    </div>
  );
}
