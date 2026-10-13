import { CalendarClock, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AddHoursForm, DeleteHourButton } from "@/components/admin/controls";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { listHoursAdmin } from "@/lib/admin/queries";
import { requireArea } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Horários" };

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export default async function AdminHoursPage() {
  const viewer = await requireArea("admin");
  const hours = await listHoursAdmin(viewer.id);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Administração" title="Horários">
        Os horários aparecem na página inicial e em Contato. Enquanto não houver horários, o site orienta o visitante a consultar pelo
        WhatsApp.
      </PageHeader>

      <section aria-labelledby="nova-faixa" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 id="nova-faixa" className="eyebrow mb-4">
          Adicionar faixa de horário
        </h2>
        <AddHoursForm />
      </section>

      <section aria-labelledby="atuais">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="atuais" className="eyebrow">
            Horários publicados
          </h2>
          <Link href="/contato" target="_blank" className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white">
            Ver no site <ExternalLink className="size-3.5" />
          </Link>
        </div>
        {hours.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Nenhum horário cadastrado" />
        ) : (
          <dl className="divide-y divide-white/[0.07] rounded-2xl border border-white/10 px-5">
            {ORDER.filter((d) => hours.some((h) => h.weekday === d)).map((d) => (
              <div key={d} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
                <dt className="font-heading text-sm uppercase tracking-[0.14em] text-white/70 sm:pt-2">{WEEKDAYS[d]}</dt>
                <dd className="space-y-1">
                  {hours
                    .filter((h) => h.weekday === d)
                    .map((h) => {
                      const label = `${WEEKDAYS[d]} ${h.opens_at.slice(0, 5)}–${h.closes_at.slice(0, 5)}`;
                      return (
                        <div key={h.id} className="flex items-center justify-end gap-3 text-sm tabular-nums">
                          <span>
                            {h.opens_at.slice(0, 5)} – {h.closes_at.slice(0, 5)}
                            {h.note && <span className="ml-2 text-white/55">{h.note}</span>}
                          </span>
                          <DeleteHourButton id={h.id} label={label} />
                        </div>
                      );
                    })}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </div>
  );
}
