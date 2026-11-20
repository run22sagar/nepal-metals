import { revalidateTag } from "next/cache";
import { z } from "zod";
import { db, check } from "@/lib/db";
import { admin, requireOrigin, readBody, errorResponse } from "@/lib/security";
import { approvedFeed } from "@/lib/providers";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const user = await admin();
    const data = z
      .object({
        name: z.string().trim().min(2).max(100),
        url: z.string().url().max(2048).refine(approvedFeed),
        category: z.enum(["Nepal", "Gold", "Silver", "Oil", "Global Markets"]),
        terms_url: z
          .string()
          .url()
          .max(2048)
          .refine((v) => new URL(v).protocol === "https:"),
        permission_note: z.string().trim().min(20).max(2000),
        enabled: z.boolean(),
      })
      .parse(await readBody(request));
    const result = await db().rpc("save_news_source", {
      p_actor: user.id,
      p_name: data.name,
      p_url: data.url,
      p_category: data.category,
      p_terms_url: data.terms_url,
      p_permission: data.permission_note,
      p_enabled: data.enabled,
    });
    check(result.error);
    revalidateTag("public-market", { expire: 0 });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
