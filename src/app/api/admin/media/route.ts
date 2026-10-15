import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth/dal";
import { isMediaConfigured } from "@/lib/media/config";
import { isMediaKind, mediaKinds } from "@/lib/validation/media";

/**
 * Emite a permissão de envio direto do navegador para o armazenamento (o
 * arquivo não passa pelo servidor). Só administradores, só os tipos e tamanhos
 * de cada uso, sempre com nome aleatório. O registro no site é feito depois,
 * por Server Action, que confere de novo a sessão e a origem do arquivo.
 */
export async function POST(request: Request) {
  if (!isMediaConfigured()) {
    return NextResponse.json({ error: "Armazenamento de arquivos não configurado." }, { status: 503 });
  }
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
  if (body.type !== "blob.generate-client-token") {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const viewer = await getViewer();
        if (!viewer?.isAdmin) throw new Error("Acesso restrito à administração.");
        if (!isMediaKind(clientPayload)) throw new Error("Tipo de envio inválido.");
        const kind = mediaKinds[clientPayload];
        if (!/^[a-z0-9/-]+(\.[a-z0-9]+)?$/.test(pathname) || !pathname.startsWith(`${kind.folder}/`)) {
          throw new Error("Destino inválido.");
        }
        return {
          allowedContentTypes: [...kind.types],
          maximumSizeInBytes: kind.maxBytes,
          addRandomSuffix: true,
          allowOverwrite: false,
          validUntil: Date.now() + 10 * 60 * 1000,
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao autorizar o envio.";
    const status = /restrito/.test(message) ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
