import { revalidateTag } from "next/cache";
import { z } from "zod";
import { db, check } from "@/lib/db";
import {
  admin,
  requireOrigin,
  readBody,
  errorResponse,
  limit,
} from "@/lib/security";
import { nepalDate } from "@/lib/domain";
const schema = z
  .object({
    metal: z.enum(["gold", "silver"]),
    amount: z.number().finite().positive().max(99999999),
    publication_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    published_at: z.string().datetime({ offset: true }),
    source_url: z
      .string()
      .url()
      .max(2048)
      .refine((url) => {
        const u = new URL(url);
        return (
          u.protocol === "https:" &&
          ["fenegosida.org", "www.fenegosida.org"].includes(u.hostname) &&
          !u.username &&
          !u.password &&
          !u.port
        );
      }),
    reason: z.string().trim().min(10).max(2000),
    verified: z.literal(true),
  })
  .refine(
    (data) =>
      Date.parse(data.published_at) <= Date.now() &&
      data.publication_date === nepalDate(new Date(data.published_at)),
    {
      message: "Publication date must match the source timestamp in Nepal time",
    },
  );
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const user = await admin();
    await limit("publish:" + user.id, 120);
    const data = schema.parse(await readBody(request));
    const result = await db().rpc("publish_nepal_rate", {
      p_actor: user.id,
      p_metal: data.metal,
      p_amount: data.amount,
      p_publication_date: data.publication_date,
      p_published_at: data.published_at,
      p_source_url: data.source_url,
      p_reason: data.reason,
    });
    check(result.error);
    revalidateTag("public-market", { expire: 0 });
    return Response.json({ id: result.data, ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
