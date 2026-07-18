import { createClient } from "@supabase/supabase-js";

// Server-side client using the service role key — bypasses RLS for cache writes.
// Only use this in API routes / server components, never expose to the client.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
