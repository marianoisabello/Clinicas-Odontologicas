import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://dfnlcmuobvphevyshzqm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmbmxjbXVvYnZwaGV2eXNoenFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzE2MTEsImV4cCI6MjA5NDAwNzYxMX0.TPfyKFaWIyND5URIGFygGXF6Se9fotd9lQgeKrl3fpY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});
