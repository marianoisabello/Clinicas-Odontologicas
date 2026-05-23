import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://nkbuaackfoxttwfywvjk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rYnVhYWNrZm94dHR3Znl3dmprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTI4NTcsImV4cCI6MjA5MzU4ODg1N30.iKbmqxWYi1PHAAfAnjKja8Qg5OLVz2tNqcW1eF2jm90";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});
