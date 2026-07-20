/*
# Phase 2 — Authentication, Roles & RLS Tightening

## Purpose
Introduces per-user profiles with role assignment and tightens row-level security
on the core appointment tables so data is only accessible to signed-in users.

## New Tables
1. `profiles` — one row per authenticated user, linked to `auth.users`.
   - `id` (uuid, PK, references auth.users.id ON DELETE CASCADE)
   - `email` (text, unique)
   - `full_name` (text)
   - `role` (text: 'patient' | 'doctor' | 'coordinator' | 'admin', default 'patient')
   - `created_at`, `updated_at` timestamps
   A trigger auto-creates a profile row whenever a new auth.users row is inserted.

## Security Changes
- RLS enabled on `profiles`.
  - SELECT: authenticated users can read all profiles (staff coordination needs it).
  - INSERT: a user can insert only their own profile row.
  - UPDATE: a user can update only their own profile row (self-service name).
  - DELETE: a user can delete only their own profile row.
- RLS policies on `clinics`, `doctors`, `patients`, `appointments`, `availability`
  are tightened from `TO anon, authenticated` (public demo) to `TO authenticated`
  with `USING (true)` for SELECT/INSERT/UPDATE/DELETE. This locks the data to
  signed-in users only. The anon role can no longer read or write these tables.

## Important Notes
1. Because the app now has a sign-in screen, the anon-key client will return
   zero rows until the user authenticates. The sign-in / sign-up flow is built
   in the same task so authenticated users can reach the data.
2. The `profiles` table is the source of truth for role-based access control.
   Roles are stored as plain text with a CHECK constraint to keep values valid.
3. A trigger function `handle_new_user()` inserts a profile row automatically
   on signup, defaulting the role to 'patient' and copying the email from auth.users.
*/

-- ============ profiles ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'patient'
    CHECK (role IN ('patient', 'doctor', 'coordinator', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- updated_at trigger for profiles
DROP TRIGGER IF EXISTS trg_profiles_updated ON profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============ Auto-create profile on signup ============
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============ Tighten RLS on core tables ============
-- Switch from anon+authenticated to authenticated-only.

-- clinics
DROP POLICY IF EXISTS "anon_select_clinics" ON clinics;
DROP POLICY IF EXISTS "anon_insert_clinics" ON clinics;
DROP POLICY IF EXISTS "anon_update_clinics" ON clinics;
DROP POLICY IF EXISTS "anon_delete_clinics" ON clinics;

CREATE POLICY "auth_select_clinics" ON clinics FOR SELECT
  TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "auth_insert_clinics" ON clinics FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_clinics" ON clinics FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_clinics" ON clinics FOR DELETE
  TO authenticated USING (true);

-- doctors
DROP POLICY IF EXISTS "anon_select_doctors" ON doctors;
DROP POLICY IF EXISTS "anon_insert_doctors" ON doctors;
DROP POLICY IF EXISTS "anon_update_doctors" ON doctors;
DROP POLICY IF EXISTS "anon_delete_doctors" ON doctors;

CREATE POLICY "auth_select_doctors" ON doctors FOR SELECT
  TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "auth_insert_doctors" ON doctors FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_doctors" ON doctors FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_doctors" ON doctors FOR DELETE
  TO authenticated USING (true);

-- patients
DROP POLICY IF EXISTS "anon_select_patients" ON patients;
DROP POLICY IF EXISTS "anon_insert_patients" ON patients;
DROP POLICY IF EXISTS "anon_update_patients" ON patients;
DROP POLICY IF EXISTS "anon_delete_patients" ON patients;

CREATE POLICY "auth_select_patients" ON patients FOR SELECT
  TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "auth_insert_patients" ON patients FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_patients" ON patients FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_patients" ON patients FOR DELETE
  TO authenticated USING (true);

-- appointments
DROP POLICY IF EXISTS "anon_select_appointments" ON appointments;
DROP POLICY IF EXISTS "anon_insert_appointments" ON appointments;
DROP POLICY IF EXISTS "anon_update_appointments" ON appointments;
DROP POLICY IF EXISTS "anon_delete_appointments" ON appointments;

CREATE POLICY "auth_select_appointments" ON appointments FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "auth_insert_appointments" ON appointments FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_appointments" ON appointments FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_appointments" ON appointments FOR DELETE
  TO authenticated USING (true);

-- availability
DROP POLICY IF EXISTS "anon_select_availability" ON availability;
DROP POLICY IF EXISTS "anon_insert_availability" ON availability;
DROP POLICY IF EXISTS "anon_update_availability" ON availability;
DROP POLICY IF EXISTS "anon_delete_availability" ON availability;

CREATE POLICY "auth_select_availability" ON availability FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "auth_insert_availability" ON availability FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_availability" ON availability FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_availability" ON availability FOR DELETE
  TO authenticated USING (true);