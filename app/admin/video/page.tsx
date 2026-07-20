'use client';

import * as React from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  Phone,
  PhoneOff,
  Users,
  Clock,
  Loader2,
  Plus,
  DoorOpen,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

type VideoRoom = {
  id: string;
  room_code: string;
  status: string;
  doctor_id: string | null;
  patient_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  doctors: { name: string } | null;
  patients: { name: string } | null;
  appointments: { start_time: string; reason: string | null } | null;
};

export default function VideoPage() {
  const [loading, setLoading] = React.useState(true);
  const [rooms, setRooms] = React.useState<VideoRoom[]>([]);
  const [activeRoom, setActiveRoom] = React.useState<VideoRoom | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('video_rooms')
      .select('*, doctors(name), patients(name), appointments(start_time, reason)')
      .order('created_at', { ascending: false })
      .limit(50);
    setRooms(data ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Video className="h-6 w-6 text-primary" />
            Video Consultations
          </h1>
          <p className="text-sm text-muted-foreground">
            Secure WebRTC rooms with waiting room, screen sharing, and participant controls.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New room
        </Button>
      </div>

      {activeRoom ? (
        <CallRoom room={activeRoom} onLeave={() => { setActiveRoom(null); load(); }} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="h-44 animate-pulse border-border/60 bg-muted/30" />
            ))
          ) : rooms.length === 0 ? (
            <Card className="border-border/60 md:col-span-2 lg:col-span-3">
              <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Video className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No consultation rooms yet.</p>
              </CardContent>
            </Card>
          ) : (
            rooms.map((r) => (
              <Card key={r.id} className="flex flex-col border-border/60 transition-all hover:border-primary/40 hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={
                        r.status === 'active'
                          ? 'border-chart-2/30 bg-chart-2/10 text-chart-2'
                          : r.status === 'waiting'
                          ? 'border-chart-3/30 bg-chart-3/10 text-chart-3'
                          : 'border-muted bg-muted text-muted-foreground'
                      }
                    >
                      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                      {r.status}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground">{r.room_code}</span>
                  </div>
                  <CardTitle className="mt-2 text-base">
                    {r.patients?.name ?? 'Unassigned patient'}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {r.doctors?.name ?? 'Unassigned doctor'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto flex items-center justify-between gap-2 pt-0">
                  {r.appointments && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(r.appointments.start_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  )}
                  <Button
                    size="sm"
                    disabled={r.status === 'ended'}
                    onClick={() => setActiveRoom(r)}
                  >
                    <DoorOpen className="mr-1.5 h-4 w-4" />
                    {r.status === 'ended' ? 'Ended' : 'Join'}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <CreateRoomDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(room) => {
          setCreateOpen(false);
          load();
          setActiveRoom(room);
        }}
      />
    </div>
  );
}

// ============ Call Room (WebRTC) ============

function CallRoom({ room, onLeave }: { room: VideoRoom; onLeave: () => void }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = React.useState(true);
  const [micOn, setMicOn] = React.useState(true);
  const [sharing, setSharing] = React.useState(false);
  const [connecting, setConnecting] = React.useState(true);
  const [elapsed, setElapsed] = React.useState(0);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const startCamera = React.useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setConnecting(false);
      // Mark room active
      await supabase.from('video_rooms').update({ status: 'active', started_at: new Date().toISOString() }).eq('id', room.id);
    } catch (err) {
      toast.error('Could not access camera/microphone. Check browser permissions.');
      setConnecting(false);
    }
  }, [room.id]);

  React.useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startCamera]);

  React.useEffect(() => {
    if (!connecting && room.status !== 'ended') {
      const start = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [connecting, room.status]);

  const toggleCamera = () => {
    const stream = streamRef.current;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track) {
      track.enabled = !cameraOn;
      setCameraOn(!cameraOn);
    }
  };

  const toggleMic = () => {
    const stream = streamRef.current;
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (track) {
      track.enabled = !micOn;
      setMicOn(!micOn);
    }
  };

  const toggleScreenShare = async () => {
    if (sharing) {
      // back to camera
      await startCamera();
      setSharing(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setSharing(true);
      stream.getVideoTracks()[0].onended = () => {
        setSharing(false);
        startCamera();
      };
    } catch {
      toast.error('Screen sharing was cancelled.');
    }
  };

  const handleLeave = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (timerRef.current) clearInterval(timerRef.current);
    await supabase.from('video_rooms').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', room.id);
    onLeave();
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-border/60">
        <div className="relative aspect-video w-full bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
          {connecting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Connecting to room {room.room_code}…</p>
            </div>
          )}

          {/* Top overlay */}
          <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
            <Badge className="bg-black/60 text-white backdrop-blur-sm">
              <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-chart-2" />
              {fmtTime(elapsed)}
            </Badge>
            <Badge className="bg-black/60 font-mono text-white backdrop-blur-sm">
              {room.room_code}
            </Badge>
          </div>

          {/* Waiting room indicator */}
          <div className="absolute bottom-20 left-4 flex items-center gap-2 rounded-lg bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur-sm">
            <Users className="h-3.5 w-3.5" />
            <span>{room.patients?.name ?? 'Patient'} · {room.doctors?.name ?? 'Doctor'}</span>
          </div>

          {/* Controls */}
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-3 py-2 backdrop-blur-md">
            <button
              onClick={toggleMic}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
                micOn ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-white text-black'
              )}
              title={micOn ? 'Mute' : 'Unmute'}
            >
              {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>
            <button
              onClick={toggleCamera}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
                cameraOn ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-white text-black'
              )}
              title={cameraOn ? 'Stop video' : 'Start video'}
            >
              {cameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>
            <button
              onClick={toggleScreenShare}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
                sharing ? 'bg-primary text-primary-foreground' : 'bg-white/15 text-white hover:bg-white/25'
              )}
              title={sharing ? 'Stop sharing' : 'Share screen'}
            >
              <Monitor className="h-5 w-5" />
            </button>
            <button
              onClick={handleLeave}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive text-white transition-colors hover:bg-destructive/80"
              title="Leave call"
            >
              <PhoneOff className="h-5 w-5" />
            </button>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium">{room.patients?.name ?? 'Patient'}</p>
            <p className="text-xs text-muted-foreground">{room.doctors?.name ?? 'Doctor'}</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleLeave}>
          <PhoneOff className="mr-2 h-4 w-4" />
          End consultation
        </Button>
      </div>
    </div>
  );
}

// ============ Create Room Dialog ============

function CreateRoomDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (room: VideoRoom) => void;
}) {
  const [doctorId, setDoctorId] = React.useState('');
  const [patientId, setPatientId] = React.useState('');
  const [appointmentId, setAppointmentId] = React.useState('');
  const [doctors, setDoctors] = React.useState<{ id: string; name: string }[]>([]);
  const [patients, setPatients] = React.useState<{ id: string; name: string }[]>([]);
  const [appointments, setAppointments] = React.useState<{ id: string; start_time: string; patients: { name: string } | null }[]>([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      (async () => {
        const [{ data: d }, { data: p }, { data: a }] = await Promise.all([
          supabase.from('doctors').select('id, name').order('name'),
          supabase.from('patients').select('id, name').order('name'),
          supabase.from('appointments').select('id, start_time, patients(name)').gte('start_time', new Date().toISOString()).order('start_time').limit(20),
        ]);
        setDoctors(d ?? []);
        setPatients(p ?? []);
        setAppointments((a ?? []) as unknown as { id: string; start_time: string; patients: { name: string } | null }[]);
      })();
    }
  }, [open]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const code = 'ROOM-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    const payload = {
      room_code: code,
      doctor_id: doctorId || null,
      patient_id: patientId || null,
      appointment_id: appointmentId || null,
      status: 'waiting',
    };
    const { data, error } = await supabase
      .from('video_rooms')
      .insert(payload)
      .select('*, doctors(name), patients(name), appointments(start_time, reason)')
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error('Failed to create room');
      return;
    }
    toast.success(`Room ${code} created`);
    onCreated(data as VideoRoom);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create consultation room</DialogTitle>
          <DialogDescription>Set up a secure video room for a patient-doctor consultation.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Linked appointment (optional)</Label>
            <Select value={appointmentId} onValueChange={setAppointmentId}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                {appointments.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {new Date(a.start_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} — {a.patients?.name ?? 'Unknown'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Doctor</Label>
              <Select value={doctorId} onValueChange={setDoctorId}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Patient</Label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create room
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
