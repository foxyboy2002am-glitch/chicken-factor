import { createClient } from "@supabase/supabase-js";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function createSupabaseAdminClient() {
  let runtimeEnv: { NEXT_PUBLIC_SUPABASE_URL?: string; SUPABASE_SERVICE_ROLE_KEY?: string } = {};
  try {
    const context = await getCloudflareContext({ async: true });
    runtimeEnv = context.env as typeof runtimeEnv;
  } catch {
    // Local Next.js runtime can use process.env; Cloudflare uses runtime bindings.
  }
  const url = runtimeEnv.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = runtimeEnv.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server-side Supabase admin credentials are not configured.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
