import { Clock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gym } from "@/content/gym";
import { getOpeningHours, groupHoursByDay } from "@/lib/data/public";

/** Horários reais vindos do painel admin; sem cadastro, orienta a consultar a academia. */
export async function OpeningHours() {
  const result = await getOpeningHours();
  const days = result.status === "ok" ? groupHoursByDay(result.data) : [];

  return (
    <div>
      <p className="eyebrow mb-4 flex items-center gap-2">
        <Clock className="size-3.5" aria-hidden /> Horários
      </p>
      {days.length > 0 ? (
        <dl className="divide-y divide-white/[0.07]">
          {days.map((day) => (
            <div key={day.weekday} className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="font-heading text-sm uppercase tracking-[0.14em] text-white/70">{day.label}</dt>
              <dd className="text-right text-sm tabular-nums text-white">
                {day.ranges.map((r) => (
                  <span key={`${r.from}-${r.to}`} className="block">
                    {r.from} – {r.to}
                    {r.note ? <span className="ml-2 text-white/45">{r.note}</span> : null}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-white/65">
            Consulte os horários atualizados, a grade de aulas e o Espaço Kids diretamente com a nossa equipe.
          </p>
          <Button asChild variant="outline" size="sm">
            <a href={gym.links.whatsapp} target="_blank" rel="noopener noreferrer">
              <MessageCircle /> Consultar no WhatsApp
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
