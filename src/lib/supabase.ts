import { createClient } from '@supabase/supabase-js';
import { labConfig } from '../config/labs';

export const supabase = createClient(labConfig.supabaseUrl, labConfig.supabaseAnonKey);
