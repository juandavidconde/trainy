// Service worker de Trainy.
//
// El manifest declaraba `display: standalone` y la app se instalaba en la
// pantalla de inicio como si fuera nativa — pero no había ningún service
// worker registrado. En el sótano donde está el rack de sentadillas, sin
// señal, lo que aparecía era el error del navegador.
//
// REGLA DE SEGURIDAD: no se cachea NUNCA el HTML de las páginas ni las
// respuestas de la API. Todas las rutas son por usuario y servir una copia
// cacheada podría mostrarle a un atleta el entrenamiento de otro. Solo se
// cachean los assets estáticos, que son iguales para todos y llevan hash en
// el nombre.

const VERSION = "trainy-v1";
const STATIC_CACHE = `${VERSION}-static`;
const OFFLINE_URL = "/offline.html";

const PRECACHE = [OFFLINE_URL, "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

/** Assets con hash en el nombre: inmutables, cache-first sin riesgo. */
function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    /\.(?:css|js|woff2?|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Nunca tocar la API: son datos por usuario y algunos endpoints hacen stream.
  if (url.pathname.startsWith("/api/")) return;

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // Navegación: siempre red. Si no hay red, la pantalla de offline —
  // que explica qué pasa y aclara que lo registrado no se perdió.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((hit) => hit ?? Response.error())
      )
    );
  }
});
