import type { SVGProps } from "react";

/**
 * Emblema vetorial inspirado no escudo oficial "CANAL 5 · LEÕES GYM".
 * Recomendação: substituir pelo arquivo vetorial oficial da marca quando
 * disponível (mantendo o mesmo componente).
 */
export function LionHead(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden {...props}>
      {/* juba */}
      <path
        d="M32 3 38 9 46 6 48 14 56 15 54 23 61 28 55 34 59 42 51 44 50 52 42 51 37 58 32 53 27 58 22 51 14 52 13 44 5 42 9 34 3 28 10 23 8 15 16 14 18 6 26 9Z"
        fill="currentColor"
      />
      {/* face */}
      <path d="M32 15 44 21 45 34 39 45 32 49 25 45 19 34 20 21Z" fill="#000" />
      <path d="M32 18 41.5 22.5 42.5 33.5 37.5 42.5 32 45.5 26.5 42.5 21.5 33.5 22.5 22.5Z" fill="currentColor" />
      {/* olhos */}
      <path d="M24.5 28.5 30 30.5 29 32.5 25 31Z" fill="#000" />
      <path d="M39.5 28.5 34 30.5 35 32.5 39 31Z" fill="#000" />
      {/* focinho */}
      <path d="M28 36h8l-4 4.5Z" fill="#000" />
      <path d="M32 40.5v2.5M28.5 44.5 32 43l3.5 1.5" stroke="#000" strokeWidth="1.4" strokeLinecap="round" />
      {/* testa */}
      <path d="M32 21v6" stroke="#000" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function Emblem({ title = "LEÕES GYM C5", ...props }: SVGProps<SVGSVGElement> & { title?: string }) {
  return (
    <svg viewBox="0 0 240 240" role="img" aria-label={title} {...props}>
      <title>{title}</title>
      <circle cx="120" cy="120" r="118" fill="#000" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" />
      {/* telhado do escudo */}
      <path d="M56 70 120 44l64 26v14H56Z" fill="none" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
      <path d="M70 76 120 56l50 20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <text
        x="120"
        y="80"
        textAnchor="middle"
        fill="currentColor"
        style={{ font: "400 15px var(--font-display, Impact)", letterSpacing: "1.5px" }}
      >
        CANAL 5
      </text>
      {/* faixa principal com anilhas */}
      <g fill="currentColor">
        <rect x="20" y="100" width="6" height="30" rx="1.5" />
        <rect x="29" y="94" width="7" height="42" rx="1.5" />
        <rect x="39" y="97" width="6" height="36" rx="1.5" />
        <rect x="214" y="100" width="6" height="30" rx="1.5" />
        <rect x="204" y="94" width="7" height="42" rx="1.5" />
        <rect x="195" y="97" width="6" height="36" rx="1.5" />
      </g>
      <text
        x="120"
        y="129"
        textAnchor="middle"
        fill="currentColor"
        style={{ font: "400 33px var(--font-display, Impact)", letterSpacing: "0.5px" }}
      >
        LEÕES GYM
      </text>
      {/* chevron inferior */}
      <path
        d="M52 144h136l-10 10-58 44-58-44Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path d="M70 154h100l-50 36Z" fill="currentColor" fillOpacity="0.08" />
      <LionHead x="99" y="148" width="42" height="42" style={{ color: "currentColor" }} />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="font-display text-[1.35rem] leading-none tracking-wide">LEÕES</span>
      <span className="ml-1.5 font-display text-[1.35rem] leading-none tracking-wide text-white/55">GYM</span>
      <span className="ml-1.5 rounded-sm border border-white/30 px-1 align-[3px] font-heading text-[0.6rem] tracking-[0.15em]">
        C5
      </span>
    </span>
  );
}
