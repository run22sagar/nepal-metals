import { z } from "zod";
import { db, check } from "@/lib/db";
import { hash, readBody, errorResponse } from "@/lib/security";
export async function POST(request: Request) {
  try {
    const data = z
      .object({
        deliveryId: z.string().uuid(),
        receipt: z.string().min(40).max(64),
      })
      .parse(await readBody(request));
    check(
      (
        await db()
          .from("notification_deliveries")
          .update({ received_at: new Date().toISOString() })
          .eq("id", data.deliveryId)
          .eq("receipt_hash", hash(data.receipt))
          .is("received_at", null)
      ).error,
    );
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
