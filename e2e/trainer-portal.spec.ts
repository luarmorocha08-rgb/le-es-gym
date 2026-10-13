import { expect, test, type Page } from "@playwright/test";
import { approveTrainer, signup, uniqueTag } from "./helpers";

// Jornada aluno ↔ profissional contra banco real.
// Requer E2E_WITH_DB=1 e DATABASE_URL (para aprovar o profissional, papel do admin).
test.skip(!process.env.E2E_WITH_DB || !process.env.DATABASE_URL, "requer banco (E2E_WITH_DB=1 e DATABASE_URL)");
test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

const stamp = Date.now();
const tag = uniqueTag(stamp);
const student = { name: `Carla ${tag}`, email: `carla.${stamp}@teste.local`, password: "treino123" };
const trainer = { name: `Rafael ${tag}`, email: `rafael.${stamp}@teste.local`, password: "treino123" };
const shots = process.env.E2E_SCREENSHOTS;

let sp: Page; // aluno
let tp: Page; // profissional

async function snap(page: Page, name: string) {
  if (!shots) return;
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
}

test.beforeAll(async ({ browser }) => {
  sp = await signup(browser, student, false);
  tp = await signup(browser, trainer, true);
  await approveTrainer(trainer.email, stamp);
});
test.afterAll(async () => {
  await sp?.context().close();
  await tp?.context().close();
});

test("profissional aprovado configura o perfil público", async () => {
  await tp.goto("/profissional/perfil");
  await tp.getByLabel("Especialidades").fill("hipertrofia, força");
  await tp.getByLabel("Apresentação").fill("Treinos de força com técnica impecável.");
  await tp.getByRole("checkbox", { name: /Exibir meu perfil/ }).check();
  await tp.getByRole("button", { name: "Salvar perfil profissional" }).click();
  await expect(tp.getByText("Perfil profissional atualizado.")).toBeVisible();
  await tp.goto("/equipe");
  await expect(tp.getByRole("heading", { name: trainer.name })).toBeVisible();
});

test("aluno solicita treino ao profissional", async () => {
  await sp.goto("/aluno/solicitar-profissional");
  await sp.getByRole("radio", { name: new RegExp(trainer.name) }).check();
  await sp.getByLabel("Objetivo principal").selectOption("forca");
  await sp.getByLabel("Observações para o profissional").fill("Quero melhorar o supino.");
  await sp.getByRole("button", { name: "Enviar solicitação" }).click();
  await expect(sp).toHaveURL(/\/aluno\/solicitar-profissional\/[0-9a-f-]{36}$/);
});

test("profissional aceita, monta rascunho invisível ao aluno e publica", async () => {
  await tp.goto("/profissional/dashboard");
  await expect(tp.getByText(student.name).first()).toBeVisible();
  await snap(tp, "p01-painel");
  await tp.goto("/profissional/solicitacoes");
  await tp.getByRole("link", { name: new RegExp(student.name) }).click();
  await tp.getByRole("button", { name: "Aceitar solicitação" }).click();
  await expect(tp.getByText("Em análise").first()).toBeVisible();

  await tp.getByRole("link", { name: "Montar ficha" }).click();
  await expect(tp.getByText("Quero melhorar o supino.")).toBeVisible();
  await tp.getByLabel("Nome do treino").fill("Força — Fase 1");
  await tp.getByRole("button", { name: "Adicionar exercícios" }).click();
  const dialog = tp.getByRole("dialog", { name: "Adicionar exercícios" });
  await dialog.getByPlaceholder("Buscar exercício").fill("supino reto");
  await dialog.getByText("Supino reto com barra").click();
  await dialog.getByRole("button", { name: "Adicionar" }).click();
  await tp.getByLabel("Séries").first().fill("5");
  await tp.getByLabel("Repetições").first().fill("5");
  await tp.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(tp).toHaveURL(/\/profissional\/fichas\/[0-9a-f-]{36}$/);
  await expect(tp.getByText("o aluno ainda não vê esta ficha")).toBeVisible();
  await snap(tp, "p02-rascunho");

  // o aluno não vê o rascunho
  await sp.goto("/aluno/meus-treinos");
  await expect(sp.getByText("Força — Fase 1")).toHaveCount(0);

  await tp.getByRole("button", { name: "Publicar para o aluno" }).click();
  await tp.getByLabel("Nota da versão (opcional)").fill("Primeira prescrição");
  await tp.getByRole("button", { name: "Confirmar publicação" }).click();
  await expect(tp.getByText("O aluno já vê esta ficha")).toBeVisible();
});

test("aluno recebe a prescrição como treino atual e pede ajuste", async () => {
  await sp.goto("/aluno/dashboard");
  await expect(sp.getByText("Treino do dia · Força — Fase 1")).toBeVisible();
  await expect(sp.getByText("Novo treino disponível")).toBeVisible();
  await sp.goto("/aluno/solicitar-profissional");
  await sp.getByRole("link", { name: new RegExp(trainer.name) }).first().click();
  await expect(sp.getByText("Entregue").first()).toBeVisible();
  await sp.getByRole("button", { name: "Solicitar ajuste" }).click();
  await sp.getByLabel("O que precisa ser ajustado?").fill("Pode incluir um exercício de costas?");
  await sp.getByRole("button", { name: "Enviar pedido de ajuste" }).click();
  await expect(sp.getByText("Ajuste solicitado").first()).toBeVisible();
});

test("profissional cria nova versão, compara e publica v2", async () => {
  await tp.goto("/profissional/solicitacoes?aba=ajustes");
  await tp.getByRole("link", { name: new RegExp(student.name) }).click();
  await expect(tp.getByText("Ajuste solicitado pelo aluno")).toBeVisible();
  await tp.getByRole("link", { name: /Força — Fase 1/ }).first().click();
  await tp.getByRole("button", { name: "Nova versão" }).click();
  await expect(tp).toHaveURL(/\/editar$/);
  await tp.getByRole("button", { name: "Adicionar exercícios" }).click();
  const dialog = tp.getByRole("dialog", { name: "Adicionar exercícios" });
  await dialog.getByPlaceholder("Buscar exercício").fill("remada curvada");
  await dialog.getByText("Remada curvada com barra").click();
  await dialog.getByRole("button", { name: "Adicionar" }).click();
  await tp.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(tp.getByText("Comparação com a versão publicada")).toBeVisible();
  await expect(tp.getByText("Remada curvada com barra").first()).toBeVisible();
  await snap(tp, "p03-comparacao");
  await tp.getByRole("button", { name: "Publicar nova versão" }).click();
  await tp.getByRole("button", { name: "Confirmar publicação" }).click();
  await expect(tp.getByText("O aluno já vê esta ficha")).toBeVisible();
  await expect(tp.getByText("Versão 2").first()).toBeVisible();
});

test("aluno vê a versão 2 e a anterior arquivada", async () => {
  await sp.goto("/aluno/meus-treinos");
  await expect(sp.getByText("Arquivados (1)")).toBeVisible();
  await sp.getByRole("link", { name: /Força — Fase 1.*Atual/ }).click();
  await expect(sp.getByText("versão 2", { exact: false })).toBeVisible();
  await expect(sp.getByText("Remada curvada com barra")).toBeVisible();
});

test("profissional acompanha o aluno, registra nota privada e salva modelo", async () => {
  await tp.goto("/profissional/alunos");
  await tp.getByRole("link", { name: new RegExp(student.name) }).click();
  await expect(tp.getByRole("heading", { name: student.name })).toBeVisible();
  await tp.getByLabel("Nova observação").fill("Acompanhar evolução do supino.");
  await tp.getByRole("button", { name: "Salvar observação" }).click();
  await expect(tp.getByText("Acompanhar evolução do supino.")).toBeVisible();
  await snap(tp, "p04-aluno");

  await tp.goto("/profissional/acompanhamento");
  await expect(tp.getByRole("link", { name: student.name })).toBeVisible();
  await snap(tp, "p05-acompanhamento");

  await tp.goto("/profissional/fichas");
  await tp.getByRole("link", { name: /Força — Fase 1/ }).first().click();
  await tp.getByRole("button", { name: "Salvar como modelo" }).click();
  await expect(tp.getByText("Modelo", { exact: true })).toBeVisible();
  await tp.goto("/profissional/fichas");
  await expect(tp.getByText("Modelos (1)")).toBeVisible();
});

test("aluno não acessa o portal do profissional", async () => {
  await sp.goto("/profissional/alunos");
  await expect(sp).toHaveURL(/acesso-negado/);
});
