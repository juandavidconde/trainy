// Autorización de tratamiento de datos personales — Ley 1581 de 2012 y
// Decreto 1377 de 2013 (Colombia).
//
// Fuente única: la política se escribe acá una vez y la leen la página pública
// /legal, el paso del onboarding y el aviso de Ajustes. Si el texto vive en dos
// lados, tarde o temprano alguien acepta una versión que ya no existe.
//
// ⚠️ Redactado cubriendo los elementos que la ley exige, no por un abogado.
// Antes de dejarlo definitivo en producción conviene que lo revise uno —
// Trainy trata datos de salud, que son categoría sensible.

/**
 * Versión de la política. Subirla invalida los consentimientos anteriores:
 * quien había aceptado vuelve a ver el aviso. Formato AAAA-MM-DD del día en
 * que cambió el texto.
 */
export const CONSENT_VERSION = "2026-08-29";

/**
 * Responsable del tratamiento. El Art. 12 de la Ley 1581 y el Art. 13 del
 * Decreto 1377 piden identidad, domicilio, dirección, correo y teléfono.
 *
 * ⚠️ Esto se renderiza en /legal, que es una página PÚBLICA e indexable. Si
 * más adelante se prefiere no exponer la dirección exacta, borrar `direccion`
 * y dejar solo `ciudad`: la página omite lo que esté vacío y el canal formal
 * para ejercer derechos sigue siendo el correo.
 */
export const RESPONSABLE = {
  nombre: "Juan David Conde",
  calidad: "Persona natural",
  email: "juandavidconde@gmail.com",
  direccion: "Calle 95 # 9a-42, Apto 201, Edificio Siegerkranz",
  ciudad: "Bogotá, Colombia",
  telefono: "+57 311 339 6780",
};

export interface PolicySection {
  id: string;
  title: string;
  /** Párrafos. Una línea que empieza con "- " se pinta como viñeta. */
  body: string[];
}

/** Los datos sensibles que trata la app, nombrados uno por uno. */
export const DATOS_SENSIBLES = [
  "Edad y sexo",
  "Peso y estatura",
  "Lesiones, molestias y limitaciones físicas",
  "Marcas de fuerza y registros de entrenamiento",
];

export const POLICY: PolicySection[] = [
  {
    id: "responsable",
    title: "Quién trata tus datos",
    body: [
      `El responsable del tratamiento es **${RESPONSABLE.nombre}**, persona natural, quien opera Trainy como herramienta de acompañamiento de entrenamiento.`,
      `- Domicilio: ${[RESPONSABLE.direccion, RESPONSABLE.ciudad].filter(Boolean).join(", ")}`,
      `- Correo: ${RESPONSABLE.email}`,
      `- Teléfono: ${RESPONSABLE.telefono}`,
      `El canal oficial para cualquier asunto relacionado con tus datos —consultas, reclamos, revocación— es el correo ${RESPONSABLE.email}. Es el que se atiende dentro de los plazos de ley.`,
    ],
  },
  {
    id: "datos",
    title: "Qué datos recogemos",
    body: [
      "**Datos de identificación:** tu nombre y tu correo electrónico. El correo es además con lo que entrás a la app.",
      "**Datos de salud y condición física**, que la Ley 1581 de 2012 clasifica como datos sensibles:",
      ...DATOS_SENSIBLES.map((d) => `- ${d}`),
      "**Datos de uso:** las series, repeticiones, pesos, RPE y comentarios que registrás en cada sesión, y las conversaciones que tengas con el Coach IA dentro de la app.",
      "No recogemos datos de ubicación, ni datos financieros, ni información de tus contactos.",
    ],
  },
  {
    id: "sensibles",
    title: "Sobre los datos sensibles — no estás obligado a darlos",
    body: [
      "**Tenés derecho a NO autorizar el tratamiento de tus datos sensibles.** La ley es explícita: nadie puede obligarte a entregarlos, y no responder esas preguntas no puede usarse en tu contra.",
      "Ahora, siendo honestos con vos sobre la consecuencia: sin tu peso, tu edad y sobre todo tus lesiones, no es posible diseñarte un plan seguro ni calcular los pesos de arranque. Un plan armado a ciegas sobre una rodilla lastimada es peor que no tener plan. Si preferís no entregarlos, escribinos y vemos qué se puede hacer por fuera de la app.",
      "Los datos de salud que registrás son para diseñar y ajustar tu entrenamiento. No se usan para ninguna otra cosa.",
    ],
  },
  {
    id: "finalidad",
    title: "Para qué los usamos",
    body: [
      "- Diseñar tu bloque de entrenamiento y elegir ejercicios compatibles con tus lesiones",
      "- Calcular tus pesos de arranque y tu progresión semana a semana",
      "- Mostrarte tu progreso, tus récords y tu adherencia",
      "- Que tu coach pueda hacerte seguimiento y ajustar el plan",
      "- Que el Coach IA de la app responda tus preguntas con tu contexto real",
      "Ninguna otra. No vendemos tus datos, no los usamos para publicidad y no los compartimos con terceros distintos de los que se listan abajo.",
    ],
  },
  {
    id: "terceros",
    title: "Con quién se comparten",
    body: [
      "Para que la app funcione, tus datos pasan por tres manos además de la nuestra:",
      "- **Tu coach.** Ve tu perfil, tu plan y tus registros. Es el punto del servicio.",
      "- **Railway**, el proveedor donde vive la aplicación y la base de datos. Servidores fuera de Colombia.",
      "- **Anthropic**, el proveedor del modelo de inteligencia artificial. Cuando usás el Coach IA o cuando se genera tu plan, tu perfil y tus registros se envían a su API para producir la respuesta. Servidores fuera de Colombia.",
      "Esto implica una **transferencia internacional de datos**, y al aceptar esta política la estás autorizando. Si no querés que tus datos pasen por el Coach IA, avisanos y lo desactivamos para tu cuenta.",
    ],
  },
  {
    id: "derechos",
    title: "Tus derechos",
    body: [
      "Como titular de los datos, la ley te da estos derechos y podés ejercerlos cuando quieras:",
      "- **Conocer** qué datos tuyos tenemos y cómo los usamos",
      "- **Actualizar y rectificar** los que estén desactualizados o incompletos",
      "- **Solicitar prueba** de esta autorización que estás dando",
      "- **Revocar la autorización** y **pedir que borremos** tus datos",
      "- **Acceder gratuitamente** a tus datos",
      `Para cualquiera de estas cosas escribinos a ${RESPONSABLE.email}. Tenemos 10 días hábiles para responder consultas y 15 para reclamos, prorrogables según la ley.`,
      "Buena parte de esto lo podés hacer solo desde la app: tu perfil se edita en Ajustes, y desde ahí mismo podés borrar tu cuenta con todos tus datos, planes y registros.",
    ],
  },
  {
    id: "conservacion",
    title: "Cuánto tiempo los guardamos",
    body: [
      "Mientras tengas cuenta activa. Si borrás tu cuenta, se eliminan tu perfil, tus planes, tus registros y tus conversaciones con el Coach IA. El borrado es definitivo y no se puede deshacer.",
      "Si dejás de usar la app sin borrar la cuenta, los datos siguen ahí hasta que nos pidas eliminarlos.",
    ],
  },
  {
    id: "cambios",
    title: "Cambios a esta política",
    body: [
      "Si cambiamos el texto, sube la versión y te vamos a pedir que la aceptes de nuevo antes de seguir usando la app. Tu aceptación anterior no cubre una versión nueva.",
      `Versión vigente: ${CONSENT_VERSION}.`,
    ],
  },
  {
    id: "sic",
    title: "Si no estás conforme",
    body: [
      "Podés presentar una queja ante la Superintendencia de Industria y Comercio, que es la autoridad de protección de datos en Colombia. Antes te agradeceríamos que nos escribieras a nosotros — la mayoría de las cosas se resuelven en un correo.",
    ],
  },
];

/** Resumen corto para el checkbox del onboarding. */
export const CONSENT_SUMMARY = [
  "Trainy guarda tu nombre, tu correo y datos de salud (edad, peso, lesiones, tus entrenamientos) para diseñarte el plan y hacerte seguimiento.",
  "Los datos de salud son sensibles: no estás obligado a autorizarlos, aunque sin ellos no se puede armar un plan seguro.",
  "Tu perfil y tus registros se envían al proveedor de IA cuando se genera tu plan o usás el Coach IA.",
  "Podés consultar, corregir o borrar todo lo tuyo cuando quieras desde Ajustes.",
];

/** ¿La aceptación guardada cubre la política vigente? */
export function hasCurrentConsent(
  acceptedAt: Date | null | undefined,
  version: string | null | undefined
): boolean {
  return !!acceptedAt && version === CONSENT_VERSION;
}
