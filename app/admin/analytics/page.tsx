'use client';

import * as React from 'react';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Clock,
  Stethoscope,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase, type Appointment, type Doctor, type Patient } from '@/lib/supabase';

const pieColors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--destructive))'];

export default function AnalyticsPage() {
  const [loading, setLoading] = React.useState(true);
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [doctors, setDoctors] = React.useState<Doctor[]>([]);
  const [patients, setPatients] = React.useState<Patient[]>([]);

  React.useEffect(() => {
    (async () => {
      const [{ data: appts }, { data: docs }, { data: pats }] = await Promise.all([
        supabase.from('appointments').select('*').limit(500),
        supabase.from('doctors').select('*'),
        supabase.from('patients').select('*'),
      ]);
      setAppointments(appts ?? []);
      setDoctors(docs ?? []);
      setPatients(pats ?? []);
      setLoading(false);
    })();
  }, []);

  const now = new Date();

  // Daily volume — last 30 days
  const dailyData = React.useMemo(() => {
    const days: { date: string; appointments: number; completed: number; cancelled: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const ds = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
      const de = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString();
      const dayAppts = appointments.filter((a) => a.start_time >= ds && a.start_time < de);
      days.push({
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        appointments: dayAppts.length,
        completed: dayAppts.filter((a) => a.status === 'completed').length,
        cancelled: dayAppts.filter((a) => a.status === 'cancelled').length,
      });
    }
    return days;
  }, [appointments, now]);

  // Status distribution
  const statusData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    appointments.forEach((a) => { counts[a.status] = (counts[a.status] ?? 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [appointments]);

  // Doctor utilization
  const doctorUtil = React.useMemo(() => {
    return doctors
      .map((d) => {
        const docAppts = appointments.filter((a) => a.doctor_id === d.id);
        const completed = docAppts.filter((a) => a.status === 'completed').length;
        return {
          name: d.name.replace('Dr. ', '').split(' ')[0],
          specialty: d.specialty ?? '',
          total: docAppts.length,
          completed,
          utilization: docAppts.length ? Math.round((completed / docAppts.length) * 100) : 0,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [appointments, doctors]);

  // Patient growth (cumulative by created_at) — last 30 days
  const growthData = React.useMemo(() => {
    const sorted = [...patients].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const days: { date: string; total: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const ds = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString();
      const count = sorted.filter((p) => p.created_at < ds).length;
      days.push({
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        total: count,
      });
    }
    return days;
  }, [patients, now]);

  // Summary stats
  const totalAppts = appointments.length;
  const completedCount = appointments.filter((a) => a.status === 'completed').length;
  const cancelledCount = appointments.filter((a) => a.status === 'cancelled').length;
  const noShowRate = totalAppts ? Math.round((cancelledCount / totalAppts) * 100) : 0;
  const completionRate = totalAppts ? Math.round((completedCount / totalAppts) * 100) : 0;
  const activeDoctors = doctors.filter((d) => d.status === 'active').length;

  // Avg appointments per doctor
  const avgPerDoctor = activeDoctors ? (totalAppts / activeDoctors).toFixed(1) : '0';

  // Specialty distribution
  const specialtyData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    doctors.forEach((d) => {
      const s = d.specialty ?? 'Unknown';
      counts[s] = (counts[s] ?? 0) + appointments.filter((a) => a.doctor_id === d.id).length;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [appointments, doctors]);

  const stats = [
    { label: 'Total Appointments', value: String(totalAppts), icon: Calendar, color: 'text-chart-1', bg: 'bg-chart-1/10' },
    { label: 'Completion Rate', value: `${completionRate}%`, icon: CheckCircle2, color: 'text-chart-2', bg: 'bg-chart-2/10' },
    { label: 'No-show / Cancellation', value: `${noShowRate}%`, icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
    { label: 'Avg per Doctor', value: avgPerDoctor, icon: Stethoscope, color: 'text-chart-4', bg: 'bg-chart-4/10' },
    { label: 'Active Doctors', value: String(activeDoctors), icon: Activity, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Registered Patients', value: String(patients.length), icon: Users, color: 'text-chart-3', bg: 'bg-chart-3/10' },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Activity className="h-6 w-6 text-primary" />
          Analytics & Reporting
        </h1>
        <p className="text-sm text-muted-foreground">
          Insights across appointments, doctor utilization, patient growth, and clinic performance.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <Card key={s.label} className="border-border/60">
            <CardContent className="p-5">
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${s.bg} ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold tracking-tight">{s.value}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daily volume chart */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-lg">Appointments — last 30 days</CardTitle>
          <CardDescription>Daily volume with completed and cancelled breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="xGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} interval={4} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                <Area type="monotone" dataKey="appointments" stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#aGrad)" name="Total" />
                <Area type="monotone" dataKey="completed" stroke="hsl(var(--chart-2))" strokeWidth={2} fill="url(#cGrad)" name="Completed" />
                <Area type="monotone" dataKey="cancelled" stroke="hsl(var(--destructive))" strokeWidth={1.5} fill="url(#xGrad)" name="Cancelled" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Two-column row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Status pie */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Appointment status</CardTitle>
            <CardDescription>Distribution across all bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3}>
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]} stroke="hsl(var(--card))" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Patient growth */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Patient growth</CardTitle>
            <CardDescription>Cumulative registered patients — last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} interval={4} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="total" stroke="hsl(var(--chart-4))" strokeWidth={2.5} dot={false} name="Patients" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Doctor utilization + specialty */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Doctor workload</CardTitle>
            <CardDescription>Total appointments and completion rate per doctor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={doctorUtil} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                  <Bar dataKey="total" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Total" barSize={28} />
                  <Bar dataKey="completed" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Completed" barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">By specialty</CardTitle>
            <CardDescription>Appointments per specialty</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={specialtyData} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={80} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
                  <Bar dataKey="value" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} barSize={20} name="Appointments" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Doctor utilization table */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-lg">Doctor utilization breakdown</CardTitle>
          <CardDescription>Per-doctor performance metrics</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Doctor</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Specialty</th>
                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">Total</th>
                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">Completed</th>
                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">Utilization</th>
                </tr>
              </thead>
              <tbody>
                {doctorUtil.map((d) => (
                  <tr key={d.name} className="border-b border-border/40 last:border-0">
                    <td className="px-6 py-3 font-medium">{d.name}</td>
                    <td className="px-6 py-3 text-muted-foreground">{d.specialty}</td>
                    <td className="px-6 py-3 text-right">{d.total}</td>
                    <td className="px-6 py-3 text-right">{d.completed}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${d.utilization}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs font-medium">{d.utilization}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
