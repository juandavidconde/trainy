"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

export interface ExerciseSeries {
  id: string;
  name: string;
  session: string;
  prBaseline: string | null;
  best: string | null;
  points: { week: number; maxWeight: number; est1rm: number | null }[];
}

export default function ProgressChart({ series }: { series: ExerciseSeries[] }) {
  const [selectedId, setSelectedId] = useState(series[0].id);
  const selected = series.find((s) => s.id === selectedId) ?? series[0];

  const bySession = new Map<string, ExerciseSeries[]>();
  for (const s of series) {
    bySession.set(s.session, [...(bySession.get(s.session) ?? []), s]);
  }

  return (
    <div className="space-y-4">
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="h-11 w-full rounded-lg border border-line bg-card px-4 text-sm text-ink outline-none focus:border-volt"
      >
        {[...bySession.entries()].map(([session, items]) => (
          <optgroup key={session} label={session}>
            {items.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <div className="rounded-lg border border-line bg-card p-4">
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-ink-2">
          {selected.best && (
            <span>
              Mejor: <span className="font-semibold text-ink">{selected.best}</span>
            </span>
          )}
          {selected.prBaseline && (
            <span>
              PR base: <span className="font-semibold text-ink">{selected.prBaseline}</span>
            </span>
          )}
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={selected.points} margin={{ left: -20, right: 8 }}>
              <CartesianGrid stroke="#232A25" strokeDasharray="3 3" />
              <XAxis
                dataKey="week"
                tickFormatter={(w) => `S${w}`}
                stroke="#737D75"
                fontSize={11}
              />
              <YAxis stroke="#737D75" fontSize={11} domain={["auto", "auto"]} />
              <Tooltip
                labelFormatter={(w) => `Semana ${w}`}
                contentStyle={{
                  backgroundColor: "#1B211C",
                  border: "1px solid #3A443C",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="maxWeight"
                name="Peso máx (kg)"
                stroke="#C8F169"
                strokeWidth={2}
                dot={{ r: 3, fill: "#C8F169", strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="est1rm"
                name="1RM estimado"
                stroke="#45D0E8"
                strokeWidth={2}
                strokeDasharray="6 5"
                dot={{ r: 3, fill: "#45D0E8", strokeWidth: 0 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
