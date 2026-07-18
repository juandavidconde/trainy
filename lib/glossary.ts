// Diccionario de términos de Trainy — todo lo que aparece en un plan
// y que un usuario nuevo puede no conocer. Contenido estático curado.

export interface GlossaryEntry {
  term: string;
  aka?: string;
  def: string;
  example?: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: "RPE",
    aka: "Rating of Perceived Exertion",
    def: "Escala de esfuerzo del 1 al 10. RPE 7 = te quedaban 3 repeticiones en el tanque; RPE 8 = 2; RPE 9 = 1; RPE 10 = fallo, no salía ni una más. En Trainy los compuestos se trabajan a RPE 7-8: pesado pero nunca al fallo.",
    example: "«3×10 @RPE 8» = 3 series de 10 terminando cada una con ~2 reps de reserva.",
  },
  {
    term: "AMRAP",
    aka: "As Many Reps As Possible",
    def: "Serie donde hacés todas las repeticiones que salgan con buena técnica (dejando ~1 en reserva). Sirve para medir progreso y autorregular el peso: si el AMRAP sale muy alto, toca subir carga.",
    example: "«2×12 + AMRAP -10%» = 2 series de 12, y una final con 10% menos peso a tope de reps.",
  },
  {
    term: "Tempo (ej. 3-1-1-0)",
    def: "Velocidad de cada fase de la repetición, en segundos: bajada (excéntrica) – pausa abajo – subida (concéntrica) – pausa arriba. «3-1-1-0» = bajá en 3 segundos, pausá 1, subí en 1, sin pausa arriba. La bajada controlada es donde más se estimula el músculo.",
  },
  {
    term: "Descarga",
    aka: "Deload / DL",
    def: "Semana de intensidad reducida (~70% del peso, menos series) programada en S6 y S12 del bloque. No es opcional ni es «perder tiempo»: es cuando el cuerpo supercompensa y el músculo crece. Las semanas marcadas DL en la app son esto.",
  },
  {
    term: "e1RM",
    aka: "1RM estimado",
    def: "El máximo teórico para una repetición, estimado desde tus series (fórmula de Epley: peso × (1 + reps/30)). La app lo calcula solo — sirve para ver progreso de fuerza sin necesidad de testear un 1RM real.",
    example: "10×100 lb → e1RM ≈ 133 lb.",
  },
  {
    term: "Myo-reps",
    def: "Técnica de intensificación: tras una serie AMRAP, descansás solo 10-15 segundos y hacés mini-series de 3-5 reps hasta no sostener el ritmo. Mucho estímulo en poco tiempo — se usa en aislados, nunca en compuestos pesados.",
  },
  {
    term: "Back-off",
    def: "Serie final con menos peso (típicamente -10%) después del trabajo principal pesado. Suma volumen de calidad sin fundir el sistema nervioso.",
  },
  {
    term: "BW",
    aka: "Body Weight",
    def: "Peso corporal. «BW» en la columna de peso = el ejercicio se hace solo con tu cuerpo. «BW+25» = con 25 lb extra colgadas (cinturón de lastre).",
  },
  {
    term: "c/u",
    def: "«Cada uno»: el peso indicado es por mancuerna/lado, no el total.",
    example: "«30 lb c/u» en press mancuernas = dos mancuernas de 30 lb.",
  },
  {
    term: "Compuesto vs. aislado",
    def: "Compuesto: mueve varias articulaciones y mucho peso (sentadilla, press, remo) — la base del progreso. Aislado: una articulación, un músculo (curl, elevación lateral) — el detalle. Los compuestos van primero en la sesión y nunca al fallo.",
  },
  {
    term: "Chips COMPOUND / HYPER / LIGHT / AMRAP_MYO / DOMINADAS",
    def: "La etiqueta de cada ejercicio en la app indica su rol y progresión: COMPOUND = compuesto pesado con rep-drop (12→10→8 subiendo carga) · HYPER / HYPER_ALTO = accesorio de hipertrofia 8-12 reps con AMRAP en serie 1 · LIGHT = aislado 12-15 reps · AMRAP_MYO = AMRAP + myo-reps · DOMINADAS = progresión propia de dominadas lastradas.",
  },
  {
    term: "Rep-drop",
    def: "La progresión de los compuestos en el bloque: las metas de reps bajan (12 → 10 → 8) mientras el peso sube cada 1-2 semanas. Tras la descarga, el ciclo reinicia con más carga que la vez anterior.",
  },
  {
    term: "RIR",
    aka: "Reps In Reserve",
    def: "Repeticiones que te quedaban en el tanque al terminar la serie. Es la otra cara del RPE: RIR 2 = RPE 8.",
  },
  {
    term: "Serie efectiva",
    def: "Serie lo suficientemente cerca del fallo (RIR 0-4) como para generar crecimiento. Las series muy lejos del fallo suman fatiga pero poco estímulo — por eso importa registrar el RPE real.",
  },
  {
    term: "Sobrecarga progresiva",
    def: "El principio detrás de todo el bloque: para crecer hay que hacer más con el tiempo — más peso, más reps o mejor técnica. La app registra todo justamente para garantizar que cada semana le gane a la anterior.",
  },
  {
    term: "PR",
    aka: "Personal Record",
    def: "Tu mejor marca en un ejercicio (por peso, por reps, o por e1RM). La app los detecta con tus registros y el coach los celebra — y los usa para calcular los pesos del siguiente bloque.",
  },
];
