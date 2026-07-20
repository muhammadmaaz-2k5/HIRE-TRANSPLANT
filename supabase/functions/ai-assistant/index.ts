import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type ToolCall = {
  name: string;
  args: Record<string, unknown>;
};

type ToolResult = {
  name: string;
  result: unknown;
};

const SYSTEM_PROMPT = `You are the HIRE TRANSPLANT AI Appointment Assistant. You help patients and staff book, check, reschedule, and cancel appointments at transplant clinics.

You have these tools available:
- checkDoctorAvailability(doctor_name?: string): Find upcoming availability slots for a doctor.
- getDoctorSchedule(doctor_name: string): Get a doctor's recurring weekly availability.
- findNextAvailableSlot(doctor_name?: string): Find the next free slot for a doctor.
- createAppointment(doctor_name: string, patient_name: string, date: string, time: string, reason?: string): Book a new appointment.
- getAppointment(patient_name?: string, doctor_name?: string): Look up existing appointments.
- updateAppointment(patient_name: string, new_date: string, new_time: string, doctor_name?: string): Reschedule an appointment.
- cancelAppointment(patient_name: string, doctor_name?: string): Cancel an appointment.

Always confirm with the user before creating, updating, or canceling an appointment. Be concise and friendly. When showing times, use a clear 12-hour format.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    const userText = (lastUserMsg?.content ?? "").toString();

    // Initialize Supabase client using the request's auth context
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Parse intent and dispatch to tools
    const toolCall = parseIntent(userText);
    const toolResults: ToolResult[] = [];

    if (toolCall) {
      const result = await executeTool(supabase, toolCall);
      toolResults.push({ name: toolCall.name, result });
    }

    const reply = composeReply(userText, toolCall, toolResults);

    return new Response(
      JSON.stringify({
        reply,
        toolCalls: toolCall ? [toolCall] : [],
        toolResults,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ---------- Intent parsing ----------

function parseIntent(text: string): ToolCall | null {
  const t = text.toLowerCase();

  const doctorMatch = text.match(/dr\.?\s+([a-z]+(?:\s+[a-z]+)?)/i);
  const doctorName = doctorMatch ? `Dr. ${capitalizeWords(doctorMatch[1])}` : undefined;

  const patientMatch = text.match(/(?:for|patient:?\s+)([a-z]+(?:\s+[a-z]+)?)/i);
  const patientName = patientMatch ? capitalizeWords(patientMatch[1]) : undefined;

  const dateStr = extractDate(text);
  const timeStr = extractTime(text);

  // Cancel
  if (/\b(cancel|delete|remove)\b/.test(t)) {
    return {
      name: "cancelAppointment",
      args: { patient_name: patientName, doctor_name: doctorName },
    };
  }

  // Reschedule / update
  if (/\b(reschedule|move|change|update)\b/.test(t)) {
    return {
      name: "updateAppointment",
      args: {
        patient_name: patientName,
        doctor_name: doctorName,
        new_date: dateStr ?? "",
        new_time: timeStr ?? "",
      },
    };
  }

  // Next available slot
  if (/\b(next available|next slot|earliest|soonest)\b/.test(t)) {
    return {
      name: "findNextAvailableSlot",
      args: { doctor_name: doctorName },
    };
  }

  // Schedule / availability
  if (/\b(schedule|availability|available|free slots|when (is|can))\b/.test(t)) {
    if (/\b(schedule|hours|weekly|week)\b/.test(t)) {
      return {
        name: "getDoctorSchedule",
        args: { doctor_name: doctorName ?? "" },
      };
    }
    return {
      name: "checkDoctorAvailability",
      args: { doctor_name: doctorName },
    };
  }

  // Book / create
  if (/\b(book|appointment|schedule me|set up|make an? appointment)\b/.test(t)) {
    return {
      name: "createAppointment",
      args: {
        doctor_name: doctorName ?? "",
        patient_name: patientName ?? "",
        date: dateStr ?? "",
        time: timeStr ?? "",
        reason: extractReason(text),
      },
    };
  }

  // Lookup / get
  if (/\b(my appointments|look up|find appointment|show|get appointment|what.*appointment)\b/.test(t)) {
    return {
      name: "getAppointment",
      args: { patient_name: patientName, doctor_name: doctorName },
    };
  }

  return null;
}

function extractDate(text: string): string | undefined {
  const t = text.toLowerCase();
  const today = new Date();

  if (/\btoday\b/.test(t)) return today.toISOString().slice(0, 10);
  if (/\btomorrow\b/.test(t)) {
    const d = new Date(today.getTime() + 86400000);
    return d.toISOString().slice(0, 10);
  }

  const dayMatch = t.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  if (dayMatch) {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const target = days.indexOf(dayMatch[1]);
    let diff = target - today.getDay();
    if (diff <= 0) diff += 7;
    if (/next/.test(t)) diff += 7;
    const d = new Date(today.getTime() + diff * 86400000);
    return d.toISOString().slice(0, 10);
  }

  const dateMatch = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (dateMatch) {
    const month = parseInt(dateMatch[1], 10);
    const day = parseInt(dateMatch[2], 10);
    const year = dateMatch[3] ? parseInt(dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3], 10) : today.getFullYear();
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return undefined;
}

function extractTime(text: string): string | undefined {
  const m = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (m) {
    let h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    const ap = m[3].toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }
  const m2 = text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (m2) return `${m2[1].padStart(2, "0")}:${m2[2]}`;
  return undefined;
}

function extractReason(text: string): string | undefined {
  const reasons = ["evaluation", "follow-up", "consultation", "checkup", "lab", "review", "surgery"];
  const t = text.toLowerCase();
  for (const r of reasons) {
    if (t.includes(r)) {
      const map: Record<string, string> = {
        evaluation: "Pre-transplant evaluation",
        "follow-up": "Follow-up consultation",
        consultation: "General consultation",
        checkup: "Post-operative checkup",
        lab: "Lab results review",
        review: "Lab results review",
        surgery: "Transplant surgery consultation",
      };
      return map[r];
    }
  }
  return undefined;
}

function capitalizeWords(s: string): string {
  return s.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

// ---------- Tool execution ----------

async function executeTool(supabase: any, call: ToolCall): Promise<unknown> {
  switch (call.name) {
    case "checkDoctorAvailability":
      return checkDoctorAvailability(supabase, call.args.doctor_name);
    case "getDoctorSchedule":
      return getDoctorSchedule(supabase, call.args.doctor_name);
    case "findNextAvailableSlot":
      return findNextAvailableSlot(supabase, call.args.doctor_name);
    case "createAppointment":
      return createAppointment(supabase, call.args);
    case "getAppointment":
      return getAppointment(supabase, call.args);
    case "updateAppointment":
      return updateAppointment(supabase, call.args);
    case "cancelAppointment":
      return cancelAppointment(supabase, call.args);
    default:
      return { error: `Unknown tool: ${call.name}` };
  }
}

async function findDoctor(supabase: any, name?: string) {
  if (!name) return null;
  const { data } = await supabase
    .from("doctors")
    .select("id, name, specialty")
    .ilike("name", `%${name.replace("Dr. ", "").replace("Dr ", "")}%`)
    .limit(1)
    .maybeSingle();
  return data;
}

async function findPatient(supabase: any, name?: string) {
  if (!name) return null;
  const { data } = await supabase
    .from("patients")
    .select("id, name")
    .ilike("name", `%${name}%`)
    .limit(1)
    .maybeSingle();
  return data;
}

async function checkDoctorAvailability(supabase: any, doctorName?: string) {
  const doctor = await findDoctor(supabase, doctorName);
  let query = supabase
    .from("appointments")
    .select("id, start_time, end_time, status, doctors(name), patients(name)")
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(10);
  if (doctor) query = query.eq("doctor_id", doctor.id);
  const { data, error } = await query;
  if (error) return { error: error.message };
  return { doctor: doctor?.name ?? "All doctors", upcoming: data ?? [] };
}

async function getDoctorSchedule(supabase: any, doctorName: string) {
  const doctor = await findDoctor(supabase, doctorName);
  if (!doctor) return { error: `Doctor not found: ${doctorName}` };
  const { data, error } = await supabase
    .from("availability")
    .select("day_of_week, start_time, end_time")
    .eq("doctor_id", doctor.id)
    .order("day_of_week", { ascending: true });
  if (error) return { error: error.message };
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const schedule = (data ?? []).map((s: any) => ({
    day: days[s.day_of_week],
    from: s.start_time,
    to: s.end_time,
  }));
  return { doctor: doctor.name, specialty: doctor.specialty, schedule };
}

async function findNextAvailableSlot(supabase: any, doctorName?: string) {
  const doctor = await findDoctor(supabase, doctorName);
  if (!doctor) {
    // Return earliest upcoming appointment as a fallback
    const { data } = await supabase
      .from("appointments")
      .select("start_time, doctors(name)")
      .gte("start_time", new Date().toISOString())
      .order("start_time", { ascending: true })
      .limit(1)
      .maybeSingle();
    return { doctor: "Any", nextSlot: data?.start_time ?? null };
  }
  const { data: avail } = await supabase
    .from("availability")
    .select("day_of_week, start_time, end_time")
    .eq("doctor_id", doctor.id)
    .order("day_of_week", { ascending: true });
  if (!avail || avail.length === 0) {
    return { doctor: doctor.name, nextSlot: null, note: "No recurring availability set." };
  }
  // Find next day-of-week match
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now.getTime() + i * 86400000);
    const dow = d.getDay();
    const slot = avail.find((a: any) => a.day_of_week === dow);
    if (slot) {
      const [h, m] = slot.start_time.split(":");
      const slotDate = new Date(d);
      slotDate.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
      if (slotDate > now) {
        return { doctor: doctor.name, nextSlot: slotDate.toISOString() };
      }
    }
  }
  return { doctor: doctor.name, nextSlot: null };
}

async function createAppointment(supabase: any, args: any) {
  if (!args.doctor_name || !args.patient_name || !args.date || !args.time) {
    return { error: "Missing required fields: doctor_name, patient_name, date, time" };
  }
  const doctor = await findDoctor(supabase, args.doctor_name);
  if (!doctor) return { error: `Doctor not found: ${args.doctor_name}` };
  const patient = await findPatient(supabase, args.patient_name);
  const start = new Date(`${args.date}T${args.time}:00`);
  const end = new Date(start.getTime() + 45 * 60000);
  const payload = {
    doctor_id: doctor.id,
    patient_id: patient?.id ?? null,
    clinic_id: doctor.clinic_id,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    status: "pending",
    reason: args.reason ?? "AI-booked appointment",
  };
  const { data, error } = await supabase.from("appointments").insert(payload).select("id, start_time, status").single();
  if (error) return { error: error.message };
  return { created: true, appointment: data, doctor: doctor.name, patient: args.patient_name };
}

async function getAppointment(supabase: any, args: any) {
  let query = supabase
    .from("appointments")
    .select("id, start_time, end_time, status, reason, doctors(name), patients(name)")
    .order("start_time", { ascending: true })
    .limit(10);
  if (args.patient_name) {
    const patient = await findPatient(supabase, args.patient_name);
    if (patient) query = query.eq("patient_id", patient.id);
  }
  if (args.doctor_name) {
    const doctor = await findDoctor(supabase, args.doctor_name);
    if (doctor) query = query.eq("doctor_id", doctor.id);
  }
  const { data, error } = await query;
  if (error) return { error: error.message };
  return { appointments: data ?? [] };
}

async function updateAppointment(supabase: any, args: any) {
  if (!args.patient_name) return { error: "Patient name required to find the appointment." };
  const patient = await findPatient(supabase, args.patient_name);
  if (!patient) return { error: `Patient not found: ${args.patient_name}` };
  let query = supabase
    .from("appointments")
    .select("id, start_time, doctors(name)")
    .eq("patient_id", patient.id)
    .order("start_time", { ascending: true })
    .limit(1);
  if (args.doctor_name) {
    const doctor = await findDoctor(supabase, args.doctor_name);
    if (doctor) query = query.eq("doctor_id", doctor.id);
  }
  const { data: existing, error: fe } = await query.maybeSingle();
  if (fe || !existing) return { error: "No appointment found to reschedule." };
  if (!args.new_date || !args.new_time) return { error: "New date and time required." };
  const start = new Date(`${args.new_date}T${args.new_time}:00`);
  const end = new Date(start.getTime() + 45 * 60000);
  const { data, error } = await supabase
    .from("appointments")
    .update({ start_time: start.toISOString(), end_time: end.toISOString(), status: "confirmed" })
    .eq("id", existing.id)
    .select("id, start_time, status")
    .single();
  if (error) return { error: error.message };
  return { updated: true, appointment: data };
}

async function cancelAppointment(supabase: any, args: any) {
  if (!args.patient_name) return { error: "Patient name required." };
  const patient = await findPatient(supabase, args.patient_name);
  if (!patient) return { error: `Patient not found: ${args.patient_name}` };
  let query = supabase
    .from("appointments")
    .select("id, start_time, doctors(name)")
    .eq("patient_id", patient.id)
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(1);
  if (args.doctor_name) {
    const doctor = await findDoctor(supabase, args.doctor_name);
    if (doctor) query = query.eq("doctor_id", doctor.id);
  }
  const { data: existing, error: fe } = await query.maybeSingle();
  if (fe || !existing) return { error: "No upcoming appointment found to cancel." };
  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", existing.id);
  if (error) return { error: error.message };
  return { cancelled: true, appointment: existing };
}

// ---------- Reply composition ----------

function composeReply(userText: string, call: ToolCall | null, results: ToolResult[]): string {
  if (!call) {
    if (/^(hi|hello|hey)\b/i.test(userText)) {
      return "Hi! I'm your AI appointment assistant. I can help you book, check availability, reschedule, or cancel appointments. What would you like to do?";
    }
    return "I can help you with booking, checking availability, rescheduling, or canceling appointments. Try saying something like \"Book me with Dr. Sarah next Tuesday at 10am\" or \"What's Dr. Chen's schedule?\"";
  }

  const res = results[0]?.result as any;

  switch (call.name) {
    case "checkDoctorAvailability": {
      if (res.error) return `Sorry, I couldn't check availability: ${res.error}`;
      if (!res.upcoming?.length) return `No upcoming appointments found${res.doctor !== "All doctors" ? ` for ${res.doctor}` : ""}.`;
      const lines = res.upcoming.map((a: any) => {
        const d = new Date(a.start_time);
        return `• ${d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} — ${a.patients?.name ?? "Open"} (${a.status})`;
      });
      return `Here are the upcoming slots${res.doctor !== "All doctors" ? ` for ${res.doctor}` : ""}:\n${lines.join("\n")}`;
    }
    case "getDoctorSchedule": {
      if (res.error) return res.error;
      if (!res.schedule?.length) return `${res.doctor} has no recurring weekly availability set.`;
      const lines = res.schedule.map((s: any) => `• ${s.day}: ${formatTime(s.from)} – ${formatTime(s.to)}`);
      return `Weekly schedule for ${res.doctor} (${res.specialty ?? "Specialist"}):\n${lines.join("\n")}`;
    }
    case "findNextAvailableSlot": {
      if (res.error) return res.error;
      if (!res.nextSlot) return `No available slot found${res.doctor !== "Any" ? ` for ${res.doctor}` : ""} in the next two weeks.`;
      const d = new Date(res.nextSlot);
      return `The next available slot${res.doctor !== "Any" ? ` for ${res.doctor}` : ""} is ${d.toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}. Would you like to book it?`;
    }
    case "createAppointment": {
      if (res.error) return `I couldn't book that: ${res.error}`;
      const d = new Date(res.appointment.start_time);
      return `Done! I've booked an appointment for ${res.patient} with ${res.doctor} on ${d.toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}. Status: ${res.appointment.status}.`;
    }
    case "getAppointment": {
      if (res.error) return res.error;
      if (!res.appointments?.length) return "No appointments found.";
      const lines = res.appointments.map((a: any) => {
        const d = new Date(a.start_time);
        return `• ${d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} — ${a.doctors?.name ?? "TBD"} (${a.status})${a.reason ? ` — ${a.reason}` : ""}`;
      });
      return `Here are the appointments I found:\n${lines.join("\n")}`;
    }
    case "updateAppointment": {
      if (res.error) return `I couldn't reschedule: ${res.error}`;
      const d = new Date(res.appointment.start_time);
      return `Rescheduled! The appointment is now on ${d.toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}.`;
    }
    case "cancelAppointment": {
      if (res.error) return `I couldn't cancel: ${res.error}`;
      return `Cancelled the appointment${res.appointment?.doctors?.name ? ` with ${res.appointment.doctors.name}` : ""}.`;
    }
    default:
      return "I processed your request.";
  }
}

function formatTime(t: string): string {
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ap = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ap}`;
}
