import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AnnouncementForm } from "@/components/admin/controls";
import { PageHeader } from "@/components/ui/page-header";
import { getContentAdmin } from "@/lib/admin/queries";
import { requireArea } from "@/lib/auth/dal";
import { announcementSchema } from "@/lib/validation/admin";

export const metadata: Metadata = { title: "Conteúdo" };

const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export default async function AdminContentPage() {
  const viewer = await requireArea("admin");
  const row = await getContentAdmin(viewer.id, "aviso");
  const parsed = row ? announcementSchema.safeParse(row.value) : null;
  const initial = parsed?.success ? parsed.data : null;

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader eyebrow="Administração" title="Conteúdo do site">
        Comunicados rápidos para quem visita o site — feriados, mudanças de horário, novidades.
      </PageHeader>

      <section aria-labelledby="aviso" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 id="aviso" className="eyebrow">
            Aviso no site
          </h2>
          <Link href="/" target="_blank" className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white">
            Ver site <ExternalLink className="size-3.5" />
          </Link>
        </div>
        <AnnouncementForm initial={initial} />
        {row && (
          <p className="mt-4 text-xs text-white/55">
            Última alteração em {fmt.format(new Date(row.updated_at))}
            {row.updated_by_name && ` por ${row.updated_by_name}`}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-dashed border-white/15 p-5 text-sm text-white/60">
        <h2 className="eyebrow mb-2">Fotos e vídeos da academia</h2>
        <p>
          O envio de mídias pelo painel depende de um serviço de armazenamento de arquivos, que ainda não foi configurado. Por enquanto,
          as mídias são adicionadas em <code className="text-white/80">public/media</code> e informadas em{" "}
          <code className="text-white/80">src/content/gym.ts</code>.
        </p>
      </section>
    </div>
  );
}
