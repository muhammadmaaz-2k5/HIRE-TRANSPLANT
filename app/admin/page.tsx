'use client';

import * as React from 'react';
import {
  Activity,
  ArrowUpRight,
  CalendarCheck,
  CalendarClock,
  Clock,
  Stethoscope,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase, type AppointmentWithRelations, type Doctor, type Patient } from '@/lib/supabase';

type Stat = {
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down' | 'neutral';
  icon: typeof Users;
};

const statusColors: Record<string, string> = {
  confirmed: 'bg-chart-1/15 text-chart-1',
  pending: 'bg-chart-3/15 text-chart-3',
  completed: 'bg-chart-2/15 text-chart-2',
  cancelled: 'bg-destructive/15 text-destructive',
};

const pieColors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--destructive))'];

export default function AdminDashboardPage() {
  const [loading, setLoading] = React.useState(true);
  const [appointments, setAppointments] = React.useState<AppointmentWithRelations[]>([]);
  const [doctors, setDoctors] = React.useState<Doctor[]>([]);
  const [patients, setPatients] = React.useState<Patient[]>([]);

  React.useEffect(() => {
    (async () => {
      const [{ data: appts }, { data: docs }, { data: pats }] = await Promise.all([
        supabase
          .from('appointments')
          .select('*, doctors(name, specialty), patients(name, email), clinics(name)')
          .order('start_time', { ascending: true })
          .limit(200),
        supabase.from('doctors').select('*').order('name'),
        supabase.from('patients').select('*').order('name'),
      ]);
      setAppointments(appts ?? []);
      setDoctors(docs ?? []);
      setPatients(pats ?? []);
      setLoading(false);
    })();
  }, []);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const tomorrowStart = new Date(now.getTime() + 86400000).toISOString();

  const todays = appointments.filter(
    (a) => a.start_time >= todayStart && a.start_time < tomorrowStart
  );
  const upcoming = appointments.filter((a) => a.start_time >= now.toISOString() && a.status !== 'cancelled').slice(0, 6);
  const completed = appointments.filter((a) => a.status === 'completed').length;
  const cancelled = appointments.filter((a) => a.status === 'cancelled').length;
  const confirmed = appointments.filter((a) => a.status === 'confirmed').length;
  const pending = appointments.filter((a) => a.status === 'pending').length;
  const noShowRate = appointments.length ? Math.round((cancelled / appointments.length) * 100) : 0;

  // Build last-7-day chart data
  const dailyData = React.useMemo(() => {
    const days: { day: string; appointments: number; completed: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const ds = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
      const de = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString();
      const dayAppts = appointments.filter((a) => a.start_time >= ds && a.start_time < de);
      days.push({
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        appointments: dayAppts.length,
        completed: dayAppts.filter((a) => a.status === 'completed').length,
      });
    }
    return days;
  }, [appointments, now]);

  const statusData = [
    { name: 'Confirmed', value: confirmed },
    { name: 'Pending', value: pending },
    { name: 'Completed', value: completed },
    { name: 'Cancelled', value: cancelled },
  ];

  const stats: Stat[] = [
    { label: "Today's Appointments", value: String(todays.length), delta: '+12%', trend: 'up', icon: CalendarClock },
    { label: 'Active Doctors', value: String(doctors.filter((d) => d.status === 'active').length), delta: 'Steady', trend: 'neutral', icon: Stethoscope },
    { label: 'Registered Patients', value: String(patients.length), delta: '+8%', trend: 'up', icon: Users },
    { label: 'No-show Rate', value: `${noShowRate}%`, delta: '-3%', trend: 'down', icon: Activity },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Badge variant="outline" className="w-fit border-primary/30 bg-primary/5 text-primary">
          <CalendarCheck className="mr-1.5 h-3.5 w-3.5" />
          {todays.length} appointments today
        </Badge>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-border/60">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <span
                  className={
                    'text-xs font-medium ' +
                    (s.trend === 'up'
                      ? 'text-chart-2'
                      : s.trend === 'down'
                      ? 'text-chart-2'
                      : 'text-muted-foreground')
                  }
                >
                  {s.trend !== 'neutral' && <ArrowUpRight className="mr-0.5 inline h-3 w-3" />}
                  {s.delta}
                </span>
              </div>
              <div className="mt-4 text-3xl font-bold tracking-tight">{loading ? '—' : s.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Appointments this week</CardTitle>
            <CardDescription>Daily volume and completed consultations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="apptGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                    }}
                  />
                  <Area type="monotone" dataKey="appointments" stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#apptGrad)" />
                  <Area type="monotone" dataKey="completed" stroke="hsl(var(--chart-2))" strokeWidth={2} fill="url(#compGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Status breakdown</CardTitle>
            <CardDescription>All appointments by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3}>
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]} stroke="hsl(var(--card))" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {statusData.map((s, i) => (
                <div key={s.name} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pieColors[i] }} />
                  <span className="text-muted-foreground">{s.name}</span>
                  <span className="ml-auto font-medium">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming + Doctor utilization */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Upcoming appointments</CardTitle>
            <CardDescription>Next confirmed and pending sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/50" />
                ))}
              </div>
            ) : upcoming.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No upcoming appointments.</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((a) => {
                  const d = new Date(a.start_time);
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-4 rounded-lg border border-border/50 bg-card/40 p-3 transition-colors hover:bg-accent/40"
                    >
                      <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded-md bg-primary/10 py-1.5 text-primary">
                        <span className="text-xs font-medium uppercase">{d.toLocaleDateString('en-US', { month: 'short' })}</span>
                        <span className="text-lg font-bold leading-none">{d.getDate()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {a.patients?.name ?? 'Unknown patient'}
                          </span>
                          <span
                            className={
                              'rounded-full px-2 py-0.5 text-xs font-medium capitalize ' +
                              (statusColors[a.status] ?? 'bg-muted text-muted-foreground')
                            }
                          >
                            {a.status}
                          </span>
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {a.doctors?.name ?? 'Unassigned'} · {a.doctors?.specialty ?? ''} · {a.reason}
                        </div>
                      </div>
                      <div className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:flex">
                        <Clock className="h-3.5 w-3.5" />
                        {d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Doctor workload</CardTitle>
            <CardDescription>Appointments per doctor (7d)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={doctors
                    .map((d) => ({
                      name: d.name.replace('Dr. ', '').split(' ')[0],
                      appointments: appointments.filter(
                        (a) => a.doctor_id === d.id && Math.abs(new Date(a.start_time).getTime() - now.getTime()) < 7 * 86400000
                      ).length,
                    }))
                    .sort((a, b) => b.appointments - a.appointments)}
                  layout="vertical"
                  margin={{ top: 0, right: 12, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={70} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                    }}
                  />
                  <Bar dataKey="appointments" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
