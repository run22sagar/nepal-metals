import { revalidateTag } from "next/cache";
import { randomUUID } from "node:crypto";
import { db, check } from "@/lib/db";
import { requireCron, errorResponse } from "@/lib/security";
import { ingestSpot, ingestNews } from "@/lib/providers";
import { dispatchDaily } from "@/lib/notifications";
import { ingestNepal } from "@/lib/nepal-provider";
export const maxDuration = 120;
export async function GET(request: Request) {
  let owner: string | undefined;
  try {
    requireCron(request);
    owner = randomUUID();
    const client = db();
    const lease = await client.rpc("acquire_job", {
      p_name: "market-job",
      p_owner: owner,
      p_seconds: 180,
    });
    check(lease.error);
    if (!lease.data) return Response.json({ status: "already_running" });
    const nepal = await ingestNepal();
    const spot = await ingestSpot();
    const news = await ingestNews();
    const notifications = await dispatchDaily();
    const cutoff = new Date(Date.now() - 90 * 86400000).toISOString();
    for (const table of ["ingestion_logs", "notification_deliveries"])
      check((await client.from(table).delete().lt("created_at", cutoff)).error);
    check(
      (
        await client
          .from("rate_limits")
          .delete()
          .lt("window_start", new Date(Date.now() - 2 * 86400000).toISOString())
      ).error,
    );
    revalidateTag("public-market", { expire: 0 });
    return Response.json({
      nepal,
      spot,
      news,
      notifications,
      ran_at: new Date().toISOString(),
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    if (owner) {
      try {
        await db()
          .from("job_locks")
          .delete()
          .eq("name", "market-job")
          .eq("owner", owner);
      } catch {
        /* Lease expires if cleanup fails. */
      }
    }
  }
}
