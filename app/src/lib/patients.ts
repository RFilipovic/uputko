import { z } from "zod";
import { db } from "@/lib/db/server";

const Doctor = z.object({
  role: z.enum(["obiteljski", "stomatolog", "ginekolog", "pedijatar"]),
  practitioner_id: z.string(),
  full_name: z.string(),
  provider_name: z.string().nullable(),
  institution_id: z.string(),
  institution_name: z.string(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  phone: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
});

const Profile = z.object({
  id: z.string(),
  name: z.string(),
  birth_year: z.number(),
  home_city: z.string(),
  email: z.string().nullable(),
  note: z.string().nullable(),
  home_lat: z.number().nullable(),
  home_lng: z.number().nullable(),
  doctors: z.array(Doctor),
});

export type PatientProfile = z.infer<typeof Profile>;
export type ChosenDoctor = z.infer<typeof Doctor>;

export async function getPatientProfile(patientId: string): Promise<PatientProfile | null> {
  const { data, error } = await db().rpc("patient_profile", { p_patient_id: patientId });
  if (error) throw new Error(`patient profile: ${error.message}`);
  return data ? Profile.parse(data) : null;
}

export const ROLE_LABEL: Record<ChosenDoctor["role"], string> = {
  obiteljski: "obiteljski liječnik",
  stomatolog: "stomatolog",
  ginekolog: "ginekolog",
  pedijatar: "pedijatar",
};
