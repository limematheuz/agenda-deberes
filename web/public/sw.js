// Service worker de CalendarAppio: caché offline para abrir la PWA sin red + notificaciones push.
const CACHE_NAME = "calendarappio-shell-v4";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/brand/calendarappio-logo.svg",
  "/brand/calendarappio-logo.svg?v=3",
  "/icon-192.png",
  "/icon-192.png?v=5",
  "/notification-icon.png",
  "/notification-icon.png?v=5",
  "/badge-96.png",
  "/badge-96.png?v=5",
  "/icon-512.png",
  "/icon-512.png?v=5",
  "/icon-512-maskable.png",
  "/icon-512-maskable.png?v=5",
  "/apple-touch-icon.png",
  "/apple-touch-icon.png?v=3",
  "/favicon.png",
  "/favicon.png?v=3",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("calendarappio-") && k !== CACHE_NAME)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // No cachear peticiones a Supabase ni APIs dinámicas; las gestiona la cola offline de la app
  if (url.hostname.endsWith("supabase.co") || url.pathname.startsWith("/rest/") || url.pathname.startsWith("/auth/")) {
    return;
  }

  // Navegación (HTML principal): Network-first con fallback a caché para abrir la PWA offline
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put("/", copy));
          }
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match(req)) || (await cache.match("/")) || (await cache.match("/index.html"));
        }),
    );
    return;
  }

  // Assets estáticos del mismo origen o Google Fonts: Stale-While-Revalidate
  const esMismoOrigen = url.origin === self.location.origin;
  const esFuente = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";

  if (esMismoOrigen || esFuente) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req);
        const networkPromise = fetch(req)
          .then((res) => {
            if (res && (res.ok || res.type === "opaque")) {
              void cache.put(req, res.clone());
            }
            return res;
          })
          .catch(() => cached);

        return cached || networkPromise;
      }),
    );
  }
});

// Notificaciones push
self.addEventListener("push", (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch {
    /* payload no JSON */
  }
  const base = self.location.origin;
  event.waitUntil(
    self.registration.showNotification(d.title || "CalendarAppio", {
      body: d.body || "",
      icon: `${base}/notification-icon.png?v=5`,
      badge: `${base}/badge-96.png?v=5`,
      tag: d.tag || "calendarappio",
      renotify: true,
      vibrate: [180, 80, 180],
      data: { url: d.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
      for (const c of cs) if ("focus" in c) return c.focus();
      return self.clients.openWindow(url);
    }),
  );
});
