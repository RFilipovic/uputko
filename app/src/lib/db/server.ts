import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";
import type { Database } from "./types";

export type Db = SupabaseClient<Database>;
let client: Db | null = null;

/**
 * Service-role client: bypasses RLS. Import ONLY from server code
 * (route handlers, server components). Never ship it to the browser.
 */
export function db(): Db {
  if (!client) {
    const env = serverEnv();
    client = createClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
  }
  return client;
}

/** Unwrap a Supabase response or throw. */
export function must<T>(
  res: { data: T; error: { message: string } | null },
  what: string,
): NonNullable<T> {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  if (res.data === null || res.data === undefined)
    throw new Error(`${what}: not found`);
  return res.data as NonNullable<T>;
}
