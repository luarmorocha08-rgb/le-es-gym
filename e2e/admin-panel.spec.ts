import { expect, test, type Page } from "@playwright/test";
import pg from "pg";
import { makeAdmin, signup, uniqueTag } from "./helpers";

// Painel administrativo contra banco real. Roda no projeto "admin", depois dos
// demais (horários e aviso alteram o site público).
test.skip(!process.env.E2E_WITH_DB || !process.env.DATABASE_URL, "requer banco (E2E_WITH_DB=1 e DATABASE_URL)");
test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

const stamp = Date.now();
const tag = uniqueTag(stamp);
const admin = { name: `Helena ${tag}`, email: `helena.${stamp}@teste.local`, password: "treino123" };
const trainer = { name: `Otavio ${tag}`, email: `otavio.${stamp}@teste.local`, password: "treino123" };
const student = { name: `Iris ${tag}`, email: `iris.${stamp}@teste.local`, password: "treino123" };
const exerciseName = `Remada cavalinho ${tag}`;
const shots = process.env.E2E_SCREENSHOTS;

let ap: Page;
let tp: Page;
let sp: Page;

async function snap(page: Page, name: string) {
  if (!shots) return;
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
}

test.beforeAll(async ({ browser }) => {
  ap = await signup(browser, admin, false);
  await makeAdmin(admin.email);
  tp = await signup(browser, trainer, true);
  sp = await signup(browser, student, false);
});
test.afterAll(async () => {
  await Promise.all([ap?.close(), tp?.close(), sp?.close()]);
  // rede de segurança caso um teste falhe antes da limpeza pela interface
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("delete from public.opening_hours where opens_at = '05:30' and closes_at = '23:00'");
    await client.query("delete from public.site_content where key = 'aviso' and value ->> 'text' = $1", [`Aviso de teste ${tag}`]);
  } finally {
    await client.end();
  }
});

test("quem não é admin não acessa o painel", async () => {
  await sp.goto("/admin/dashboard");
  await expect(sp).toHaveURL(/acesso-negado/);
});

test("admin vê a visão geral e aprova o profissional", async () => {
  await ap.goto("/admin/dashboard");
  await expect(ap.getByRole("heading", { name: "Visão geral" })).toBeVisible();
  await expect(ap.getByText(/aguarda(m)? aprovação/)).toBeVisible();
  await snap(ap, "a01-visao-geral");

  await ap.goto("/admin/profissionais");
  const card = ap.getByRole("listitem").filter({ hasText: trainer.name });
  await expect(card.getByText("123456-G/SP")).toBeVisible();
  await snap(ap, "a02-profissionais");
  // rejeitar exige motivo
  await card.getByRole("button", { name: "Rejeitar" }).click();
  await expect(card.getByLabel("Motivo (enviado ao profissional)")).toBeVisible();
  await card.getByRole("button", { name: "Cancelar" }).click();
  await card.getByRole("button", { name: "Aprovar" }).click();
  await card.getByRole("button", { name: /Confirmar: aprovar/ }).click();
  await expect(ap).toHaveURL(/status=aprovado/);
  await expect(ap.getByText(`Cadastro de ${trainer.name} aprovado. O profissional foi notificado.`)).toBeVisible();

  await tp.goto("/profissional/dashboard");
  await expect(tp).toHaveURL(/\/profissional\/dashboard/);
});

test("admin busca usuários e vê detalhes sem dados de saúde", async () => {
  await ap.goto(`/admin/usuarios?q=${encodeURIComponent(student.email)}`);
  await expect(ap.getByText("1 usuário")).toBeVisible();
  await ap.getByRole("link", { name: student.name }).click();
  await expect(ap.getByRole("heading", { name: student.name })).toBeVisible();
  await expect(ap.getByText("Dados de saúde (LGPD art. 11)")).toBeVisible();
  await expect(ap.getByRole("button", { name: "Tornar administrador" })).toBeVisible();
  await snap(ap, "a03-usuario");
});

test("admin vincula aluno ao profissional e encerra o vínculo", async () => {
  await ap.goto("/admin/vinculos");
  await ap.getByLabel("Profissional", { exact: true }).selectOption({ label: trainer.name });
  await ap.getByLabel("Aluno", { exact: true }).selectOption({ label: student.name });
  await ap.getByRole("button", { name: "Vincular" }).click();
  await expect(ap.getByText("Vínculo criado. Profissional e aluno foram notificados.")).toBeVisible();

  await tp.goto("/profissional/alunos");
  await expect(tp.getByRole("link", { name: new RegExp(student.name) })).toBeVisible();
  await sp.goto("/aluno/dashboard");
  await expect(sp.getByText("Novo profissional vinculado").first()).toBeVisible();

  await ap.reload();
  const row = ap.getByRole("row").filter({ hasText: student.name });
  await expect(row.getByText("administração")).toBeVisible();
  await snap(ap, "a04-vinculos");
  await row.getByRole("button", { name: "Encerrar" }).click();
  await ap.getByRole("button", { name: "Encerrar vínculo" }).click();
  await expect(ap.getByRole("row").filter({ hasText: student.name })).toHaveCount(0);

  await tp.goto("/profissional/alunos");
  await expect(tp.getByRole("link", { name: new RegExp(student.name) })).toHaveCount(0);
});

test("admin cadastra exercício, aluno vê na biblioteca e some ao desativar", async () => {
  await ap.goto("/admin/exercicios/novo");
  await ap.getByLabel("Nome").fill(exerciseName);
  await ap.getByLabel("Equipamento").fill("barra");
  await ap.getByLabel("Execução — um passo por linha").fill("Apoie o peito no banco.\nPuxe a barra em direção ao abdômen.");
  await ap.getByRole("button", { name: "Cadastrar exercício" }).click();
  await expect(ap.getByText("Escolha ao menos um músculo principal.")).toBeVisible();
  await ap.getByRole("group", { name: "Músculos principais" }).getByText("Costas").click();
  await ap.getByRole("button", { name: "Cadastrar exercício" }).click();
  await expect(ap.getByText("Exercício cadastrado na biblioteca.")).toBeVisible();
  await snap(ap, "a05-exercicio");

  const search = `/aluno/exercicios?q=${encodeURIComponent(exerciseName)}`;
  await sp.goto(search);
  await expect(sp.getByText(exerciseName)).toBeVisible();

  await ap.getByRole("button", { name: "Desativar" }).click();
  await ap.getByRole("dialog").getByRole("button", { name: "Desativar" }).click();
  await expect(ap.getByText("Inativo")).toBeVisible();
  await sp.goto(search);
  await expect(sp.getByText(exerciseName)).toHaveCount(0);
});

test("admin publica horários e aviso no site", async () => {
  await ap.goto("/admin/horarios");
  for (const d of ["Seg", "Ter", "Qua", "Qui", "Sex"]) await ap.getByText(d, { exact: true }).click();
  await ap.getByLabel("Abre").fill("05:30");
  await ap.getByLabel("Fecha").fill("23:00");
  await ap.getByRole("button", { name: "Adicionar" }).click();
  await expect(ap.getByText("5 faixas adicionadas.")).toBeVisible();
  await snap(ap, "a06-horarios");

  await ap.goto("/admin/conteudo");
  await ap.getByRole("checkbox", { name: /Exibir o aviso no site/ }).check();
  await ap.getByLabel("Texto do aviso").fill(`Aviso de teste ${tag}`);
  await ap.getByLabel("Link (opcional)", { exact: true }).fill("/contato");
  await ap.getByRole("button", { name: "Salvar aviso" }).click();
  await expect(ap.getByText("Aviso publicado no site.")).toBeVisible();

  await sp.goto("/contato");
  await expect(sp.getByText("05:30 – 23:00").first()).toBeVisible();
  const bar = sp.getByRole("complementary", { name: "Aviso da academia" });
  await expect(bar.getByText(`Aviso de teste ${tag}`)).toBeVisible();
  await snap(sp, "a07-site-aviso");
  await bar.getByRole("button", { name: "Dispensar aviso" }).click();
  await expect(bar).toHaveCount(0);
  await sp.reload();
  await expect(sp.getByRole("complementary", { name: "Aviso da academia" })).toHaveCount(0);

  // limpeza: o site volta ao estado anterior
  await ap.getByRole("checkbox", { name: /Exibir o aviso no site/ }).uncheck();
  await ap.getByRole("button", { name: "Salvar aviso" }).click();
  await expect(ap.getByText("Aviso salvo (desativado).")).toBeVisible();
  await ap.goto("/admin/horarios");
  for (const label of ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"]) {
    await ap.getByRole("button", { name: `Remover ${label} 05:30–23:00` }).click();
    await expect(ap.getByRole("button", { name: `Remover ${label} 05:30–23:00` })).toHaveCount(0);
  }
});

test("logs registram as ações administrativas", async () => {
  const filtered = async (action: string, text: string) => {
    await ap.goto(`/admin/logs?acao=${action}`);
    await expect(ap.getByText(new RegExp(text)).first()).toBeVisible();
  };
  await filtered("revisar_profissional", `Revisou cadastro profissional · ${trainer.name} → aprovado`);
  await filtered("insert", `Criou exercício · ${exerciseName}`);
  await filtered("desvincular_aluno", `Encerrou vínculo · ${student.name}`);
  await ap.goto("/admin/logs");
  await snap(ap, "a08-logs");
  await ap.getByRole("link", { name: "Uso da IA" }).click();
  await expect(ap.getByText("Usos (30 dias)")).toBeVisible();
});
