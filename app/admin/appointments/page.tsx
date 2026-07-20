'use client';

import * as React from 'react';
import { Plus, Search, Filter, CalendarDays, Clock, MoreHorizontal, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { supabase, type AppointmentWithRelations, type Doctor, type Patient, type Clinic } from '@/lib/supabase';

const statusOptions = ['pending', 'confirmed', 'completed', 'cancelled'] as const;
type Status = (typeof statusOptions)[number];

const statusStyles: Record<string, string> = {
  confirmed: 'bg-chart-1/15 text-chart-1',
  pending: 'bg-chart-3/15 text-chart-3',
  completed: 'bg-chart-2/15 text-chart-2',
  cancelled: 'bg-destructive/15 text-destructive',
};

function toLocalInput(d: Date) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export default function AppointmentsPage() {
  const [loading, setLoading] = React.useState(true);
  const [appointments, setAppointments] = React.useState<AppointmentWithRelations[]>([]);
  const [doctors, setDoctors] = React.useState<Doctor[]>([]);
  const [patients, setPatients] = React.useState<Patient[]>([]);
  const [clinics, setClinics] = React.useState<Clinic[]>([]);

  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editAppt, setEditAppt] = React.useState<AppointmentWithRelations | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [{ data: appts }, { data: docs }, { data: pats }, { data: cls }] = await Promise.all([
      supabase
        .from('appointments')
        .select('*, doctors(name, specialty), patients(name, email), clinics(name)')
        .order('start_time', { ascending: true })
        .limit(200),
      supabase.from('doctors').select('*').order('name'),
      supabase.from('patients').select('*').order('name'),
      supabase.from('clinics').select('*').order('name'),
    ]);
    setAppointments(appts ?? []);
    setDoctors(docs ?? []);
    setPatients(pats ?? []);
    setClinics(cls ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const filtered = React.useMemo(() => {
    return appointments.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${a.patients?.name ?? ''} ${a.doctors?.name ?? ''} ${a.reason ?? ''} ${a.clinics?.name ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [appointments, search, statusFilter]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete appointment');
      return;
    }
    toast.success('Appointment deleted');
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
          <p className="text-sm text-muted-foreground">
            Book, reschedule, and cancel consultations across all clinics.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New appointment
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-border/60">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search patient, doctor, reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-border/60 bg-muted/40 pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] border-border/60 bg-muted/40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-lg">All appointments</CardTitle>
          <CardDescription>{filtered.length} shown · sorted by start time</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="hidden md:table-cell">When</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                      No appointments match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((a) => {
                    const d = new Date(a.start_time);
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.patients?.name ?? '—'}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{a.doctors?.name ?? '—'}</span>
                            {a.doctors?.specialty && (
                              <span className="text-xs text-muted-foreground">{a.doctors.specialty}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{a.reason ?? '—'}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1.5 text-sm">
                              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                              {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ' +
                              (statusStyles[a.status] ?? 'bg-muted text-muted-foreground')
                            }
                          >
                            {a.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditAppt(a)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(a.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <AppointmentForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        doctors={doctors}
        patients={patients}
        clinics={clinics}
        onSaved={() => {
          setCreateOpen(false);
          load();
        }}
      />

      {/* Edit dialog */}
      <AppointmentForm
        open={!!editAppt}
        onOpenChange={(v) => !v && setEditAppt(null)}
        doctors={doctors}
        patients={patients}
        clinics={clinics}
        appointment={editAppt}
        onSaved={() => {
          setEditAppt(null);
          load();
        }}
      />
    </div>
  );
}

function AppointmentForm({
  open,
  onOpenChange,
  doctors,
  patients,
  clinics,
  appointment,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  doctors: Doctor[];
  patients: Patient[];
  clinics: Clinic[];
  appointment?: AppointmentWithRelations | null;
  onSaved: () => void;
}) {
  const isEdit = !!appointment;
  const [doctorId, setDoctorId] = React.useState(appointment?.doctor_id ?? '');
  const [patientId, setPatientId] = React.useState(appointment?.patient_id ?? '');
  const [clinicId, setClinicId] = React.useState(appointment?.clinic_id ?? '');
  const [startTime, setStartTime] = React.useState(
    appointment ? toLocalInput(new Date(appointment.start_time)) : ''
  );
  const [duration, setDuration] = React.useState('45');
  const [status, setStatus] = React.useState<Status>((appointment?.status as Status) ?? 'pending');
  const [reason, setReason] = React.useState(appointment?.reason ?? '');
  const [notes, setNotes] = React.useState(appointment?.notes ?? '');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setDoctorId(appointment?.doctor_id ?? '');
      setPatientId(appointment?.patient_id ?? '');
      setClinicId(appointment?.clinic_id ?? '');
      setStartTime(appointment ? toLocalInput(new Date(appointment.start_time)) : '');
      setDuration('45');
      setStatus((appointment?.status as Status) ?? 'pending');
      setReason(appointment?.reason ?? '');
      setNotes(appointment?.notes ?? '');
    }
  }, [open, appointment]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId || !patientId || !startTime) {
      toast.error('Doctor, patient, and start time are required');
      return;
    }
    setSaving(true);
    const start = new Date(startTime);
    const end = new Date(start.getTime() + parseInt(duration, 10) * 60000);

    const payload = {
      doctor_id: doctorId,
      patient_id: patientId,
      clinic_id: clinicId || null,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status,
      reason: reason || null,
      notes: notes || null,
    };

    const { error } = isEdit
      ? await supabase.from('appointments').update(payload).eq('id', appointment!.id)
      : await supabase.from('appointments').insert(payload);

    setSaving(false);
    if (error) {
      toast.error(isEdit ? 'Failed to update appointment' : 'Failed to create appointment');
      return;
    }
    toast.success(isEdit ? 'Appointment updated' : 'Appointment created');
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit appointment' : 'New appointment'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the booking details below.' : 'Fill in the details to book a new consultation.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Patient</Label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Doctor</Label>
              <Select value={doctorId} onValueChange={setDoctorId}>
                <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Clinic</Label>
              <Select value={clinicId} onValueChange={setClinicId}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {clinics.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start time</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="15"
                step="15"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              placeholder="e.g. Pre-transplant evaluation"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optional internal notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Create appointment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
