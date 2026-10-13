import { expect, test, type Page } from "@playwright/test";
import { approveTrainer, signup, uniqueTag } from "./helpers";

// Fluxos da IA contra banco real e um servidor que imita a API da Anthropic
// (e2e/mock-anthropic.mjs). Requer E2E_WITH_DB=1, DATABASE_URL e E2E_AI_MOCK=1.
test.skip(
  !process.env.E2E_WITH_DB || !process.env.DATABASE_URL || !process.env.E2E_AI_MOCK,
  "requer banco e o mock da IA (E2E_WITH_DB=1, E2E_AI_MOCK=1)",
);
test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

const mockUrl = `http://127.0.0.1:${process.env.MOCK_ANTHROPIC_PORT ?? 3299}`;
const stamp = Date.now();
const tag = uniqueTag(stamp);
const student = { name: `Bruna ${tag}`, email: `bruna.${stamp}@teste.local`, password: "treino123" };
const trainer = { name: `Diego ${tag}`, email: `diego.${stamp}@teste.local`, password: "treino123" };
const shots = process.env.E2E_SCREENSHOTS;

let sp: Page;
let tp: Page;

async function snap(page: Page, name: string) {
  if (!shots) return;
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
}

async function mockRequests(): Promise<string[]> {
  const res = await fetch(`${mockUrl}/__requests`);
  return ((await res.json()) as unknown[]).map((r) => JSON.stringify(r));
}

test.beforeAll(async ({ browser }) => {
  sp = await signup(browser, student, false);
  tp = await signup(browser, trainer, true);
  await approveTrainer(trainer.email, stamp);
  await tp.goto("/profissional/perfil");
  await tp.getByRole("checkbox", { name: /Exibir meu perfil/ }).check();
  await tp.getByRole("button", { name: "Salvar perfil profissional" }).click();
  await expect(tp.getByText("Perfil profissional atualizado.")).toBeVisible();
});
test.afterAll(async () => {
  await sp?.close();
  await tp?.close();
});

test("IA exige consentimento antes de qualquer envio", async () => {
  await sp.goto("/aluno/treino-ia");
  await expect(sp.getByRole("heading", { name: "Antes de começar" })).toBeVisible();
  await expect(sp.getByRole("button", { name: "Gerar meu treino" })).toHaveCount(0);
  await sp.getByRole("button", { name: "Autorizo e quero continuar" }).click();
  await expect(sp.getByText("Qual é o seu objetivo principal?")).toBeVisible();
});

test("aluno conversa com a IA, recebe sugestão validada e pede ajuste", async () => {
  const before = (await mockRequests()).length;
  await sp.getByRole("button", { name: "Hipertrofia" }).click();
  await sp.getByRole("button", { name: "Intermediário" }).click();
  await sp.getByRole("button", { name: "3", exact: true }).click();
  await sp.getByRole("button", { name: "60 min" }).click();
  await sp.getByRole("button", { name: "Continuar" }).click(); // equipamentos
  await sp.getByRole("button", { name: "Continuar" }).click(); // músculos
  await sp.getByPlaceholder("Escreva aqui…").fill("Desconforto leve no ombro direito. Contato: bruna@exemplo.com");
  await sp.getByRole("button", { name: "Responder" }).click();
  await sp.getByRole("button", { name: "Pular" }).click();
  await sp.getByRole("button", { name: "Pular" }).click();
  await sp.getByRole("button", { name: "Gerar meu treino" }).click();

  await expect(sp.getByText("Seu treino está pronto.")).toBeVisible();
  await expect(sp.getByText("Supino reto com barra").first()).toBeVisible();
  await expect(sp.getByText("Sugestão de IA", { exact: true })).toBeVisible();
  // slug fora do catálogo foi descartado pelo app
  await expect(sp.getByText("exercicio-inventado")).toHaveCount(0);
  await snap(sp, "ia01-sugestao");

  // nada de dados pessoais enviados ao provedor
  const sent = (await mockRequests()).slice(before);
  expect(sent.length).toBe(1);
  expect(sent[0]).not.toContain(student.name);
  expect(sent[0]).not.toContain(student.email);
  expect(sent[0]).not.toContain("bruna@exemplo.com");
  expect(sent[0]).toContain("ombro direito");

  await sp.getByRole("button", { name: "Treinos mais curtos" }).click();
  await expect(sp.getByText("Ajuste pronto.")).toBeVisible();
  await expect(sp.getByText("O que mudou em relação à versão anterior")).toBeVisible();
  await expect(sp.getByText("Remada baixa na polia").first()).toBeVisible();
  await snap(sp, "ia02-ajuste");
});

test("aluno envia a sugestão para revisão de um profissional", async () => {
  await sp.getByLabel("Profissional", { exact: true }).selectOption({ label: trainer.name });
  await sp.getByLabel("Mensagem (opcional)").fill("Pode revisar por causa do ombro?");
  await sp.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(sp).toHaveURL(/\/aluno\/solicitar-profissional\/[0-9a-f-]{36}$/);
  // não vira treino atual sem revisão
  await sp.goto("/aluno/dashboard");
  await expect(sp.getByText("Treino do dia · Hipertrofia ABC")).toHaveCount(0);
});

test("profissional aceita, revisa a sugestão, troca exercício com IA e publica", async () => {
  await tp.goto("/profissional/solicitacoes");
  await tp.getByRole("link", { name: new RegExp(student.name) }).click();
  await expect(tp.getByText(/Revisão de sugestão gerada por IA/)).toBeVisible();
  await tp.getByRole("button", { name: "Aceitar solicitação" }).click();
  const review = tp.getByRole("region", { name: "Treino enviado para revisão" });
  await expect(review).toBeVisible();
  await expect(review.getByText("Remada baixa na polia")).toBeVisible();
  await snap(tp, "ia03-revisao");
  await review.getByRole("button", { name: "Revisar e criar ficha" }).click();
  await expect(tp).toHaveURL(/\/profissional\/fichas\/[0-9a-f-]{36}\/editar$/);

  await tp.getByRole("button", { name: "Substituir com IA" }).first().click();
  const alternatives = tp.getByRole("region", { name: "Alternativas sugeridas pela IA" });
  await expect(alternatives.getByText("Supino reto com halteres")).toBeVisible();
  await alternatives.getByRole("button", { name: "Trocar por Supino reto com halteres" }).click();
  await expect(tp.getByText("Supino reto com halteres").first()).toBeVisible();
  await tp.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(tp).toHaveURL(/\/profissional\/fichas\/[0-9a-f-]{36}$/);
  await expect(tp.getByText("o aluno ainda não vê esta ficha")).toBeVisible();

  await tp.getByRole("button", { name: "Publicar para o aluno" }).click();
  await tp.getByRole("button", { name: "Confirmar publicação" }).click();
  await expect(tp.getByText("O aluno já vê esta ficha")).toBeVisible();

  await sp.goto("/aluno/dashboard");
  await expect(sp.getByText(/Treino do dia · Hipertrofia ABC/)).toBeVisible();
});

test("profissional gera sugestão para aluno vinculado e salva só como rascunho", async () => {
  await tp.goto("/profissional/treino-ia");
  await tp.getByRole("combobox").selectOption({ label: student.name });
  await tp.getByRole("button", { name: "Selecionar" }).click();
  await tp.getByLabel("Objetivo").selectOption("hipertrofia");
  await tp.getByLabel("Experiência").selectOption("intermediario");
  await tp.getByRole("button", { name: "Gerar sugestão de treino com IA" }).click();
  await expect(tp.getByText("A sugestão não será publicada automaticamente")).toBeVisible();
  await snap(tp, "ia04-profissional");
  await tp.getByRole("button", { name: /Salvar como rascunho para/ }).click();
  await expect(tp).toHaveURL(/\/profissional\/fichas\/[0-9a-f-]{36}$/);
  await expect(tp.getByText("o aluno ainda não vê esta ficha")).toBeVisible();
});

test("aluno tira dúvida de execução com a IA", async () => {
  await sp.goto("/aluno/exercicios/supino-reto-barra");
  await sp.getByLabel("Sua dúvida sobre o exercício").fill("Como evitar sentir no ombro?");
  await sp.getByRole("button", { name: "Perguntar" }).click();
  await expect(sp.getByText("Mantenha as escápulas retraídas")).toBeVisible();
  await expect(sp.getByText("Resposta gerada por IA")).toBeVisible();
});
