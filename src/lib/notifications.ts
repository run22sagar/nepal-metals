import "server-only";
import * as webpush from "web-push";
import { randomBytes } from "node:crypto";
import { db, check } from "./db";
import { alertsReady, decrypt, hash } from "./security";
import {
  dailyEligible,
  nepalDate,
  nepalHour,
  money,
  movement,
  type Price,
  type Metal,
} from "./domain";
export async function dispatchDaily(now = new Date()) {
  if (!alertsReady()) return { status: "unconfigured", accepted: 0, failed: 0 };
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  const client = db();
  const date = nepalDate(now);
  const hour = Math.min(
    23,
    Math.max(0, Number(process.env.ALERT_HOUR_NEPAL ?? 9)),
  );
  if (nepalHour(now) < hour)
    return { status: "before_daily_window", accepted: 0, failed: 0 };
  const records = await client.rpc("latest_nepal_rates");
  check(records.error);
  const prices = (records.data || []) as Price[];
  // Bounded job; subsequent runs continue with the next subscriptions. Unique delivery keys prevent repeated sends.
  let accepted = 0,
    failed = 0;
  const started = Date.now();
  while (Date.now() - started < 40000) {
    const subscriptions = await client.rpc("pending_daily_subscriptions", {
      p_date: date,
      p_limit: 100,
    });
    check(subscriptions.error);
    if (!subscriptions.data?.length) break;
    for (const subscription of subscriptions.data) {
      if (Date.now() - started >= 40000) break;
      const pref = subscription as { metals: Metal[] };
      if (!dailyEligible(prices, pref.metals, now, hour)) continue;
      const receipt = randomBytes(32).toString("base64url");
      const claim = await client
        .from("notification_deliveries")
        .insert({
          subscription_id: subscription.id,
          publication_date: date,
          kind: "daily",
          receipt_hash: hash(receipt),
        })
        .select("id")
        .single();
      if (claim.error?.code === "23505") continue;
      check(claim.error);
      if (!claim.data) continue;
      const body = pref.metals
        .map((metal) => {
          const rows = prices.filter((p) => p.metal === metal);
          const change = movement(rows[0].amount, rows[1]?.amount);
          return `${metal === "gold" ? "Fine gold" : "Silver"}: ${money(rows[0].amount)}/tola${change ? `. Change: ${change.amount >= 0 ? "+" : ""}${money(change.amount)} (${change.percent.toFixed(2)}%)` : ""}`;
        })
        .join(" · ");
      try {
        const payload = JSON.stringify({
          title: `Nepal reference prices · ${date}`,
          body,
          url: "/",
          tag: `nepal-prices-${date}`,
          receipt,
          deliveryId: claim.data.id,
        });
        const result = await webpush.sendNotification(
          decrypt<webpush.PushSubscription>(
            subscription.encrypted_subscription,
          ),
          payload,
          { TTL: 3600, timeout: 8000 },
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
              .eq("id", claim.data.id)
          ).error,
        );
        accepted++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // A timeout may have delivered. Never auto-retry ambiguous sends for the same day.
        check(
          (
            await client
              .from("notification_deliveries")
              .update({
                status: status ? "failed" : "unknown",
                provider_status: status || null,
                finished_at: new Date().toISOString(),
              })
              .eq("id", claim.data.id)
          ).error,
        );
        failed++;
        if (status === 404 || status === 410)
          check(
            (
              await client
                .from("push_subscriptions")
                .delete()
                .eq("id", subscription.id)
            ).error,
          );
      }
    }
  }
  return { status: "finished", accepted, failed };
}
