import { AthleteStatus, STATUS_LABEL } from "@/lib/roster";

const STYLE: Record<AthleteStatus, string> = {
  "al-dia": "border-ok/40 bg-ok/10 text-ok",
  atrasado: "border-warn/40 bg-warn/10 text-warn",
  inactivo: "border-err/40 bg-err/10 text-err",
  "sin-plan": "border-line-strong bg-bg text-ink-3",
  // Terminó las 12 semanas: no es una alarma, es una oportunidad — y es lo
  // único del panel que pide una acción concreta del coach.
  "bloque-terminado": "border-volt/50 bg-volt/10 text-volt",
};

export default function StatusChip({ status }: { status: AthleteStatus }) {
  return (
    <span
      className={`shrink-0 rounded-sm border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest ${STYLE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
