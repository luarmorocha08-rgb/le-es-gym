import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ExerciseForm } from "@/components/admin/exercise-form";
import { PageHeader } from "@/components/ui/page-header";
import { listExercisesAdmin } from "@/lib/admin/queries";
import { requireArea } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Novo exercício" };

export default async function NewExercisePage() {
  const viewer = await requireArea("admin");
  const all = await listExercisesAdmin(viewer.id, {});
  const equipment = [...new Set(all.map((e) => e.equipment))].sort();
  return (
    <div className="max-w-3xl">
      <Link href="/admin/exercicios" className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
        <ArrowLeft className="size-4" /> Exercícios
      </Link>
      <PageHeader eyebrow="Biblioteca" title="Novo exercício" />
      <ExerciseForm exercise={null} equipment={equipment} />
    </div>
  );
}
