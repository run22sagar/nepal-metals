/* Prices and API responses are deliberately not cached by the service worker. */
const CACHE = "nepal-metals-shell-v1";
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(["/offline.html", "/icons/icon-192.png"])));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate" && event.request.method === "GET" &&
      !new URL(event.request.url).pathname.startsWith("/admin")) {
    event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html")));
  }
});
self.addEventListener("push", (event) => {
  let data;
  try { data = event.data.json(); if (!data || typeof data !== "object") throw new Error("Invalid push"); }
  catch { data = { title: "Nepal Metals", body: "Open the app to view published prices." }; }
  event.waitUntil((async () => {
    await self.registration.showNotification(data.title || "Nepal Metals", {
      body: data.body || "", icon: "/icons/icon-192.png", badge: "/icons/icon-192.png",
      tag: data.tag || "nepal-metals", data: { url: "/" },
    });
    if (data.deliveryId && data.receipt) {
      try {
        await fetch("/api/push-receipt", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deliveryId: data.deliveryId, receipt: data.receipt }),
        });
      } catch { /* A missing receipt never means delivery was verified. */ }
    }
  })());
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const window of windows) {
      if (new URL(window.url).origin === self.location.origin) {
        await window.navigate("/");
        return window.focus();
      }
    }
    return self.clients.openWindow("/");
  })());
});
