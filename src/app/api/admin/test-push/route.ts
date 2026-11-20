import * as webpush from "web-push";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db, check } from "@/lib/db";
import {
  admin,
  requireOrigin,
  readBody,
  errorResponse,
  alertsReady,
  HttpError,
  decrypt,
  hash,
  limit,
} from "@/lib/security";
import { nepalDate } from "@/lib/domain";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const user = await admin();
    await limit("testpush:" + user.id, 5, 3600);
    if (!alertsReady()) throw new HttpError(503, "Alerts not configured");
    const { subscription_id } = z
      .object({ subscription_id: z.string().uuid() })
      .parse(await readBody(request));
    const client = db();
    const subscription = await client
      .from("push_subscriptions")
      .select("encrypted_subscription")
      .eq("id", subscription_id)
      .single();
    check(subscription.error);
    const receipt = randomBytes(32).toString("base64url");
    const delivery = await client
      .from("notification_deliveries")
      .insert({
        subscription_id,
        publication_date: nepalDate(),
        kind: "test-" + randomBytes(8).toString("hex"),
        receipt_hash: hash(receipt),
      })
      .select("id")
      .single();
    check(delivery.error);
    if (!delivery.data || !subscription.data)
      throw new HttpError(404, "Subscription not found");
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );
    try {
      const result = await webpush.sendNotification(
        decrypt<webpush.PushSubscription>(
          subscription.data.encrypted_subscription,
        ),
        JSON.stringify({
          title: "Nepal Metals — delivery test",
          body: "This is a requested test notification, not a price update.",
          url: "/",
          tag: "test-" + delivery.data.id,
          deliveryId: delivery.data.id,
          receipt,
        }),
        { TTL: 300, timeout: 8000 },
      );
      check(
        (
          await client
            .from("notification_deliveries")
            .update({
              status: "accepted",
              provider_status: result.statusCode,
              finished_at: new Date().toISOString(),
            })
            .eq("id", delivery.data.id)
        ).error,
      );
      return Response.json({
        status: "accepted",
        id: delivery.data.id,
        message:
          "Push service accepted the message. Check the device and received_at before claiming delivery.",
      });
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      await client
        .from("notification_deliveries")
        .update({
          status: status ? "failed" : "unknown",
          provider_status: status || null,
          finished_at: new Date().toISOString(),
        })
        .eq("id", delivery.data.id);
      throw new HttpError(
        502,
        "Push test was not confirmed. Check delivery logs.",
      );
    }
  } catch (error) {
    return errorResponse(error);
  }
}
