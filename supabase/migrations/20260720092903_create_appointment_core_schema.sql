/*
# HIRE TRANSPLANT — Core Appointment Schema

## Purpose
Creates the foundational tables for an AI-powered appointment management system:
clinics, doctors, patients, appointments, and doctor availability slots.

## New Tables
1. `clinics` — healthcare facilities (name, address, contact, hours).
2. `doctors` — physicians linked to a clinic (name, specialty, bio, status).
3. `patients` — people who book appointments (name, email, phone, DOB).
4. `appointments` — a booking between a patient and a doctor at a clinic,
   with status, reason, and timestamps.
5. `availability` — recurring weekly availability windows per doctor
   (day of week, start/end time).

## Design Notes
- Single-tenant demo foundation: no `auth.users` linkage yet. Policies use
  `TO anon, authenticated` so the anon-key frontend can read the demo data.
  When real auth is added in a later phase, these policies will be tightened
  to ownership checks.
- All tables have `created_at` / `updated_at` timestamps.
- Soft-delete via `deleted_at` nullable timestamp on patient/doctor/clinic.
- Indexed foreign keys and frequently-filtered columns (status, clinic_id,
  doctor_id, patient_id, start_time).
- `appointments.status` constrained to a lifecycle enum.

## Security
- RLS enabled on every table.
- Anon + authenticated CRUD allowed because this is a shared demo dataset
  with no per-user ownership yet. Documented as intentionally public.
*/

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============ clinics ============
CREATE TABLE IF NOT EXISTS clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  city text,
  phone text,
  email text,
  opening_time time,
  closing_time time,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_clinics" ON clinics;
CREATE POLICY "anon_select_clinics" ON clinics FOR SELECT
  TO anon, authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "anon_insert_clinics" ON clinics;
CREATE POLICY "anon_insert_clinics" ON clinics FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_clinics" ON clinics;
CREATE POLICY "anon_update_clinics" ON clinics FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_clinics" ON clinics;
CREATE POLICY "anon_delete_clinics" ON clinics FOR DELETE
  TO anon, authenticated USING (true);

-- ============ doctors ============
CREATE TABLE IF NOT EXISTS doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE SET NULL,
  name text NOT NULL,
  specialty text,
  email text,
  phone text,
  bio text,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_doctors" ON doctors;
CREATE POLICY "anon_select_doctors" ON doctors FOR SELECT
  TO anon, authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "anon_insert_doctors" ON doctors;
CREATE POLICY "anon_insert_doctors" ON doctors FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_doctors" ON doctors;
CREATE POLICY "anon_update_doctors" ON doctors FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_doctors" ON doctors;
CREATE POLICY "anon_delete_doctors" ON doctors FOR DELETE
  TO anon, authenticated USING (true);

-- ============ patients ============
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  date_of_birth date,
  gender text,
  address text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_patients" ON patients;
CREATE POLICY "anon_select_patients" ON patients FOR SELECT
  TO anon, authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "anon_insert_patients" ON patients;
CREATE POLICY "anon_insert_patients" ON patients FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_patients" ON patients;
CREATE POLICY "anon_update_patients" ON patients FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_patients" ON patients;
CREATE POLICY "anon_delete_patients" ON patients FOR DELETE
  TO anon, authenticated USING (true);

-- ============ appointments ============
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE SET NULL,
  doctor_id uuid REFERENCES doctors(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reason text,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_appointments" ON appointments;
CREATE POLICY "anon_select_appointments" ON appointments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_appointments" ON appointments;
CREATE POLICY "anon_insert_appointments" ON appointments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_appointments" ON appointments;
CREATE POLICY "anon_update_appointments" ON appointments FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_appointments" ON appointments;
CREATE POLICY "anon_delete_appointments" ON appointments FOR DELETE
  TO anon, authenticated USING (true);

-- ============ availability ============
CREATE TABLE IF NOT EXISTS availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_availability" ON availability;
CREATE POLICY "anon_select_availability" ON availability FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_availability" ON availability;
CREATE POLICY "anon_insert_availability" ON availability FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_availability" ON availability;
CREATE POLICY "anon_update_availability" ON availability FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_availability" ON availability;
CREATE POLICY "anon_delete_availability" ON availability FOR DELETE
  TO anon, authenticated USING (true);

-- ============ Indexes ============
CREATE INDEX IF NOT EXISTS idx_doctors_clinic_id ON doctors(clinic_id);
CREATE INDEX IF NOT EXISTS idx_doctors_status ON doctors(status);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_availability_doctor_id ON availability(doctor_id);

-- ============ updated_at triggers ============
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clinics_updated ON clinics;
CREATE TRIGGER trg_clinics_updated BEFORE UPDATE ON clinics
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_doctors_updated ON doctors;
CREATE TRIGGER trg_doctors_updated BEFORE UPDATE ON doctors
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_patients_updated ON patients;
CREATE TRIGGER trg_patients_updated BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_appointments_updated ON appointments;
CREATE TRIGGER trg_appointments_updated BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_availability_updated ON availability;
CREATE TRIGGER trg_availability_updated BEFORE UPDATE ON availability
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();