import "server-only";
import { createClient } from "@supabase/supabase-js";

// Klien dengan secret key: melewati RLS. Hanya dipakai di server.
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
