import type { SVGProps } from "react";

/** "R" geométrico da marca (viewBox 64×64) — também usado na cena 3D. */
export const REVO_R_PATH =
  "M21 17H35C40.5 17 44 20.6 44 25.5C44 29.3 41.9 32.1 38.6 33.2L45 47H38.6L32.8 33.9H27V47H21ZM27 22.2V28.8H34.6C36.8 28.8 38.2 27.5 38.2 25.5C38.2 23.5 36.8 22.2 34.6 22.2Z";

/**
 * Símbolo REVO TRAIN: o "R" dentro de um anel em rotação — evolução contínua.
 * Herda a cor do texto (currentColor).
 */
export function RevoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden {...props}>
      {/* anel em movimento, aberto no canto superior direito */}
      <path d="M50.4 13.6A26 26 0 1 0 57.6 37.4" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" />
      {/* seta do giro */}
      <path d="M58.6 28.2 61.6 40.2 50.6 38.2Z" fill="currentColor" />
      <path d={REVO_R_PATH} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

/** Selo completo (rodapé, telas de acesso). */
export function Emblem({ title = "REVO TRAIN", ...props }: SVGProps<SVGSVGElement> & { title?: string }) {
  return (
    <svg viewBox="0 0 240 240" role="img" aria-label={title} {...props}>
      <title>{title}</title>
      <defs>
        <linearGradient id="revo-emblem-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3ee6ff" />
          <stop offset="1" stopColor="#8a7dff" />
        </linearGradient>
      </defs>
      {/* hexágono com marcações de interface */}
      <path d="M120 6 219 63v114l-99 57-99-57V63Z" fill="#05070b" stroke="url(#revo-emblem-stroke)" strokeWidth="2.5" />
      <path d="M120 22 205 71v98l-85 49-85-49V71Z" fill="none" stroke="currentColor" strokeOpacity="0.14" strokeWidth="1.5" />
      <g stroke="currentColor" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round">
        <path d="M120 22v10M120 208v10M35 71l9 5M196 164l9 5M205 71l-9 5M44 164l-9 5" />
      </g>
      <RevoMark x="78" y="44" width="84" height="84" style={{ color: "#3ee6ff" }} />
      <text
        x="120"
        y="168"
        textAnchor="middle"
        fill="currentColor"
        style={{ font: "800 40px var(--font-display, 'Arial Narrow')", letterSpacing: "2px" }}
      >
        REVO
      </text>
      <text
        x="121"
        y="190"
        textAnchor="middle"
        fill="currentColor"
        fillOpacity="0.6"
        style={{ font: "500 13px var(--font-mono, monospace)", letterSpacing: "7px" }}
      >
        TRAIN
      </text>
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <RevoMark className="size-7 text-accent" />
      <span className="font-display text-[1.45rem] leading-none tracking-wide">REVO</span>
      <span className="font-display text-[1.45rem] leading-none tracking-wide text-metal">TRAIN</span>
    </span>
  );
}
