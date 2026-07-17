// Colores de sesión — tokens "Volt". Se resuelven por nombre de sesión;
// si la sesión no matchea ningún nombre conocido, cae al color guardado
// en el plan y por último al acento.
const SESSION_COLORS: Record<string, string> = {
  PUSH: "#FF9A4D",
  PULL: "#45D0E8",
  LEGS: "#A08BFF",
  PIERNA: "#A08BFF",
  UPPER: "#F27DB8",
  LOWER: "#E5D054",
  FULL: "#4DDFC0",
  FULLBODY: "#4DDFC0",
};

export function sessionColor(name: string, dbColor?: string | null): string {
  const key = name.trim().toUpperCase().replace(/[\s_-]+/g, "");
  for (const [k, v] of Object.entries(SESSION_COLORS)) {
    if (key === k || key.startsWith(k)) return v;
  }
  return dbColor ? `#${dbColor}` : "#C8F169";
}

/** Estilo para chips/tabs de sesión: color al 12% de fondo, 35% de borde. */
export function sessionChipStyle(color: string, active: boolean) {
  return active
    ? {
        color,
        backgroundColor: `${color}1F`, // ~12%
        borderColor: `${color}59`, // ~35%
      }
    : undefined;
}
