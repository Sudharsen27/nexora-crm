const CACHE_VERSION = "nexora-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/favicon.svg",
  "/nexora-logo.png",
  "/icon.svg",
];

const API_CACHE_PATTERNS = [
  /\/api\/v1\/tenants\/[^/]+\/dashboard/,
  /\/api\/v1\/tenants\/[^/]+\/leads/,
  /\/api\/v1\/tenants\/[^/]+\/contacts/,
  /\/api\/v1\/tenants\/[^/]+\/companies/,
  /\/api\/v1\/tenants\/[^/]+\/deals/,
  /\/api\/v1\/tenants\/[^/]+\/tasks/,
  /\/api\/v1\/tenants\/[^/]+\/notifications/,
  /\/api\/v1\/tenants\/[^/]+\/mobile/,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

function isApiRequest(url) {
  return API_CACHE_PATTERNS.some((pattern) => pattern.test(url.pathname));
}

function isImageRequest(request) {
  return request.destination === "image" || /\.(png|jpg|jpeg|webp|svg|gif)$/i.test(new URL(request.url).pathname);
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ offline: true, error: "Network unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin && !url.pathname.startsWith("/api/")) {
    if (isImageRequest(request)) {
      event.respondWith(cacheFirst(request, IMAGE_CACHE));
    }
    return;
  }

  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  if (
    request.mode === "navigate" ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    STATIC_ASSETS.includes(url.pathname)
  ) {
    event.respondWith(networkFirst(request, STATIC_CACHE));
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === "nexora-offline-sync") {
    event.waitUntil(
      self.clients.matchAll({ type: "window" }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: "BACKGROUND_SYNC" }));
      }),
    );
  }
});

self.addEventListener("push", (event) => {
  let data = { title: "Nexora CRM", body: "You have a new notification" };
  try {
    data = event.data ? event.data.json() : data;
  } catch {
    // ignore parse errors
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Nexora CRM", {
      body: data.body || "",
      icon: "/nexora-logo.png",
      badge: "/favicon.svg",
      data: data.data || {},
      tag: data.tag || "nexora-notification",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
