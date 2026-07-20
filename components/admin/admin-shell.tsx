'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, Bell, Search, LogOut, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/theme-toggle';
import { SidebarBrand, SidebarNav } from '@/components/admin/sidebar-nav';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/components/auth/auth-provider';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const { profile, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/sign-in');
  };

  const initials = (profile?.full_name || profile?.email || 'U')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border/60 bg-card/50 backdrop-blur-sm lg:flex lg:flex-col">
        <SidebarBrand />
        <div className="flex-1 overflow-y-auto">
          <SidebarNav />
        </div>
        <div className="border-t border-border/60 p-4">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-semibold">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{profile?.full_name || 'User'}</div>
              <div className="truncate text-xs capitalize text-muted-foreground">{profile?.role}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SidebarBrand />
              <SidebarNav onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="relative hidden flex-1 sm:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search appointments, patients, doctors..."
              className="h-9 max-w-md border-border/60 bg-muted/40 pl-9"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="relative">
              <Link href="/admin">
                <Bell className="h-5 w-5" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
              </Link>
            </Button>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    {initials}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{profile?.full_name || 'User'}</span>
                    <span className="truncate text-xs font-normal text-muted-foreground">{profile?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span className="capitalize">{profile?.role} role</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
