import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Clinic = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  opening_time: string | null;
  closing_time: string | null;
};

export type Doctor = {
  id: string;
  clinic_id: string | null;
  name: string;
  specialty: string | null;
  email: string | null;
  phone: string | null;
  bio: string | null;
  status: string;
};

export type Patient = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  created_at: string;
};

export type Appointment = {
  id: string;
  clinic_id: string | null;
  doctor_id: string | null;
  patient_id: string | null;
  start_time: string;
  end_time: string;
  status: string;
  reason: string | null;
  notes: string | null;
};

export type AppointmentWithRelations = Appointment & {
  doctors: Pick<Doctor, 'name' | 'specialty'> | null;
  patients: Pick<Patient, 'name' | 'email'> | null;
  clinics: Pick<Clinic, 'name'> | null;
};
