import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db, check, databaseReady } from "@/lib/db";
import {
  requireOrigin,
  readBody,
  errorResponse,
  alertsReady,
  pushEndpoint,
  HttpError,
  limit,
  hash,
  encrypt,
} from "@/lib/security";
const schema = z.object({
  subscription: z.object({
    endpoint: z.string().url().max(2048).refine(pushEndpoint),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({
      p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}=?$/),
      auth: z
        .string()
        .regex(/^[A-Za-z0-9_-]{22}==?$/)
        .or(z.string().regex(/^[A-Za-z0-9_-]{22}$/)),
    }),
  }),
  metals: z
    .array(z.enum(["gold", "silver"]))
    .min(1)
    .max(2)
    .transform((a) => [...new Set(a)]),
  daily: z.boolean(),
  consent: z.literal(true),
});
export async function GET() {
  try {
    if (!databaseReady()) return Response.json({ subscribed: false });
    const token = (await cookies()).get("nm_device")?.value;
    if (!token) return Response.json({ subscribed: false });
    const client = db();
    const result = await client
      .from("push_subscriptions")
      .select("id")
      .eq("device_hash", hash(token))
      .maybeSingle();
    check(result.error);
    if (!result.data) return Response.json({ subscribed: false });
    const preferences = await client
      .from("notification_preferences")
      .select("metals,daily")
      .eq("subscription_id", result.data.id)
      .single();
    check(preferences.error);
    return Response.json({ subscribed: true, ...preferences.data });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    if (!alertsReady() || !databaseReady())
      throw new HttpError(503, "Alerts are not configured");
    const data = schema.parse(await readBody(request));
    const jar = await cookies();
    const existing = jar.get("nm_device")?.value;
    const token = existing || randomBytes(32).toString("base64url");
    const ip =
      request.headers.get("x-vercel-forwarded-for")?.split(",")[0] || "local";
    await limit("subscribe-ip:" + ip, 30);
    await limit("subscribe-device:" + token, 20);
    const result = await db().rpc("save_subscription", {
      p_device: hash(token),
      p_endpoint: hash(data.subscription.endpoint),
      p_encrypted: encrypt(data.subscription),
      p_metals: data.metals,
      p_daily: data.daily,
    });
    check(result.error);
    jar.set("nm_device", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 365 * 86400,
    });
    return Response.json({ subscribed: true });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(request: Request) {
  try {
    requireOrigin(request);
    const jar = await cookies();
    const token = jar.get("nm_device")?.value;
    if (token)
      check(
        (
          await db()
            .from("push_subscriptions")
            .delete()
            .eq("device_hash", hash(token))
        ).error,
      );
    jar.delete("nm_device");
    return Response.json({ subscribed: false });
  } catch (error) {
    return errorResponse(error);
  }
}
