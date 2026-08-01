"use client";

import { useEffect } from "react";
import { positionCookie } from "@/lib/position";

/**
 * Recuerda en qué semana y sesión está el atleta, para que /today sin
 * parámetros (el PWA, el link "Hoy", volver desde Historial) arranque ahí.
 * Escribe la cookie directo desde el cliente: sin server action, sin round-trip.
 */
export default function RememberPosition({
  planId,
  week,
  session,
}: {
  planId: string;
  week: number;
  session: string;
}) {
  useEffect(() => {
    document.cookie = positionCookie({
      planId,
      week,
      session,
      ts: Date.now(),
    });
  }, [planId, week, session]);

  return null;
}
