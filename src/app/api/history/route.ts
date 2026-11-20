import { z } from "zod";
import { db, check, databaseReady } from "@/lib/db";
import { errorResponse, HttpError } from "@/lib/security";
const cursorSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  id: z.string().uuid(),
});
export async function GET(request: Request) {
  try {
    if (!databaseReady())
      throw new HttpError(503, "Verified history is not available yet");
    const url = new URL(request.url);
    const date = url.searchParams.get("before_date"),
      id = url.searchParams.get("before_id");
    let query = db()
      .from("price_observations")
      .select(
        "id,metal,amount,publication_date,published_at,fetched_at,source_name,source_url,verification_status,purity,revision",
      )
      .eq("verification_status", "verified")
      .order("publication_date", { ascending: false })
      .order("id", { ascending: false })
      .limit(1000);
    if (date || id) {
      const cursor = cursorSchema.parse({ date, id });
      query = query.or(
        `publication_date.lt.${cursor.date},and(publication_date.eq.${cursor.date},id.lt.${cursor.id})`,
      );
    }
    const result = await query;
    check(result.error);
    const records = result.data || [];
    const last = records.at(-1);
    return Response.json({
      records,
      next:
        records.length === 1000 && last
          ? { date: last.publication_date, id: last.id }
          : null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
