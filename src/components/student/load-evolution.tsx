"use client";

import { useState } from "react";
import { LineChart } from "@/components/charts/charts";
import { Select } from "@/components/ui/select";

type Series = { id: string; name: string; points: { date: string; value: number }[] };
const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });

export function LoadEvolution({ series }: { series: Series[] }) {
  const [id, setId] = useState(series[0]?.id ?? "");
  const current = series.find((s) => s.id === id) ?? series[0];
  if (!current) return null;
  const first = current.points[0]?.value ?? 0;
  const last = current.points[current.points.length - 1]?.value ?? 0;
  const diff = last - first;
  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="sm:w-72">
          <span className="sr-only">Exercício</span>
          <Select value={current.id} onChange={(e) => setId(e.target.value)}>
            {series.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </label>
        {current.points.length > 1 && (
          <p className="text-sm text-white/60">
            {diff > 0 ? `+${diff} kg desde o primeiro registro` : diff === 0 ? "Carga estável no período" : `${diff} kg desde o primeiro registro`}
          </p>
        )}
      </div>
      {current.points.length < 2 ? (
        <p className="py-6 text-center text-sm text-white/50">Registre este exercício em pelo menos dois dias para ver a curva.</p>
      ) : (
        <LineChart
          title={`Maior carga por dia — ${current.name}`}
          unit="kg"
          points={current.points.map((p) => ({
            label: fmt.format(new Date(`${p.date}T00:00:00Z`)),
            detail: new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${p.date}T00:00:00Z`)),
            value: p.value,
          }))}
        />
      )}
    </div>
  );
}
