import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
export function databaseReady() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
export function db() {
  if (!databaseReady()) throw new Error("Database is not configured");
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(12000) }),
      },
    },
  );
}
export function check(error: { message: string } | null) {
  if (error) throw new Error("Database operation failed");
}
