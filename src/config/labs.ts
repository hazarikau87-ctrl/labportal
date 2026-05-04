export interface LabConfig {
  id: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export const ACTIVE_LAB_ID = "a891a8ee-ff02-496d-a8e2-6d851f8d5994";

export const labConfig: LabConfig = {
  id: ACTIVE_LAB_ID,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
};
