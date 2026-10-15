"use client";

import { upload } from "@vercel/blob/client";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import {
  addGalleryImage,
  removeGalleryImage,
  setExerciseImage,
  setHeroMedia,
  updateGalleryImage,
} from "@/app/admin/_actions/media";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MAX_GALLERY, mediaKinds, mediaPathname, type MediaKind, type SiteMedia } from "@/lib/validation/media";

type Result = { ok: boolean; message: string };
type Status = { tone: "success" | "error"; text: string } | null;

/** Envio direto do navegador para o armazenamento, com checagem prévia de tipo e tamanho. */
function useUploader(kind: MediaKind) {
  const [progress, setProgress] = useState<number | null>(null);
  const rules = mediaKinds[kind];

  async function send(file: File): Promise<string> {
    if (!(rules.types as readonly string[]).includes(file.type) || file.size > rules.maxBytes) {
      throw new Error(`Arquivo não aceito. Envie ${rules.label}.`);
    }
    setProgress(0);
    try {
      const blob = await upload(mediaPathname(kind, file.name), file, {
        access: "public",
        handleUploadUrl: "/api/admin/media",
        clientPayload: kind,
        multipart: file.size > 20 * 1024 * 1024,
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
      });
      return blob.url;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      throw new Error(/restrito|inválid|configurado/i.test(message) ? message : "Falha no envio do arquivo. Verifique a conexão e tente de novo.");
    } finally {
      setProgress(null);
    }
  }

  return { send, progress, accept: rules.types.join(","), hint: `Formato: ${rules.label}.` };
}

function StatusLine({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <Alert tone={status.tone} className="mt-3">
      {status.text}
    </Alert>
  );
}

function ProgressLine({ value }: { value: number | null }) {
  if (value === null) return null;
  return (
    <p className="mt-2 flex items-center gap-2 text-xs text-white/60" role="status">
      <Loader2 className="size-3.5 animate-spin" aria-hidden /> Enviando… {value}%
    </p>
  );
}

/** Seletor de arquivo com botão: escolhe e já envia. */
function FilePicker({
  label,
  accept,
  disabled,
  onFile,
}: {
  label: string;
  accept: string;
  disabled?: boolean;
  onFile: (file: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(ev) => {
          const file = ev.target.files?.[0];
          ev.target.value = "";
          if (file) onFile(file);
        }}
      />
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => ref.current?.click()}>
        <Upload /> {label}
      </Button>
    </>
  );
}

/** Vídeo de fundo ou imagem de capa da página inicial. */
export function HeroMediaControl({
  kind,
  title,
  description,
  current,
}: {
  kind: "heroVideo" | "heroPoster";
  title: string;
  description: string;
  current: string | null;
}) {
  const id = useId();
  const router = useRouter();
  const { send, progress, accept, hint } = useUploader(kind);
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<Status>(null);
  const busy = pending || progress !== null;

  function finish(res: Result) {
    setStatus({ tone: res.ok ? "success" : "error", text: res.message });
    if (res.ok) router.refresh();
  }

  return (
    <div className="rounded-xl border border-white/10 p-4" aria-labelledby={`${id}-t`} role="group">
      <h3 id={`${id}-t`} className="font-semibold text-white">
        {title}
      </h3>
      <p className="mt-1 text-sm text-white/60">{description}</p>
      {current && (
        <div className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-black">
          {kind === "heroVideo" ? (
            <video src={current} className="aspect-video w-full object-cover" muted controls preload="metadata" aria-label={`${title} atual`} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- prévia do arquivo enviado
            <img src={current} alt={`${title} atual`} className="aspect-video w-full object-cover" />
          )}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <FilePicker
          label={current ? "Trocar arquivo" : "Enviar arquivo"}
          accept={accept}
          disabled={busy}
          onFile={(file) => {
            setStatus(null);
            start(async () => {
              try {
                finish(await setHeroMedia(kind, await send(file)));
              } catch (error) {
                setStatus({ tone: "error", text: (error as Error).message });
              }
            });
          }}
        />
        {current && (
          <ConfirmAction
            label="Remover"
            title={`Remover ${title.toLowerCase()}?`}
            description="O arquivo é apagado do armazenamento e some do site."
            confirmLabel="Remover"
            variant="danger"
            icon={<Trash2 />}
            onConfirm={async () => finish(await setHeroMedia(kind, null))}
          />
        )}
      </div>
      <p className="mt-2 text-xs text-white/55">{hint}</p>
      <ProgressLine value={progress} />
      <StatusLine status={status} />
    </div>
  );
}

/** Fotos da galeria da página inicial, com descrição obrigatória e ordem. */
export function GalleryManager({ items }: { items: SiteMedia["gallery"] }) {
  const router = useRouter();
  const { send, progress, accept, hint } = useUploader("gallery");
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<Status>(null);
  const [alt, setAlt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = pending || progress !== null;
  const full = items.length >= MAX_GALLERY;

  function run(action: () => Promise<Result>, after?: () => void) {
    setStatus(null);
    start(async () => {
      try {
        const res = await action();
        setStatus({ tone: res.ok ? "success" : "error", text: res.message });
        if (res.ok) {
          after?.();
          router.refresh();
        }
      } catch (error) {
        setStatus({ tone: "error", text: (error as Error).message });
      }
    });
  }

  return (
    <div>
      {items.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2" aria-label="Fotos da galeria">
          {items.map((item, i) => (
            <GalleryItem
              key={item.url}
              item={item}
              index={i}
              total={items.length}
              busy={busy}
              onUpdate={(change) => run(() => updateGalleryImage(item.url, change))}
              onRemove={() => run(() => removeGalleryImage(item.url))}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-white/60">Nenhuma foto ainda. Enquanto a galeria estiver vazia, ela não aparece no site.</p>
      )}

      <form
        className="mt-5 grid gap-3 rounded-xl border border-dashed border-white/15 p-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          if (!file) return setStatus({ tone: "error", text: "Escolha uma foto." });
          run(
            async () => addGalleryImage(await send(file), alt),
            () => {
              setAlt("");
              setFile(null);
              if (fileRef.current) fileRef.current.value = "";
            },
          );
        }}
      >
        <Field id="gal-file" label="Nova foto" hint={full ? `Limite de ${MAX_GALLERY} fotos atingido.` : hint}>
          <Input
            ref={fileRef}
            id="gal-file"
            type="file"
            accept={accept}
            disabled={busy || full}
            onChange={(ev) => setFile(ev.target.files?.[0] ?? null)}
            className="file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-1 file:text-black"
          />
        </Field>
        <Field id="gal-alt" label="Descrição da foto" hint="Ex.: Área de musculação com halteres e bancos. Lida por leitores de tela.">
          <Input id="gal-alt" value={alt} maxLength={160} disabled={busy || full} onChange={(ev) => setAlt(ev.target.value)} />
        </Field>
        <div>
          <Button type="submit" size="sm" disabled={busy || full || !file || alt.trim().length < 5}>
            {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />} Adicionar à galeria
          </Button>
        </div>
        <ProgressLine value={progress} />
      </form>
      <StatusLine status={status} />
    </div>
  );
}

function GalleryItem({
  item,
  index,
  total,
  busy,
  onUpdate,
  onRemove,
}: {
  item: SiteMedia["gallery"][number];
  index: number;
  total: number;
  busy: boolean;
  onUpdate: (change: { alt?: string; move?: "up" | "down" }) => void;
  onRemove: () => Promise<void> | void;
}) {
  const id = useId();
  const [alt, setAlt] = useState(item.alt);
  return (
    <li className="overflow-hidden rounded-xl border border-white/10">
      {/* eslint-disable-next-line @next/next/no-img-element -- prévia do arquivo enviado */}
      <img src={item.url} alt={item.alt} className="aspect-[4/3] w-full object-cover" loading="lazy" />
      <div className="space-y-2 p-3">
        <label htmlFor={`${id}-alt`} className="text-xs text-white/60">
          Descrição da foto {index + 1}
        </label>
        <div className="flex gap-2">
          <Input id={`${id}-alt`} value={alt} maxLength={160} onChange={(ev) => setAlt(ev.target.value)} className="h-9 text-sm" />
          <Button type="button" size="sm" variant="outline" disabled={busy || alt.trim() === item.alt} onClick={() => onUpdate({ alt })}>
            Salvar
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="ghost" disabled={busy || index === 0} onClick={() => onUpdate({ move: "up" })} aria-label={`Mover foto ${index + 1} para antes`}>
            <ArrowUp />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy || index === total - 1}
            onClick={() => onUpdate({ move: "down" })}
            aria-label={`Mover foto ${index + 1} para depois`}
          >
            <ArrowDown />
          </Button>
          <ConfirmAction
            label="Remover"
            title="Remover esta foto?"
            description="A foto é apagada do armazenamento e some da galeria do site."
            confirmLabel="Remover"
            variant="danger"
            icon={<Trash2 />}
            onConfirm={async () => onRemove()}
          />
        </div>
      </div>
    </li>
  );
}

/** Imagem demonstrativa de um exercício (aparece para alunos na biblioteca). */
export function ExerciseImageControl({ exerciseId, name, current, configured }: { exerciseId: string; name: string; current: string | null; configured: boolean }) {
  const router = useRouter();
  const { send, progress, accept, hint } = useUploader("exercise");
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<Status>(null);
  const busy = pending || progress !== null;

  function finish(res: Result) {
    setStatus({ tone: res.ok ? "success" : "error", text: res.message });
    if (res.ok) router.refresh();
  }

  return (
    <section aria-labelledby="ex-img" className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <h2 id="ex-img" className="eyebrow">
        Imagem demonstrativa
      </h2>
      {current && (
        // eslint-disable-next-line @next/next/no-img-element -- prévia do arquivo enviado
        <img src={current} alt={`Demonstração: ${name}`} className="mt-3 aspect-video w-full max-w-md rounded-lg border border-white/10 object-cover" />
      )}
      {configured ? (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            <FilePicker
              label={current ? "Trocar imagem" : "Enviar imagem"}
              accept={accept}
              disabled={busy}
              onFile={(file) => {
                setStatus(null);
                start(async () => {
                  try {
                    finish(await setExerciseImage(exerciseId, await send(file)));
                  } catch (error) {
                    setStatus({ tone: "error", text: (error as Error).message });
                  }
                });
              }}
            />
            {current && (
              <ConfirmAction
                label="Remover"
                title="Remover a imagem?"
                description="A imagem é apagada do armazenamento e some da página do exercício."
                confirmLabel="Remover"
                variant="danger"
                icon={<Trash2 />}
                onConfirm={async () => finish(await setExerciseImage(exerciseId, null))}
              />
            )}
          </div>
          <p className="mt-2 text-xs text-white/55">{hint} Use fotos da própria academia.</p>
          <ProgressLine value={progress} />
          <StatusLine status={status} />
        </>
      ) : (
        <p className="mt-3 text-sm text-white/60">Configuração pendente: o armazenamento de arquivos ainda não foi configurado.</p>
      )}
    </section>
  );
}
