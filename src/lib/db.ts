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
        fetch: async (input, init) => {
          const read = !init?.method || init.method === "GET" || init.method === "HEAD";
          for (let attempt = 0; ; attempt++) {
            try {
              const response = await fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(12000) });
              if (!read || attempt >= 2 || (response.status < 500 && response.status !== 429)) return response;
            } catch (error) {
              if (!read || attempt >= 2) throw error;
            }
            await new Promise(resolve => setTimeout(resolve, 300 * 2 ** attempt));
          }
        },
      },
    },
  );
}
export function check(error: { message: string } | null) {
  if (error) throw new Error("Database operation failed");
}
