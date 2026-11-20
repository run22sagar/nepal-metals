import { db, databaseReady } from "@/lib/db";
export async function GET() {
  if (!databaseReady())
    return Response.json({ status: "configuration_required" }, { status: 503 });
  try {
    const { error } = await db().from("metals").select("code").limit(1);
    if (error) throw error;
    return Response.json({ status: "ok", time: new Date().toISOString() });
  } catch {
    return Response.json({ status: "degraded" }, { status: 503 });
  }
}
