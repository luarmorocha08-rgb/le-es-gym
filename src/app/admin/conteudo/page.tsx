import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AnnouncementForm } from "@/components/admin/controls";
import { GalleryManager, HeroMediaControl } from "@/components/admin/media-manager";
import { PageHeader } from "@/components/ui/page-header";
import { getContentAdmin } from "@/lib/admin/queries";
import { requireArea } from "@/lib/auth/dal";
import { getSiteMedia } from "@/lib/data/public";
import { isMediaConfigured } from "@/lib/media/config";
import { announcementSchema } from "@/lib/validation/admin";

export const metadata: Metadata = { title: "Conteúdo" };

const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export default async function AdminContentPage() {
  const viewer = await requireArea("admin");
  const row = await getContentAdmin(viewer.id, "aviso");
  const parsed = row ? announcementSchema.safeParse(row.value) : null;
  const initial = parsed?.success ? parsed.data : null;
  const mediaReady = isMediaConfigured();
  const media = await getSiteMedia();

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader eyebrow="Administração" title="Conteúdo do site">
        Avisos rápidos, fotos e vídeos para quem visita o site.
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

      <section aria-labelledby="midias" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
        <h2 id="midias" className="eyebrow mb-2">
          Fotos e vídeos da academia
        </h2>
        {mediaReady ? (
          <>
            <p className="mb-5 text-sm text-white/60">
              Use apenas fotos e vídeos da própria academia. Tudo aparece no site em preto e branco, com os acentos da identidade.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <HeroMediaControl
                kind="heroVideo"
                title="Vídeo de fundo"
                description="Toca sem som no topo da página inicial. Prefira 10–20 s, horizontal."
                current={media.heroVideo?.url ?? null}
              />
              <HeroMediaControl
                kind="heroPoster"
                title="Imagem de capa"
                description="Aparece enquanto o vídeo carrega e para quem economiza dados. Horizontal, de preferência um quadro do próprio vídeo."
                current={media.heroPoster?.url ?? null}
              />
            </div>
            <h3 className="mb-3 mt-8 font-semibold text-white">Galeria da página inicial</h3>
            <GalleryManager items={media.gallery} />
          </>
        ) : (
          <p className="text-sm text-white/60">
            Configuração pendente: o armazenamento de arquivos ainda não foi configurado (variável BLOB_READ_WRITE_TOKEN).
          </p>
        )}
      </section>
    </div>
  );
}
