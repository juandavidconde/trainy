import Link from "next/link";
import InstallSteps from "./InstallSteps";

// Landing pública — lo que ve alguien que recibe el link de Trainy por WhatsApp.
//
// Reemplaza al flyer en PDF que se mandaba antes. El PDF fallaba por diseño, no
// por diseño gráfico: su URL era texto pintado (nada que tocar), y su QR era
// inescaneable porque quien lo abría lo tenía en la misma pantalla con la que
// habría escaneado. Acá el link ES la pieza: se abre en un toque, el botón de
// crear cuenta está antes del primer scroll, y la parte que el PDF nunca dijo
// —que Trainy no está en la tienda de apps— tiene sección propia.
//
// Todo el contenido vive en este archivo a propósito: es la pieza que más se
// va a reescribir, y buscarla en cinco componentes cuesta más que leerla acá.

// Hex literales, no clases de Tailwind: el color entra por `style` porque
// Tailwind no genera clases desde valores dinámicos. Es el mismo patrón que
// usa `sessionChipStyle` en lib/brand.ts — hex + sufijo de alfa.
const FEATURES = [
  {
    color: "#C8F169",
    title: "Tu bloque, generado con IA",
    body: "Contá tu nivel, tu objetivo y los días que tenés. En minutos tenés un bloque de 12 semanas a tu medida, con progresión y descargas.",
    icon: (
      <>
        <path d="M12 3a5 5 0 0 0-5 5c0 1.5.6 2.5 1.3 3.3.6.7 1.2 1.4 1.2 2.7v1h5v-1c0-1.3.6-2 1.2-2.7C16.4 10.5 17 9.5 17 8a5 5 0 0 0-5-5Z" />
        <path d="M9.5 19h5" />
        <path d="M10.5 21.5h3" />
      </>
    ),
  },
  {
    color: "#45D0E8",
    title: "Registrá cada serie",
    body: "Peso y reps en dos toques desde el celular. Historial, récords y adherencia siempre a la mano.",
    icon: (
      <>
        <path d="M4 6.5 8.5 11 20 3.5" />
        <path d="M4 13.5 8.5 18 20 10.5" />
      </>
    ),
  },
  {
    color: "#4DDFC0",
    title: "Mirá tu progreso real",
    body: "Gráficas de progresión y e1RM por ejercicio. Ves de una si estás subiendo o estancado.",
    icon: (
      <>
        <path d="M4 4v16h16" />
        <path d="M7 15l4-5 3 3 5-7" />
      </>
    ),
  },
  {
    color: "#E5D054",
    title: "Nunca dudes qué toca hoy",
    body: "La app te dice cuántas series, cuántas reps y con cuánto peso arrancar cada día. Llegás y entrenás.",
    icon: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3.4" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      </>
    ),
  },
  {
    color: "#A08BFF",
    title: "Guía de técnica y diccionario",
    body: "Cada ejercicio con ilustración, técnica del coach y errores comunes. Más el glosario: RPE, tempo, e1RM.",
    icon: (
      <>
        <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" />
        <path d="M5 17a3 3 0 0 1 3-3h11" />
        <path d="M9 8h6" />
      </>
    ),
  },
  {
    color: "#F27DB8",
    title: "Coach IA en tu bolsillo",
    body: "Un coach que conoce tu plan, tus números y tu adherencia. Preguntale lo que sea, cuando sea.",
    icon: (
      <>
        <path d="M4 5h16v11H9l-4 4V5Z" />
        <path d="M8.5 9.5h7M8.5 12.5h4" />
      </>
    ),
  },
];

const STEPS = [
  { n: "1", t: "Creá tu cuenta", d: "Con tu correo. Gratis, sin tarjeta." },
  { n: "2", t: "Contestá el wizard", d: "Nivel, objetivo, días, lesiones. Cinco minutos." },
  { n: "3", t: "Entrená hoy mismo", d: "Tu bloque de 12 semanas queda listo en la misma sesión." },
];

export default function Landing({ refCode }: { refCode?: string }) {
  // El ref viaja hasta el registro para saber por qué canal llegó cada atleta.
  const signup = `/login?nuevo=1${refCode ? `&ref=${encodeURIComponent(refCode)}` : ""}`;

  return (
    <main className="mx-auto w-full max-w-md px-5 pb-16 pt-8">
      {/* ── Marca ─────────────────────────────────────────── */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-volt shadow-glow">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" fill="#131A05" />
            </svg>
          </div>
          <div>
            <div className="font-display text-2xl font-bold leading-none tracking-tight">
              trainy<span className="text-volt">.</span>
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
              Volt · sport-tech
            </div>
          </div>
        </div>
        <span className="rounded-full border border-volt/30 bg-volt/10 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-volt">
          Gratis
        </span>
      </header>

      {/* ── Hero + CTA antes del primer scroll ────────────── */}
      <section className="mt-9">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-s-pull">
          Tu entrenamiento, medido
        </p>
        <h1 className="mt-3 font-display text-[34px] font-bold leading-[1.05] tracking-tight">
          Dejá de <span className="text-volt">adivinar</span>.
          <br />
          Entrená como un atleta.
        </h1>
        <p className="mt-4 leading-relaxed text-ink-2">
          Trainy arma tu bloque con IA, te dice exactamente qué hacer cada día y te muestra tu
          progreso en números reales. Desde el celular, sin planillas.
        </p>

        <Link
          href={signup}
          className="mt-6 flex h-14 w-full items-center justify-center rounded-xl bg-volt font-display text-lg font-bold text-volt-ink shadow-glow active:scale-[0.98] active:bg-volt-pressed"
        >
          Crear mi cuenta
        </Link>
        <Link
          href="/login"
          className="mt-3 block text-center text-sm text-ink-2 underline-offset-4 hover:underline"
        >
          Ya tengo cuenta — entrar
        </Link>
      </section>

      {/* ── Cómo funciona ─────────────────────────────────── */}
      <section className="mt-11">
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">
          Cómo funciona
        </h2>
        <ol className="mt-4 space-y-3">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-4 rounded-xl border border-line bg-card p-4">
              <span className="font-display text-xl font-bold leading-none text-volt">{s.n}</span>
              <div>
                <div className="font-display font-bold">{s.t}</div>
                <div className="mt-1 text-sm leading-relaxed text-ink-2">{s.d}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Qué trae ──────────────────────────────────────── */}
      <section className="mt-11">
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">
          Qué trae
        </h2>
        <div className="mt-4 space-y-2.5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex gap-3.5 rounded-xl border border-line border-l-[3px] bg-card p-4"
              style={{ borderLeftColor: f.color }}
            >
              <div
                className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border"
                style={{ borderColor: `${f.color}59`, backgroundColor: `${f.color}24` }}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-[18px] w-[18px]"
                  fill="none"
                  stroke={f.color}
                  strokeWidth={1.9}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {f.icon}
                </svg>
              </div>
              <div>
                <div className="font-display font-bold leading-tight">{f.title}</div>
                <div className="mt-1 text-sm leading-relaxed text-ink-2">{f.body}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Instalación (lo que el PDF nunca explicó) ─────── */}
      <section className="mt-11">
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">
          Instalala en el celular
        </h2>
        <p className="mt-3 leading-relaxed text-ink-2">
          Trainy <strong className="text-ink">no está en la App Store ni en Play Store</strong>, y
          no hace falta: se instala desde el navegador en dos toques y queda con su ícono en tu
          pantalla de inicio, igual que cualquier app.
        </p>
        <div className="mt-4">
          <InstallSteps />
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ink-3">
          También podés usarla desde el navegador sin instalar nada.
        </p>
      </section>

      {/* ── Cierre ────────────────────────────────────────── */}
      <section className="mt-11 rounded-xl border border-line-strong bg-raised p-5">
        <h2 className="font-display text-xl font-bold leading-tight">
          Empezá <span className="text-volt">hoy</span>.
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          Creá tu cuenta, contestá el wizard y arrancá tu primer bloque en la misma sesión.
        </p>
        <Link
          href={signup}
          className="mt-5 flex h-14 w-full items-center justify-center rounded-xl bg-volt font-display text-lg font-bold text-volt-ink shadow-glow active:scale-[0.98] active:bg-volt-pressed"
        >
          Crear mi cuenta
        </Link>
        <div className="mt-4 flex flex-wrap gap-2">
          {["Gratis", "Sin planillas", "Coach IA incluido"].map((c) => (
            <span
              key={c}
              className="rounded-full border border-line-strong px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-2"
            >
              {c}
            </span>
          ))}
        </div>
      </section>

      <footer className="mt-10 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
        <span>Trainy — tu progreso, en números</span>
        <Link href="/legal" className="underline-offset-4 hover:underline">
          Privacidad
        </Link>
      </footer>
    </main>
  );
}
