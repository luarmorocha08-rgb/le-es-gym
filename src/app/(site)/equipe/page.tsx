import { UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHero } from "@/components/layout/page-hero";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPublicTrainers } from "@/lib/data/public";

/** Horários e equipe vêm do banco; revalida a cada 5 minutos. */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Equipe",
  description: "Conheça os profissionais de educação física da academia.",
};

async function TrainerList() {
  const result = await getPublicTrainers();

  if (result.status === "not_configured") {
    return <Alert title="Equipe ainda não publicada">Os perfis da equipe aparecem aqui assim que a plataforma for conectada ao banco de dados.</Alert>;
  }
  if (result.status === "error") {
    return <Alert tone="error" title="Não foi possível carregar a equipe">Tente novamente em instantes.</Alert>;
  }
  if (result.data.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
        <UserRound className="mx-auto size-8 text-white/40" aria-hidden />
        <p className="mt-4 font-heading uppercase tracking-[0.14em]">Perfis em breve</p>
        <p className="mt-2 text-sm text-white/55">Nossos profissionais estão finalizando seus perfis na plataforma.</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {result.data.map((t) => (
        <li key={t.user_id} className="metal-border glass relative flex flex-col rounded-2xl p-6">
          <span className="grid size-14 place-items-center rounded-2xl bg-white font-display text-2xl text-black">
            {t.full_name.charAt(0)}
          </span>
          <h2 className="mt-6 font-heading text-2xl uppercase tracking-[0.04em]">{t.full_name}</h2>
          {t.cref && <p className="mt-1 text-xs text-white/45">CREF {t.cref}</p>}
          {t.bio && <p className="mt-4 text-sm leading-relaxed text-white/65">{t.bio}</p>}
          {t.specialties.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {t.specialties.map((s) => (
                <Badge key={s}>{s}</Badge>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function TeamPage() {
  return (
    <>
      <PageHero eyebrow="Equipe" title={<>Quem treina <span className="text-white/40">os leões.</span></>}>
        Profissionais de educação física prontos para montar e acompanhar o seu treino.
      </PageHero>
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-10">
        <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-white/[0.04]" />}>
          <TrainerList />
        </Suspense>
        <div className="mt-14 flex flex-col items-center gap-4 text-center">
          <p className="text-white/60">É profissional de educação física e quer fazer parte da equipe?</p>
          <Button asChild variant="outline">
            <Link href="/cadastro?perfil=profissional">Cadastro profissional</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
