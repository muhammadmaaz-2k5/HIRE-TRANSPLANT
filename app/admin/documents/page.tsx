'use client';

import * as React from 'react';
import {
  FileText,
  Upload,
  Download,
  Eye,
  Trash2,
  Loader2,
  FileCheck,
  FileX,
  Clock,
  Plus,
  MoreHorizontal,
  FileImage,
  FileType,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

type DocumentRow = {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  document_type: string;
  status: string;
  notes: string | null;
  created_at: string;
  patient_id: string;
  patients: { name: string } | null;
};

const docTypes = [
  { value: 'id', label: 'ID Document' },
  { value: 'referral', label: 'Referral Letter' },
  { value: 'lab', label: 'Lab Report' },
  { value: 'imaging', label: 'Imaging' },
  { value: 'consent', label: 'Consent Form' },
  { value: 'other', label: 'Other' },
];

const statusStyles: Record<string, string> = {
  pending: 'bg-chart-3/15 text-chart-3',
  verified: 'bg-chart-2/15 text-chart-2',
  rejected: 'bg-destructive/15 text-destructive',
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function docIcon(type: string, mimeType: string | null) {
  if (mimeType?.startsWith('image/')) return FileImage;
  if (type === 'lab' || type === 'consent') return FileCheck;
  return FileText;
}

export default function DocumentsPage() {
  const [loading, setLoading] = React.useState(true);
  const [docs, setDocs] = React.useState<DocumentRow[]>([]);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [preview, setPreview] = React.useState<DocumentRow | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('documents')
      .select('*, patients(name)')
      .order('created_at', { ascending: false })
      .limit(100);
    setDocs(data ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string, filePath: string) => {
    const { error: dbErr } = await supabase.from('documents').delete().eq('id', id);
    if (dbErr) {
      toast.error('Failed to delete document');
      return;
    }
    await supabase.storage.from('documents').remove([filePath]);
    toast.success('Document deleted');
    load();
  };

  const handleStatusChange = async (id: string, status: string) => {
    const { error } = await supabase.from('documents').update({ status }).eq('id', id);
    if (error) {
      toast.error('Failed to update status');
      return;
    }
    toast.success(`Marked as ${status}`);
    load();
  };

  const getPublicUrl = (filePath: string) => {
    const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
    return data.publicUrl;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <FileText className="h-6 w-6 text-primary" />
            Documents
          </h1>
          <p className="text-sm text-muted-foreground">
            Secure patient document management — upload, verify, and preview files.
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload document
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Pending review', value: docs.filter((d) => d.status === 'pending').length, icon: Clock, color: 'text-chart-3' },
          { label: 'Verified', value: docs.filter((d) => d.status === 'verified').length, icon: FileCheck, color: 'text-chart-2' },
          { label: 'Rejected', value: docs.filter((d) => d.status === 'rejected').length, icon: FileX, color: 'text-destructive' },
        ].map((s) => (
          <Card key={s.label} className="border-border/60">
            <CardContent className="flex items-center gap-3 p-5">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg bg-muted', s.color)}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-lg">All documents</CardTitle>
          <CardDescription>{docs.length} files · sorted by upload date</CardDescription>
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
                  <TableHead>File</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden lg:table-cell">Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                      No documents uploaded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  docs.map((d) => {
                    const Icon = docIcon(d.document_type, d.mime_type);
                    return (
                      <TableRow key={d.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">{d.file_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{d.patients?.name ?? '—'}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className="font-normal">
                            {docTypes.find((t) => t.value === d.document_type)?.label ?? d.document_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                          {formatSize(d.file_size)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ' +
                              (statusStyles[d.status] ?? 'bg-muted text-muted-foreground')
                            }
                          >
                            {d.status}
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
                              <DropdownMenuItem onClick={() => setPreview(d)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Preview
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.open(getPublicUrl(d.file_path), '_blank')}>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleStatusChange(d.id, 'verified')}>
                                <FileCheck className="mr-2 h-4 w-4" />
                                Mark verified
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(d.id, 'rejected')}>
                                <FileX className="mr-2 h-4 w-4" />
                                Mark rejected
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(d.id, d.file_path)}
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

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onUploaded={load} />
      <PreviewDialog doc={preview} onClose={() => setPreview(null)} getUrl={getPublicUrl} />
    </div>
  );
}

// ============ Upload Dialog ============

function UploadDialog({
  open,
  onOpenChange,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUploaded: () => void;
}) {
  const [patients, setPatients] = React.useState<{ id: string; name: string }[]>([]);
  const [patientId, setPatientId] = React.useState('');
  const [docType, setDocType] = React.useState('id');
  const [file, setFile] = React.useState<File | null>(null);
  const [notes, setNotes] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      supabase.from('patients').select('id, name').order('name').then(({ data }) => setPatients(data ?? []));
      setPatientId('');
      setDocType('id');
      setFile(null);
      setNotes('');
    }
  }, [open]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !file) {
      toast.error('Patient and file are required');
      return;
    }
    setSaving(true);
    const ext = file.name.split('.').pop() ?? 'file';
    const filePath = `${patientId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    const { error: uploadErr } = await supabase.storage.from('documents').upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (uploadErr) {
      setSaving(false);
      toast.error('Upload failed: ' + uploadErr.message);
      return;
    }

    const { error: dbErr } = await supabase.from('documents').insert({
      patient_id: patientId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type || null,
      document_type: docType,
      status: 'pending',
      notes: notes || null,
    });

    setSaving(false);
    if (dbErr) {
      toast.error('Failed to save document record');
      return;
    }
    toast.success('Document uploaded');
    onOpenChange(false);
    onUploaded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
          <DialogDescription>Upload a patient file to secure storage.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
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
            <Label>Document type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {docTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="file">File</Label>
            <Input
              id="file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name} · {formatSize(file.size)}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Received via email" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============ Preview Dialog ============

function PreviewDialog({
  doc,
  onClose,
  getUrl,
}: {
  doc: DocumentRow | null;
  onClose: () => void;
  getUrl: (path: string) => string;
}) {
  const [url, setUrl] = React.useState('');

  React.useEffect(() => {
    if (doc) setUrl(getUrl(doc.file_path));
  }, [doc, getUrl]);

  if (!doc) return null;
  const isImage = doc.mime_type?.startsWith('image/');

  return (
    <Dialog open={!!doc} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {doc.file_name}
          </DialogTitle>
          <DialogDescription>
            {doc.patients?.name ?? 'Unknown patient'} · {formatSize(doc.file_size)} · {doc.document_type}
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-border/60 bg-muted/30 p-4">
          {isImage ? (
            <img src={url} alt={doc.file_name} className="max-h-[60vh] rounded-lg object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <FileType className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Preview not available for this file type.
              </p>
              <Button asChild>
                <a href={url} target="_blank" rel="noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  Open in new tab
                </a>
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="capitalize">{doc.status}</Badge>
          <Button asChild variant="outline">
            <a href={url} target="_blank" rel="noreferrer">
              <Download className="mr-2 h-4 w-4" />
              Download
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
