/*
# Phase 10 & 13 — Video Rooms + Documents

## Purpose
Adds tables to support secure video consultations and patient document management.

## New Tables
1. `video_rooms` — a consultation room tied to an optional appointment.
   - `id` (uuid PK)
   - `appointment_id` (uuid, nullable, references appointments)
   - `doctor_id` (uuid, references doctors)
   - `patient_id` (uuid, references patients)
   - `room_code` (text, unique) — short joinable code
   - `status` (text: 'waiting' | 'active' | 'ended', default 'waiting')
   - `started_at`, `ended_at` (timestamptz)
   - timestamps
2. `documents` — patient-uploaded files stored in Supabase Storage.
   - `id` (uuid PK)
   - `patient_id` (uuid, references patients)
   - `doctor_id` (uuid, nullable, references doctors)
   - `file_name` (text)
   - `file_path` (text) — storage object path
   - `file_size` (bigint)
   - `mime_type` (text)
   - `document_type` (text: 'id' | 'referral' | 'lab' | 'imaging' | 'consent' | 'other')
   - `status` (text: 'pending' | 'verified' | 'rejected', default 'pending')
   - `notes` (text)
   - timestamps + soft delete (`deleted_at`)

## Security
- RLS enabled on both tables.
- `TO authenticated` with `USING (true)` / `WITH CHECK (true)` for CRUD —
  only signed-in users can access.
- Indexes on foreign keys and frequently-filtered columns.

## Storage
- A `documents` storage bucket is created (public-read for preview, authenticated write).
*/

-- ============ video_rooms ============
CREATE TABLE IF NOT EXISTS video_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  doctor_id uuid REFERENCES doctors(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
  room_code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'active', 'ended')),
  started_at timestamptz,
  ended_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE video_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_video_rooms" ON video_rooms;
CREATE POLICY "auth_select_video_rooms" ON video_rooms FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_video_rooms" ON video_rooms;
CREATE POLICY "auth_insert_video_rooms" ON video_rooms FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_video_rooms" ON video_rooms;
CREATE POLICY "auth_update_video_rooms" ON video_rooms FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_video_rooms" ON video_rooms;
CREATE POLICY "auth_delete_video_rooms" ON video_rooms FOR DELETE
  TO authenticated USING (true);

-- ============ documents ============
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES doctors(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint DEFAULT 0,
  mime_type text,
  document_type text NOT NULL DEFAULT 'other'
    CHECK (document_type IN ('id', 'referral', 'lab', 'imaging', 'consent', 'other')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'rejected')),
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_documents" ON documents;
CREATE POLICY "auth_select_documents" ON documents FOR SELECT
  TO authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "auth_insert_documents" ON documents;
CREATE POLICY "auth_insert_documents" ON documents FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_documents" ON documents;
CREATE POLICY "auth_update_documents" ON documents FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_documents" ON documents;
CREATE POLICY "auth_delete_documents" ON documents FOR DELETE
  TO authenticated USING (true);

-- ============ Indexes ============
CREATE INDEX IF NOT EXISTS idx_video_rooms_appointment_id ON video_rooms(appointment_id);
CREATE INDEX IF NOT EXISTS idx_video_rooms_doctor_id ON video_rooms(doctor_id);
CREATE INDEX IF NOT EXISTS idx_video_rooms_patient_id ON video_rooms(patient_id);
CREATE INDEX IF NOT EXISTS idx_video_rooms_status ON video_rooms(status);
CREATE INDEX IF NOT EXISTS idx_documents_patient_id ON documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_documents_doctor_id ON documents(doctor_id);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- ============ Triggers ============
DROP TRIGGER IF EXISTS trg_video_rooms_updated ON video_rooms;
CREATE TRIGGER trg_video_rooms_updated BEFORE UPDATE ON video_rooms
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_documents_updated ON documents;
CREATE TRIGGER trg_documents_updated BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============ Storage bucket ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated can upload/update/delete; anyone can read (public bucket for preview)
DROP POLICY IF EXISTS "documents_bucket_read" ON storage.objects;
CREATE POLICY "documents_bucket_read" ON storage.objects
  FOR SELECT TO authenticated, anon
  USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_bucket_insert" ON storage.objects;
CREATE POLICY "documents_bucket_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_bucket_update" ON storage.objects;
CREATE POLICY "documents_bucket_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'documents') WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_bucket_delete" ON storage.objects;
CREATE POLICY "documents_bucket_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documents');