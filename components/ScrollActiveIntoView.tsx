"use client";

import { useEffect } from "react";

/**
 * Centra horizontalmente el elemento activo (por id) dentro de su carrusel.
 *
 * No usa `scrollIntoView`: ese método también ajusta el scroll vertical de los
 * ancestros, así que al abrir /today la página daba un salto y perdías de vista
 * dónde estabas. Acá solo se toca `scrollLeft` del contenedor marcado con
 * `data-hscroll`.
 */
export default function ScrollActiveIntoView({ targetId }: { targetId: string }) {
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const scroller = el.closest<HTMLElement>("[data-hscroll]");
    if (!scroller) return;

    const target = el.getBoundingClientRect();
    const box = scroller.getBoundingClientRect();
    const delta = target.left - box.left - (box.width - target.width) / 2;
    scroller.scrollLeft += delta;
  }, [targetId]);

  return null;
}
