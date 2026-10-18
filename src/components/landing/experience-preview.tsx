"use client";

import { Activity, Bell, BrainCircuit, CalendarCheck2, Home, Play, Sparkles, TrendingUp, User } from "lucide-react";
import { useRef, useState } from "react";
import { RevoMark } from "@/components/brand/emblem";
import { gsap, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "hoje", label: "Treino do dia", icon: Home, desc: "Seu treino de hoje, o próximo da sequência e um botão para começar." },
  { id: "evolucao", label: "Evolução", icon: TrendingUp, desc: "Frequência semanal, cargas e volume com gráficos claros." },
  { id: "ia", label: "Assistente IA", icon: BrainCircuit, desc: "Converse sobre objetivos e receba uma ficha editável como sugestão." },
] as const;
type TabId = (typeof tabs)[number]["id"];

/* Valores ilustrativos exibidos SOMENTE neste preview demonstrativo. */
const demoWeek = [1, 1, 0, 1, 1, 0, 0];
const demoBars = [42, 55, 48, 63, 70, 66, 78];

function TodayScreen() {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-[linear-gradient(135deg,#3ee6ff,#8a7dff)] p-4 text-black">
        <p className="font-heading text-[0.6rem] uppercase tracking-[0.2em] text-black/60">Treino B · Costas e bíceps</p>
        <p className="mt-1 font-display text-2xl uppercase leading-none">Pronto para mais uma conquista?</p>
        <span className="mt-4 inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 font-heading text-[0.65rem] uppercase tracking-[0.18em] text-white">
          <Play className="size-3 fill-white" /> Iniciar treino
        </span>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
        <p className="font-heading text-[0.58rem] uppercase tracking-[0.2em] text-white/50">Semana</p>
        <div className="mt-2 flex justify-between">
          {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span className="text-[0.6rem] text-white/55">{d}</span>
              <span className={cn("size-6 rounded-full border", demoWeek[i] ? "border-accent bg-accent" : "border-white/20")} />
            </div>
          ))}
        </div>
      </div>
      {["Puxada frontal · 4×10", "Remada baixa · 4×12", "Rosca direta · 3×12"].map((e) => (
        <div key={e} className="flex items-center justify-between rounded-xl border border-white/10 px-3.5 py-3 text-[0.72rem] text-white/80">
          {e}
          <span className="size-1.5 rounded-full bg-white/40" />
        </div>
      ))}
    </div>
  );
}

function ProgressScreen() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { k: "Treinos", v: "12", icon: CalendarCheck2 },
          { k: "Frequência", v: "4×/sem", icon: Activity },
        ].map((s) => (
          <div key={s.k} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <s.icon className="size-4 text-white/60" />
            <p className="mt-3 font-display text-2xl leading-none">{s.v}</p>
            <p className="mt-1 text-[0.6rem] uppercase tracking-[0.15em] text-white/55">{s.k}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
        <p className="font-heading text-[0.58rem] uppercase tracking-[0.2em] text-white/50">Carga · Supino reto (kg)</p>
        <div className="mt-4 flex h-28 items-end gap-2">
          {demoBars.map((h, i) => (
            <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-white/25 to-white" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-white/10 px-3.5 py-3 text-[0.72rem] text-white/75">
        Meta: completar 16 treinos no mês
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-accent to-accent-2" />
        </div>
      </div>
    </div>
  );
}

function AiScreen() {
  return (
    <div className="space-y-2.5 text-[0.72rem] leading-relaxed">
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-white px-3.5 py-2.5 text-black">
        Quero ganhar massa, treino 4x por semana, 60 minutos.
      </div>
      <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.05] px-3.5 py-2.5 text-white/80">
        Entendido. Alguma limitação física ou exercício que prefira evitar?
      </div>
      <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/40 p-3.5">
        <RevoMark className="size-8 animate-pulse text-accent" />
        <div>
          <p className="font-heading text-[0.6rem] uppercase tracking-[0.2em] text-white">Estruturando sua rotina…</p>
          <p className="text-[0.6rem] text-white/55">Sugestão — sujeita a revisão profissional</p>
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 p-3">
        <p className="flex items-center gap-1.5 font-heading text-[0.58rem] uppercase tracking-[0.2em] text-white/55">
          <Sparkles className="size-3" /> Proposta · Upper / Lower
        </p>
        <div className="mt-2 grid grid-cols-2 gap-1.5 text-[0.62rem] text-white/70">
          {["Upper A", "Lower A", "Upper B", "Lower B"].map((d) => (
            <span key={d} className="rounded-lg bg-white/[0.06] px-2 py-1.5">
              {d}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ExperiencePreview() {
  const [tab, setTab] = useState<TabId>("hoje");
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-phone]",
          { rotateY: -28, rotateX: 12, y: 80 },
          {
            rotateY: 14,
            rotateX: -4,
            y: -40,
            ease: "none",
            scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true },
          },
        );
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="experiencia"
      aria-labelledby="experiencia-title"
      className="relative scroll-mt-20 overflow-hidden py-28 sm:py-40"
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_60%)]" />
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-2 lg:px-10">
        <div>
          <p className="eyebrow mb-6">03 — Experiência fitness</p>
          <h2 id="experiencia-title" className="font-display text-[clamp(2.8rem,7vw,6.5rem)] uppercase leading-[0.9]">
            Sua academia
            <br />
            <span className="text-white/55">no bolso.</span>
          </h2>
          <p className="mt-6 max-w-md text-white/60">
            Um portal do aluno pensado para o dia a dia do treino: rápido, claro e com botões grandes para usar entre
            uma série e outra.
          </p>

          <div role="tablist" aria-label="Telas do portal do aluno" className="mt-10 flex flex-col gap-2">
            {tabs.map((t) => {
              const active = t.id === tab;
              return (
                <button
                  key={t.id}
                  role="tab"
                  type="button"
                  id={`tab-${t.id}`}
                  aria-selected={active}
                  aria-controls="phone-screen"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "group flex items-start gap-4 rounded-2xl border p-4 text-left transition-colors duration-300",
                    active ? "border-white/40 bg-white/[0.06]" : "border-white/[0.07] hover:border-white/20",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-xl transition-colors",
                      active ? "bg-white text-black" : "bg-white/[0.06] text-white/70",
                    )}
                  >
                    <t.icon className="size-4" />
                  </span>
                  <span>
                    <span className="block font-heading text-sm uppercase tracking-[0.14em]">{t.label}</span>
                    <span className="mt-1 block text-sm text-white/55">{t.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-center [perspective:1400px]">
          <div data-phone className="relative [transform-style:preserve-3d]">
            <div className="relative h-[620px] w-[300px] rounded-[48px] bg-gradient-to-b from-[#3a3d42] via-[#1a1b1e] to-[#2c2e33] p-[10px] shadow-[0_60px_120px_-30px_rgba(0,0,0,1),0_0_0_1px_rgba(255,255,255,0.12),inset_0_0_0_1px_rgba(255,255,255,0.08)]">
              <div className="relative h-full w-full overflow-hidden rounded-[40px] bg-[#070708]">
                <div className="absolute left-1/2 top-2.5 z-10 h-7 w-24 -translate-x-1/2 rounded-full bg-black" />
                <div className="flex items-center justify-between px-5 pb-3 pt-12">
                  <div>
                    <p className="text-[0.6rem] uppercase tracking-[0.2em] text-white/55">Boa tarde,</p>
                    <p className="font-display text-xl uppercase leading-tight">Atleta</p>
                  </div>
                  <span className="grid size-8 place-items-center rounded-full border border-white/15">
                    <Bell className="size-3.5" />
                  </span>
                </div>
                <div
                  id="phone-screen"
                  role="tabpanel"
                  aria-labelledby={`tab-${tab}`}
                  className="px-4"
                  key={tab}
                >
                  <div className="animate-[fade-up_0.5s_var(--ease-out-expo)_both]">
                    {tab === "hoje" && <TodayScreen />}
                    {tab === "evolucao" && <ProgressScreen />}
                    {tab === "ia" && <AiScreen />}
                  </div>
                </div>
                <nav
                  aria-hidden
                  className="absolute inset-x-3 bottom-3 flex justify-between rounded-3xl border border-white/10 bg-white/[0.06] px-5 py-3 backdrop-blur"
                >
                  {[Home, CalendarCheck2, BrainCircuit, TrendingUp, User].map((Icon, i) => (
                    <Icon key={i} className={cn("size-4", i === 0 ? "text-white" : "text-white/55")} />
                  ))}
                </nav>
              </div>
            </div>
            <p className="mt-6 text-center font-heading text-[0.62rem] uppercase tracking-[0.24em] text-white/55">
              Demonstração da interface · dados ilustrativos
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
