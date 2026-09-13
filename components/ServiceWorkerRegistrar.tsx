"use client";

import { useEffect } from "react";

/**
 * Registra el service worker.
 *
 * El manifest ya declaraba `display: standalone` — la app se instalaba en la
 * pantalla de inicio y se veía nativa — pero no había ningún service worker,
 * así que sin señal mostraba el error del navegador.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // En desarrollo estorba: cachea assets que cambian en cada recarga.
    if (process.env.NODE_ENV !== "production") return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* si falla, la app sigue funcionando exactamente como antes */
      });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
