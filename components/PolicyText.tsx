import { PolicySection } from "@/lib/consent";

/** Render mínimo del texto de la política: **negrita** y viñetas. */
function Line({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i} className="font-semibold text-ink">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

export default function PolicyText({ sections }: { sections: PolicySection[] }) {
  return (
    <div className="space-y-6">
      {sections.map((s) => (
        <section key={s.id} id={s.id}>
          <h2 className="font-display text-base font-bold uppercase tracking-wider text-volt">
            {s.title}
          </h2>
          <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-ink-2">
            {s.body.map((line, i) =>
              line.startsWith("- ") ? (
                <p key={i} className="flex gap-2 pl-1">
                  <span className="text-volt">·</span>
                  <span>
                    <Line text={line.slice(2)} />
                  </span>
                </p>
              ) : (
                <p key={i}>
                  <Line text={line} />
                </p>
              )
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
