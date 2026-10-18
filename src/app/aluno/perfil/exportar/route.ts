import { getViewer } from "@/lib/auth/dal";
import { withUser } from "@/lib/db";

/** Exportação dos dados pessoais em JSON (LGPD art. 18, II e V). */
export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return new Response("Não autenticado.", { status: 401 });
  const row = await withUser(viewer.id, (db) => db.one<{ data: unknown }>("select public.export_my_data() as data"));
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(row?.data ?? {}, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="meus-dados-revo-train-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
