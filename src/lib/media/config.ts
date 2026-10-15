/**
 * Armazenamento de fotos e vídeos (Vercel Blob). Sem BLOB_READ_WRITE_TOKEN o
 * painel mostra "configuração pendente" e o site usa só as mídias locais.
 */
export function isMediaConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** O token tem o formato vercel_blob_rw_<storeId>_<segredo>. */
function storeHost() {
  const id = process.env.BLOB_READ_WRITE_TOKEN?.split("_")[3];
  return id ? `${id.toLowerCase()}.public.blob.vercel-storage.com` : null;
}

/** Aceita só arquivos públicos do armazenamento desta academia. */
export function isOwnMediaUrl(value: string, prefix?: string) {
  const host = storeHost();
  if (!host) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.host === host && !url.search && !url.hash && (!prefix || url.pathname.startsWith(`/${prefix}`));
  } catch {
    return false;
  }
}
