"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

/*
 * Gráficos de série única (identidade da marca: marca branca sobre superfície
 * escura). Regras: barras ≤ 24px com ponta arredondada e base reta, linha de
 * 2px, marcadores ≥ 8px com anel na cor da superfície, grade recessiva,
 * tooltip no hover/foco e tabela de dados alternativa.
 */

const SURFACE = "#0c0d0f";
const MARK = "#ffffff";
const GRID = "rgba(255,255,255,0.08)";

type Point = { label: string; value: number; detail?: string };

function niceMax(max: number) {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  const n = max / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

function compact(v: number) {
  return new Intl.NumberFormat("pt-BR", { notation: v >= 1000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(v);
}

function DataTable({ caption, points, unit }: { caption: string; points: Point[]; unit: string }) {
  return (
    <details className="mt-2 text-xs text-white/55">
      <summary className="cursor-pointer select-none hover:text-white">Ver dados em tabela</summary>
      <table className="mt-2 w-full text-left tabular-nums">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="text-white/40">
            <th className="py-1 font-normal">Período</th>
            <th className="py-1 text-right font-normal">Valor ({unit})</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.label} className="border-t border-white/[0.06]">
              <td className="py-1">{p.detail ?? p.label}</td>
              <td className="py-1 text-right text-white/80">{compact(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/** Posição em unidades do viewBox convertida para % do gráfico (independe da largura real). */
function Tooltip({ x, y, width, height, title, value }: { x: number; y: number; width: number; height: number; title: string; value: string }) {
  const left = Math.min(Math.max((x / width) * 100, 10), 90);
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-lg border border-white/15 bg-[#16181b] px-2.5 py-1.5 text-center text-xs shadow-xl"
      style={{ left: `${left}%`, top: `${(y / height) * 100}%` }}
    >
      <p className="text-white/55">{title}</p>
      <p className="font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}

export function BarChart({
  points,
  unit,
  title,
  height = 180,
  highlightLast = true,
  unitOne,
  integer = false,
}: {
  points: Point[];
  unit: string;
  title: string;
  height?: number;
  highlightLast?: boolean;
  /** Unidade no singular (ex.: "treino") — funções não podem vir de Server Components */
  unitOne?: string;
  /** Valores inteiros (contagens): eixo sem frações */
  integer?: boolean;
}) {
  const formatValue = (v: number) => `${compact(v)} ${v === 1 && unitOne ? unitOne : unit}`;
  const [hover, setHover] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const width = 600;
  const pad = { top: 16, right: 8, bottom: 26, left: 32 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const rawMax = niceMax(Math.max(...points.map((p) => p.value), 0));
  const max = integer ? Math.max(2, Math.ceil(rawMax / 2) * 2) : rawMax;
  const band = innerW / Math.max(points.length, 1);
  const barW = Math.min(24, band * 0.6);
  const ticks = [0, max / 2, max];

  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible" role="img" aria-label={title}>
        {ticks.map((t) => {
          const y = pad.top + innerH - (t / max) * innerH;
          return (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke={GRID} strokeWidth={1} />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" className="fill-white/40 text-[11px]">
                {compact(t)}
              </text>
            </g>
          );
        })}
        {points.map((p, i) => {
          const h = (p.value / max) * innerH;
          const x = pad.left + band * i + (band - barW) / 2;
          const y = pad.top + innerH - h;
          const r = Math.min(4, h);
          const active = hover === i || (hover === null && highlightLast && i === points.length - 1);
          // ponta arredondada (topo) e base reta
          const d = h > 0 ? `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${y + h} Z` : "";
          return (
            <g key={p.label}>
              {d && (
                <motion.path
                  d={d}
                  fill={MARK}
                  fillOpacity={active ? 1 : 0.45}
                  initial={reduce ? false : { scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.6, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                  style={{ transformOrigin: `${x}px ${pad.top + innerH}px` }}
                />
              )}
              {(points.length <= 8 || i % 2 === (points.length - 1) % 2) && (
                <text x={x + barW / 2} y={height - 8} textAnchor="middle" className="fill-white/40 text-[11px]">
                  {p.label}
                </text>
              )}
              {/* alvo de hover/foco maior que a marca */}
              <rect
                x={pad.left + band * i}
                y={pad.top}
                width={band}
                height={innerH}
                fill="transparent"
                tabIndex={0}
                aria-label={`${p.detail ?? p.label}: ${formatValue(p.value)}`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="outline-none"
              />
            </g>
          );
        })}
        <line x1={pad.left} x2={width - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
      </svg>
      {hover !== null && (
        <Tooltip
          x={pad.left + band * hover + band / 2}
          y={pad.top + innerH - (points[hover].value / max) * innerH}
          width={width}
          height={height}
          title={points[hover].detail ?? points[hover].label}
          value={formatValue(points[hover].value)}
        />
      )}
      <DataTable caption={title} points={points} unit={unit} />
    </figure>
  );
}

export function LineChart({
  points,
  unit,
  title,
  height = 200,
}: {
  points: Point[];
  unit: string;
  title: string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const gradientId = useId();
  const width = 600;
  const pad = { top: 18, right: 16, bottom: 26, left: 40 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const { min, max, coords } = useMemo(() => {
    const values = points.map((p) => p.value);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const spread = hi - lo || Math.max(hi * 0.2, 1);
    const minV = Math.max(0, lo - spread * 0.25);
    const maxV = hi + spread * 0.25;
    return {
      min: minV,
      max: maxV,
      coords: points.map((p, i) => ({
        x: pad.left + (points.length === 1 ? innerW / 2 : (innerW * i) / (points.length - 1)),
        y: pad.top + innerH - ((p.value - minV) / (maxV - minV)) * innerH,
      })),
    };
  }, [points, innerW, innerH, pad.left, pad.top]);

  if (points.length === 0) return null;
  const path = coords.map((c, i) => `${i ? "L" : "M"}${c.x},${c.y}`).join(" ");
  const area = `${path} L${coords[coords.length - 1].x},${pad.top + innerH} L${coords[0].x},${pad.top + innerH} Z`;
  const ticks = [min, (min + max) / 2, max];
  const last = coords.length - 1;
  const labelEvery = Math.ceil(points.length / 6);

  return (
    <figure className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={title}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * width;
          let best = 0;
          coords.forEach((c, i) => {
            if (Math.abs(c.x - x) < Math.abs(coords[best].x - x)) best = i;
          });
          setHover(best);
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={MARK} stopOpacity={0.12} />
            <stop offset="100%" stopColor={MARK} stopOpacity={0} />
          </linearGradient>
        </defs>
        {ticks.map((t, i) => {
          const y = pad.top + innerH - ((t - min) / (max - min)) * innerH;
          return (
            <g key={i}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke={GRID} strokeWidth={1} />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" className="fill-white/40 text-[11px]">
                {compact(Math.round(t))}
              </text>
            </g>
          );
        })}
        <path d={area} fill={`url(#${gradientId})`} />
        <motion.path
          d={path}
          fill="none"
          stroke={MARK}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
        {points.map((p, i) =>
          i % labelEvery === 0 || i === last ? (
            <text key={p.label + i} x={coords[i].x} y={height - 8} textAnchor="middle" className="fill-white/40 text-[11px]">
              {p.label}
            </text>
          ) : null,
        )}
        {hover !== null && (
          <line x1={coords[hover].x} x2={coords[hover].x} y1={pad.top} y2={pad.top + innerH} stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
        )}
        {/* marcador do último ponto + ponto em hover, com anel na cor da superfície */}
        {[last, hover].filter((i): i is number => i !== null).map((i) => (
          <circle key={`m${i}`} cx={coords[i].x} cy={coords[i].y} r={5} fill={MARK} stroke={SURFACE} strokeWidth={2} />
        ))}
        <text x={coords[last].x} y={coords[last].y - 12} textAnchor="end" className="fill-white text-[12px] font-semibold">
          {compact(points[last].value)} {unit}
        </text>
        {/* alvos de foco por teclado */}
        {coords.map((c, i) => (
          <circle
            key={`f${i}`}
            cx={c.x}
            cy={c.y}
            r={10}
            fill="transparent"
            tabIndex={0}
            aria-label={`${points[i].detail ?? points[i].label}: ${compact(points[i].value)} ${unit}`}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            className="outline-none"
          />
        ))}
      </svg>
      {hover !== null && (
        <Tooltip
          x={coords[hover].x}
          y={coords[hover].y}
          width={width}
          height={height}
          title={points[hover].detail ?? points[hover].label}
          value={`${compact(points[hover].value)} ${unit}`}
        />
      )}
      <DataTable caption={title} points={points} unit={unit} />
    </figure>
  );
}

/** Anel de progresso para metas/frequência (meter). */
export function ProgressRing({ value, max, size = 88, label }: { value: number; max: number; size?: number; label: string }) {
  const reduce = useReducedMotion();
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className={cn("relative grid place-items-center")} style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={6} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={MARK}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <span className="absolute font-display text-2xl tabular-nums">
        {value}
        <span className="text-sm text-white/45">/{max}</span>
      </span>
    </div>
  );
}
