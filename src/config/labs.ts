export interface LabConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

// We remove ACTIVE_LAB_ID entirely because it will now come from the URL/Database
export const labConfig: LabConfig = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
};
