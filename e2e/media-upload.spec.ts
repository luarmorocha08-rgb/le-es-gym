import { expect, test, type Page } from "@playwright/test";
import pg from "pg";
import { makeAdmin, signup, uniqueTag } from "./helpers";

// Envio de fotos e vídeos pelo painel. Com E2E_BLOB_MOCK=1 o armazenamento é
// simulado por e2e/mock-blob.mjs; sem ele, o painel mostra "configuração pendente".
test.skip(!process.env.E2E_WITH_DB || !process.env.DATABASE_URL, "requer banco (E2E_WITH_DB=1 e DATABASE_URL)");
test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

const blobMock = Boolean(process.env.E2E_BLOB_MOCK);
const blobUrl = `http://127.0.0.1:${process.env.MOCK_BLOB_PORT ?? 3298}`;
const stamp = Date.now();
const tag = uniqueTag(stamp);
const admin = { name: `Marta ${tag}`, email: `marta.${stamp}@teste.local`, password: "treino123" };
const student = { name: `Caio ${tag}`, email: `caio.${stamp}@teste.local`, password: "treino123" };
const altText = `Área de musculação ${tag}`;

// PNG 1×1 válido
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
const image = (name: string) => ({ name, mimeType: "image/png", buffer: png });

let ap: Page;
let sp: Page;

async function blobRequests(): Promise<{ op: string; pathname?: string; urls?: string[]; auth?: boolean }[]> {
  return (await fetch(`${blobUrl}/__requests`)).json();
}

async function pick(button: ReturnType<Page["getByRole"]>, file: { name: string; mimeType: string; buffer: Buffer }) {
  const chooser = button.page().waitForEvent("filechooser");
  await button.click();
  await (await chooser).setFiles(file);
}

test.beforeAll(async ({ browser }) => {
  ap = await signup(browser, admin, false);
  await makeAdmin(admin.email);
  sp = await signup(browser, student, false);
});
test.afterAll(async () => {
  await Promise.all([ap?.context().close(), sp?.context().close()]);
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("delete from public.site_content where key = 'midias'");
    await client.query("update public.exercises set media_path = null where media_path like 'https://e2estore.%'");
  } finally {
    await client.end();
  }
});

test("só administradores recebem permissão de envio", async ({ request }) => {
  const body = { type: "blob.generate-client-token", payload: { pathname: "site/galeria/x.png", clientPayload: "gallery", multipart: false } };
  const anon = await request.post("/api/admin/media", { data: body });
  expect([403, 503]).toContain(anon.status());
  const asStudent = await sp.request.post("/api/admin/media", { data: body });
  expect([403, 503]).toContain(asStudent.status());
});

test("sem armazenamento configurado, o painel avisa", async () => {
  test.skip(blobMock, "armazenamento simulado ativo");
  await ap.goto("/admin/conteudo");
  await expect(ap.getByText(/Configuração pendente: o armazenamento de arquivos/)).toBeVisible();
});

test("admin publica capa e galeria; aparecem no site e são apagadas ao remover", async () => {
  test.skip(!blobMock, "requer E2E_BLOB_MOCK=1");
  await ap.goto("/admin/conteudo");

  // destino fora da pasta do uso é recusado pelo servidor
  const bad = await ap.request.post("/api/admin/media", {
    data: { type: "blob.generate-client-token", payload: { pathname: "exercicios/x.png", clientPayload: "gallery", multipart: false } },
  });
  expect(bad.status()).toBe(400);

  // tipo errado é recusado antes do envio
  const video = ap.getByRole("group", { name: "Vídeo de fundo" });
  await pick(video.getByRole("button", { name: "Enviar arquivo" }), image("capa.png"));
  await expect(video.getByText(/Arquivo não aceito. Envie vídeo MP4/)).toBeVisible();

  const capa = ap.getByRole("group", { name: "Imagem de capa" });
  await pick(capa.getByRole("button", { name: "Enviar arquivo" }), image("Capa Academia.png"));
  await expect(capa.getByText("Imagem de capa publicada no site.")).toBeVisible();
  await expect(capa.getByRole("img", { name: "Imagem de capa atual" })).toHaveAttribute("src", /site\/capa\/capa-academia-[0-9a-f]+\.png$/);

  await ap.getByLabel("Nova foto").setInputFiles(image("sala.png"));
  await ap.getByLabel("Descrição da foto", { exact: true }).fill("abc");
  await expect(ap.getByRole("button", { name: "Adicionar à galeria" })).toBeDisabled();
  await ap.getByLabel("Descrição da foto", { exact: true }).fill(altText);
  await ap.getByRole("button", { name: "Adicionar à galeria" }).click();
  await expect(ap.getByText("Foto adicionada à galeria.")).toBeVisible();
  const photo = ap.getByRole("list", { name: "Fotos da galeria" }).getByRole("img", { name: altText });
  await expect(photo).toBeVisible();
  const photoUrl = (await photo.getAttribute("src"))!;

  // o arquivo foi enviado direto do navegador, com permissão emitida pelo servidor
  const puts = (await blobRequests()).filter((r) => r.op === "put");
  expect(puts.some((r) => r.pathname?.startsWith("site/galeria/sala-") && r.auth)).toBe(true);

  // visitante vê a foto na página da academia
  const visitor = await ap.context().browser()!.newPage();
  await visitor.goto("/academia");
  await expect(visitor.getByRole("img", { name: altText })).toHaveAttribute("src", photoUrl);
  await visitor.close();

  // remover apaga do site e do armazenamento
  const item = ap.getByRole("listitem").filter({ has: ap.getByRole("img", { name: altText }) });
  await item.getByRole("button", { name: "Remover" }).click();
  await ap.getByRole("dialog").getByRole("button", { name: "Remover" }).click();
  await expect(ap.getByText("Foto removida da galeria.")).toBeVisible();
  await expect(ap.getByRole("img", { name: altText })).toHaveCount(0);
  expect((await blobRequests()).some((r) => r.op === "delete" && r.urls?.includes(photoUrl))).toBe(true);

  await capa.getByRole("button", { name: "Remover" }).click();
  await ap.getByRole("dialog").getByRole("button", { name: "Remover" }).click();
  await expect(capa.getByText("Imagem de capa removida.")).toBeVisible();
});

test("admin envia imagem de exercício e o aluno a vê na biblioteca", async () => {
  test.skip(!blobMock, "requer E2E_BLOB_MOCK=1");
  await ap.goto("/admin/exercicios?q=Supino%20reto%20com%20barra");
  await ap.getByRole("link", { name: /Supino reto com barra/ }).first().click();
  await pick(ap.getByRole("button", { name: "Enviar imagem" }), image("supino.png"));
  await expect(ap.getByText("Imagem do exercício salva.")).toBeVisible();

  await sp.goto("/aluno/exercicios/supino-reto-barra");
  await expect(sp.getByRole("img", { name: "Demonstração do exercício Supino reto com barra" })).toBeVisible();

  await ap.getByRole("button", { name: "Remover" }).click();
  await ap.getByRole("dialog").getByRole("button", { name: "Remover" }).click();
  await expect(ap.getByText("Imagem removida.")).toBeVisible();
  await sp.reload();
  await expect(sp.getByRole("img", { name: /Demonstração do exercício/ })).toHaveCount(0);
});
