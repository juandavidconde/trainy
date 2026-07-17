"use client";

import { useEffect } from "react";

/** Centra horizontalmente el elemento activo (por id) dentro de su scroller. */
export default function ScrollActiveIntoView({ targetId }: { targetId: string }) {
  useEffect(() => {
    const el = document.getElementById(targetId);
    el?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [targetId]);
  return null;
}
