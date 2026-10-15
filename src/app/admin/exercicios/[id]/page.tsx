import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExerciseActiveButton } from "@/components/admin/controls";
import { ExerciseForm } from "@/components/admin/exercise-form";
import { ExerciseImageControl } from "@/components/admin/media-manager";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { getExerciseAdmin, listExercisesAdmin } from "@/lib/admin/queries";
import { requireArea } from "@/lib/auth/dal";
import { isMediaConfigured } from "@/lib/media/config";

export const metadata: Metadata = { title: "Editar exercício" };

export default async function EditExercisePage({ params, searchParams }: PageProps<"/admin/exercicios/[id]">) {
  const viewer = await requireArea("admin");
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [exercise, all] = await Promise.all([getExerciseAdmin(viewer.id, id), listExercisesAdmin(viewer.id, {})]);
  if (!exercise) notFound();
  const equipment = [...new Set(all.map((e) => e.equipment))].sort();

  return (
    <div className="max-w-3xl">
      <Link href="/admin/exercicios" className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
        <ArrowLeft className="size-4" /> Exercícios
      </Link>
      <PageHeader
        eyebrow="Biblioteca"
        title={exercise.name}
        actions={<ExerciseActiveButton id={exercise.id} active={exercise.is_active} name={exercise.name} usage={exercise.usage} />}
      >
        <span className="flex flex-wrap items-center gap-2">
          {exercise.is_active ? <Badge>Ativo</Badge> : <Badge className="border-white text-white">Inativo</Badge>}
          <span className="text-sm">{exercise.usage === 0 ? "Não usado em fichas" : `Usado em ${exercise.usage} ${exercise.usage === 1 ? "ficha" : "fichas"}`}</span>
          {exercise.is_active && (
            <Link href={`/aluno/exercicios/${exercise.slug}`} className="inline-flex items-center gap-1 text-sm hover:text-white">
              Ver como aluno <ExternalLink className="size-3.5" />
            </Link>
          )}
        </span>
      </PageHeader>
      {sp.criado && <Alert tone="success" className="mb-6">Exercício cadastrado na biblioteca.</Alert>}
      {exercise.usage > 0 && (
        <Alert className="mb-6">Alterações aparecem nas fichas que já usam este exercício (nome e instruções são compartilhados).</Alert>
      )}
      <ExerciseImageControl exerciseId={exercise.id} name={exercise.name} current={exercise.media_path} configured={isMediaConfigured()} />
      <ExerciseForm exercise={exercise} equipment={equipment} />
    </div>
  );
}
