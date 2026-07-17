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
        className="w-full rounded-xl border border-neutral-800 bg-card px-4 py-3 text-sm outline-none focus:border-accent"
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

      <div className="rounded-2xl border border-neutral-800 bg-card p-4">
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400">
          {selected.best && (
            <span>
              Mejor: <span className="font-semibold text-neutral-200">{selected.best}</span>
            </span>
          )}
          {selected.prBaseline && (
            <span>
              PR base: <span className="font-semibold text-neutral-200">{selected.prBaseline}</span>
            </span>
          )}
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={selected.points} margin={{ left: -20, right: 8 }}>
              <CartesianGrid stroke="#2a2e38" strokeDasharray="3 3" />
              <XAxis
                dataKey="week"
                tickFormatter={(w) => `S${w}`}
                stroke="#6b7280"
                fontSize={11}
              />
              <YAxis stroke="#6b7280" fontSize={11} domain={["auto", "auto"]} />
              <Tooltip
                labelFormatter={(w) => `Semana ${w}`}
                contentStyle={{
                  backgroundColor: "#181b22",
                  border: "1px solid #2a2e38",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="maxWeight"
                name="Peso máx (kg)"
                stroke="#4f8cff"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="est1rm"
                name="1RM estimado"
                stroke="#34d399"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={{ r: 3 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
