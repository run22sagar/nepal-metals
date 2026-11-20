"use client";
import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Bell, X, Check, Smartphone } from "lucide-react";
import { Button } from "./ui/button";
import { copy, type Locale } from "@/lib/i18n";
export function Alerts({
  locale,
  configured,
  publicKey,
}: {
  locale: Locale;
  configured: boolean;
  publicKey: string;
}) {
  const t = copy[locale];
  const [open, setOpen] = useState(false),
    [metals, setMetals] = useState("both"),
    [daily, setDaily] = useState(true),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [subscribed, setSubscribed] = useState(false);
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  useEffect(() => {
    if (open && configured)
      fetch("/api/subscriptions", { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
          if (data.subscribed) {
            setSubscribed(true);
            setMetals(data.metals.length === 2 ? "both" : data.metals[0]);
            setDaily(data.daily);
          }
        })
        .catch(() => setMessage("Could not load preferences."));
  }, [open, configured]);
  async function subscribe() {
    setBusy(true);
    setMessage("");
    try {
      if (
        !("Notification" in window) ||
        !("PushManager" in window) ||
        !("serviceWorker" in navigator)
      )
        throw new Error(t.iphone);
      const permission = await Notification.requestPermission();
      if (permission !== "granted")
        throw new Error(
          "Notifications are not allowed. You can change this in browser settings.",
        );
      await navigator.serviceWorker.register("/sw.js");
      const registration = await navigator.serviceWorker.ready;
      const padding = "=".repeat((4 - (publicKey.length % 4)) % 4),
        raw = atob((publicKey + padding).replace(/-/g, "+").replace(/_/g, "/"));
      const key = Uint8Array.from(raw, (c) => c.charCodeAt(0));
      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        }));
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          metals: metals === "both" ? ["gold", "silver"] : [metals],
          daily,
          consent: true,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSubscribed(true);
      setMessage(
        locale === "en"
          ? "Preferences saved. Daily alerts wait for today’s verified publication."
          : "प्राथमिकता सुरक्षित भयो। आजको प्रमाणित प्रकाशनपछि सूचना पठाइनेछ।",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Subscription failed",
      );
    } finally {
      setBusy(false);
    }
  }
  async function unsubscribe() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/subscriptions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok)
        throw new Error(
          "Could not remove the server subscription. Please try again.",
        );
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration("/");
        await (
          await registration?.pushManager.getSubscription()
        )?.unsubscribe();
      }
      setSubscribed(false);
      setMessage("This device is unsubscribed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unsubscribe failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="alerts-banner" id="alerts">
      <div className="alert-art" aria-hidden="true">
        <span />
        <span />
        <div>
          <Bell size={31} />
        </div>
      </div>
      <div className="alerts-copy">
        <span className="eyebrow">
          {locale === "en" ? "STAY IN THE KNOW" : "जानकारीमा रहनुहोस्"}
        </span>
        <h2>{t.alertsTitle}</h2>
        <p>{t.alertsBody}</p>
        <small>{t.alertsNote}</small>
      </div>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <Button>
            <Bell size={17} />
            {t.alerts}
          </Button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content">
            <Dialog.Close className="dialog-close" aria-label="Close">
              <X size={20} />
            </Dialog.Close>
            <span className="utility-icon">
              <Bell size={25} />
            </span>
            <Dialog.Title>{t.alerts}</Dialog.Title>
            <Dialog.Description>{t.alertExplain}</Dialog.Description>
            <div className="form-grid">
              <label className="span-2">
                {locale === "en" ? "Notify me about" : "सूचनाको विषय"}
                <select
                  value={metals}
                  onChange={(e) => setMetals(e.target.value)}
                >
                  <option value="both">{t.both}</option>
                  <option value="gold">{t.gold}</option>
                  <option value="silver">{t.silver}</option>
                </select>
              </label>
              <label className="checkbox-label span-2">
                <input
                  type="checkbox"
                  checked={daily}
                  onChange={(e) => setDaily(e.target.checked)}
                />
                {t.daily}
              </label>
            </div>
            <p className="phone-note">
              <Smartphone size={20} />
              {t.iphone}
            </p>
            {!configured && (
              <p className="notice">
                {locale === "en"
                  ? "Alerts are not available yet. Subscriptions open once delivery is configured."
                  : "सूचना सेवा अझै उपलब्ध छैन। सेवा तयार भएपछि सदस्यता खुल्नेछ।"}
              </p>
            )}
            <Button disabled={!configured || busy} onClick={subscribe}>
              {busy ? (
                "…"
              ) : subscribed ? (
                <>
                  <Check size={16} />
                  {t.save}
                </>
              ) : (
                t.subscribe
              )}
            </Button>
            {subscribed && (
              <Button variant="outline" disabled={busy} onClick={unsubscribe}>
                {t.unsubscribe}
              </Button>
            )}
            <p role="status" className="form-message">
              {message}
            </p>
            <a
              className="small-link"
              href={locale === "ne" ? "/ne/privacy" : "/privacy"}
            >
              {t.privacy}
            </a>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
