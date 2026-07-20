'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Calendar,
  CalendarDays,
  FileText,
  LayoutDashboard,
  Sparkles,
  Stethoscope,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const nav: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Appointments', href: '/admin/appointments', icon: CalendarDays },
  { label: 'AI Assistant', href: '/admin/assistant', icon: Sparkles },
  { label: 'Video Calls', href: '/admin/video', icon: Video },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Doctors', href: '/admin/doctors', icon: Stethoscope },
  { label: 'Patients', href: '/admin/patients', icon: Users },
  { label: 'Clinics', href: '/admin/clinics', icon: Calendar },
  { label: 'Documents', href: '/admin/documents', icon: FileText },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {nav.map((item) => {
        const active =
          item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SidebarBrand() {
  return (
    <Link href="/admin" className="flex items-center gap-2 px-5 py-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Activity className="h-5 w-5" />
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-sm font-semibold tracking-tight">HIRE TRANSPLANT</span>
        <span className="text-xs text-muted-foreground">Admin Console</span>
      </div>
    </Link>
  );
}
