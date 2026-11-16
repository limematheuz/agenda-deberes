// Service worker de CalendarAppio: caché offline para abrir la PWA sin red + notificaciones push.
const CACHE_NAME = "__CALENDARAPPIO_CACHE_VERSION__";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/brand/calendarappio-logo.svg",
  "/brand/calendarappio-logo.svg?v=3",
  "/assets/bg-gradient-light.jpg",
  "/assets/bg-gradient-dark.jpg",
  "/assets/noise.svg",
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
// __BUILD_ASSETS_INJECT__

self.addEventListener("install", (event) => {
  const activos = Array.from(new Set([...CORE_ASSETS, ...(self.__BUILD_ASSETS || [])]));
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(
          activos.map((url) =>
            cache.add(new Request(url, { cache: "reload" })).catch(() => undefined),
          ),
        ),
      )
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

async function fetchConTimeout(req, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(req, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // No cachear peticiones a Supabase ni APIs dinámicas; las gestiona la cola offline de la app
  if (url.hostname.endsWith("supabase.co") || url.pathname.startsWith("/rest/") || url.pathname.startsWith("/auth/")) {
    return;
  }

  // Navegación (HTML principal): Network-first con timeout corto y fallback instantáneo a caché offline
  if (req.mode === "navigate") {
    event.respondWith(
      fetchConTimeout(req, 2500)
        .then((res) => {
          if (res && res.ok) {
            const copy1 = res.clone();
            const copy2 = res.clone();
            void caches.open(CACHE_NAME).then((cache) => Promise.all([
              cache.put("/", copy1),
              cache.put("/index.html", copy2),
            ]));
          }
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (
            (await cache.match(req, { ignoreSearch: true })) ||
            (await cache.match("/")) ||
            (await cache.match("/index.html")) ||
            Response.error()
          );
        }),
    );
    return;
  }

  // Assets estáticos del mismo origen o Google Fonts: Stale-While-Revalidate seguro
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
          .catch(() => null);

        if (cached) {
          void networkPromise;
          return cached;
        }

        const red = await networkPromise;
        if (red) return red;
        if (esFuente && url.hostname === "fonts.googleapis.com") {
          return new Response("", { status: 200, headers: { "Content-Type": "text/css" } });
        }
        return Response.error();
      }),
    );
  }
});

// Notificaciones push
self.addEventListener("push", (event) => {
  let d = {};
  if (event.data) {
    try {
      d = event.data.json();
    } catch {
      try {
        d = { body: event.data.text() };
      } catch {
        /* payload vacío */
      }
    }
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
