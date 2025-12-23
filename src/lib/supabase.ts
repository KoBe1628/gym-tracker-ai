import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// ⚠️ REPLACE THESE WITH YOUR KEYS FROM SUPABASE DASHBOARD
const supabaseUrl = "https://cebirxysiyxqpxafdvkz.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlYmlyeHlzaXl4cXB4YWZkdmt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3ODQwMTUsImV4cCI6MjA4MTM2MDAxNX0.EG7ox78N-ncU4lGfEa0ICqhZnsrM_4J1Ok7CNFMYFnc";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
