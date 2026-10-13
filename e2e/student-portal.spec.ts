import { expect, test, type Page } from "@playwright/test";

// Jornada completa do aluno contra um banco real (E2E_WITH_DB=1).
// Para revisão visual, defina E2E_SCREENSHOTS=<pasta> e as telas são salvas.
test.skip(!process.env.E2E_WITH_DB, "requer banco de dados (E2E_WITH_DB=1)");
test.describe.configure({ mode: "serial" });
test.use({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });
test.setTimeout(90_000);

const shots = process.env.E2E_SCREENSHOTS;
async function snap(page: Page, name: string) {
  if (!shots) return;
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
}

const user = { name: "Bruna Portal", email: `bruna.${Date.now()}@teste.local`, password: "treino123" };
let page: Page;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });
});
test.afterAll(async () => page.close());

test("cadastro leva ao dashboard vazio com chamada para montar treino", async () => {
  await page.goto("/cadastro");
  await page.getByLabel("Nome completo").fill(user.name);
  await page.getByLabel("E-mail").fill(user.email);
  await page.getByLabel("Senha").fill(user.password);
  await page.getByRole("checkbox", { name: /política de privacidade/i }).check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/aluno\/dashboard/);
  await expect(page.getByRole("heading", { name: /Monte seu primeiro treino/i })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeVisible();
  await snap(page, "01-dashboard-vazio");
});

test("biblioteca filtra e mostra instruções", async () => {
  await page.goto("/aluno/exercicios?musculo=peito");
  await expect(page.getByText("Supino reto com barra")).toBeVisible();
  await expect(page.getByText("Agachamento livre com barra")).toHaveCount(0);
  await snap(page, "02-biblioteca");
  await page.getByText("Supino reto com barra").click();
  await expect(page.getByRole("heading", { name: "Supino reto com barra" })).toBeVisible();
  await expect(page.getByText(/Retraia as escápulas/)).toBeVisible();
});

test("monta um treino ABC com exercícios e salva", async () => {
  await page.goto("/aluno/criar-treino");
  await page.getByLabel("Nome do treino").fill("Meu ABC de teste");
  await page.getByRole("button", { name: "Adicionar exercícios" }).click();
  const dialog = page.getByRole("dialog", { name: "Adicionar exercícios" });
  await dialog.getByPlaceholder("Buscar exercício").fill("supino");
  await dialog.getByText("Supino reto com barra").click();
  await dialog.getByText("Supino inclinado com halteres").click();
  await dialog.getByRole("button", { name: "Adicionar" }).click();

  // reordena: inclinado para cima
  await page.getByRole("button", { name: "Mover para cima" }).nth(1).click();
  await expect(page.locator("li p.font-heading").first()).toContainText("Supino inclinado");

  // ajusta séries e repetições do primeiro exercício
  const sets = page.getByLabel("Séries").first();
  await sets.fill("2");
  const reps = page.getByLabel("Repetições").first();
  await reps.fill("12-8");
  await page.getByRole("button", { name: "Salvar treino" }).click();
  await expect(page.getByText("Faixa inválida.")).toBeVisible();
  await reps.fill("8-12");
  await snap(page, "03-editor");

  // dia B com um exercício
  await page.getByRole("tab", { name: /^B/ }).click();
  await page.getByRole("button", { name: "Adicionar exercícios" }).click();
  await dialog.getByPlaceholder("Buscar exercício").fill("puxada");
  await dialog.getByText("Puxada frontal na polia").click();
  await dialog.getByRole("button", { name: "Adicionar" }).click();

  await page.getByRole("button", { name: "Salvar treino" }).click();
  await expect(page).toHaveURL(/\/aluno\/meus-treinos\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Meu ABC de teste" })).toBeVisible();
  await expect(page.getByText("Treino atual")).toBeVisible();
  await expect(page.getByText("2 × 8-12")).toBeVisible();
  await snap(page, "04-ficha");
});

test("modo treino registra séries, mostra descanso e conclui", async () => {
  await page.goto("/aluno/dashboard");
  await expect(page.getByRole("heading", { name: /Pronto para mais uma conquista/i })).toBeVisible();
  await snap(page, "05-dashboard-com-treino");
  await page.getByRole("button", { name: "Iniciar treino" }).click();
  await expect(page).toHaveURL(/\/aluno\/treino\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Supino inclinado com halteres" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navegação principal" })).toHaveCount(0);

  await page.getByLabel("Carga (kg)", { exact: true }).first().fill("20");
  await page.getByRole("button", { name: "Concluir série 1" }).click();
  await expect(page.getByRole("timer")).toBeVisible();
  await snap(page, "06-modo-treino-descanso");
  await page.getByRole("button", { name: "Pular" }).click();

  await page.getByRole("button", { name: "Concluir série 2" }).click();
  await page.getByRole("button", { name: /Pular|Próxima série/ }).click();
  await expect(page.getByRole("progressbar", { name: "Progresso do treino" })).toHaveAttribute("aria-valuenow", "2");

  // recarregar não perde nada e retoma no primeiro exercício pendente
  await page.reload();
  await expect(page.getByRole("progressbar", { name: "Progresso do treino" })).toHaveAttribute("aria-valuenow", "2");
  await expect(page.getByRole("heading", { name: "Supino reto com barra" })).toBeVisible();
  await page.getByLabel("Carga (kg)", { exact: true }).first().fill("40");
  await page.getByRole("button", { name: "Concluir série 1" }).click();
  await page.getByRole("button", { name: /Pular|Próxima série/ }).click();

  await page.getByRole("button", { name: "Concluir treino" }).click();
  const finish = page.getByRole("dialog", { name: "Concluir treino" });
  await finish.getByRole("button", { name: "7" }).click();
  await finish.getByRole("button", { name: "Concluir" }).click();
  await expect(page.getByRole("heading", { name: "Treino concluído." })).toBeVisible();
  await expect(page.getByText("Mais um passo na sua evolução.")).toBeVisible();
  await snap(page, "07-treino-concluido");
});

test("dashboard reflete o treino e sugere o próximo dia", async () => {
  await page.goto("/aluno/dashboard");
  await expect(page.getByText(/Treino B/).first()).toBeVisible();
  await expect(page.getByText("1 treino ·", { exact: false })).toBeVisible();
  await snap(page, "08-dashboard-apos-treino");
});

test("evolução mostra histórico, recordes, metas e exige consentimento para medidas", async () => {
  await page.goto("/aluno/evolucao");
  await expect(page.getByRole("cell", { name: "Supino reto com barra" })).toBeVisible();
  await page.getByLabel("Nova meta").fill("Supino com 60 kg");
  await page.getByLabel("Alvo").fill("60");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await expect(page.getByText("Supino com 60 kg")).toBeVisible();
  await page.getByRole("button", { name: /Marcar meta Supino com 60 kg como concluída/ }).click();
  await expect(page.getByRole("button", { name: /Reabrir meta/ })).toBeVisible();
  await expect(page.getByText("Autorização necessária")).toBeVisible();
  await snap(page, "09-evolucao");
});

test("perfil: dados de saúde só com consentimento; medidas liberadas depois", async () => {
  await page.goto("/aluno/perfil");
  await page.getByLabel(/Limitações físicas/).fill("Desconforto leve no joelho esquerdo");
  await page.getByRole("button", { name: "Salvar informações de saúde" }).click();
  await expect(page.getByText("Para salvar dados de saúde é preciso autorizar o tratamento.")).toBeVisible();
  await page.getByRole("checkbox", { name: /Autorizo a LEÕES GYM C5 a tratar/ }).check();
  await page.getByRole("button", { name: "Salvar informações de saúde" }).click();
  await expect(page.getByText("Informações de saúde salvas.")).toBeVisible();

  await page.getByLabel("Dias/semana").selectOption("4");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page.getByText("Perfil atualizado.")).toBeVisible();
  await snap(page, "10-perfil");

  await page.goto("/aluno/evolucao#medidas");
  await page.getByLabel("Peso (kg)").fill("72,5".replace(",", "."));
  await page.getByRole("button", { name: "Salvar registro" }).click();
  await expect(page.getByText("Registro salvo.")).toBeVisible();
  await expect(page.getByRole("cell", { name: "72.5" })).toBeVisible();
});

test("Meu Treinador: envia solicitação, conversa e cancela", async () => {
  await page.goto("/aluno/solicitar-profissional");
  await expect(page.getByRole("heading", { name: "Nova solicitação" })).toBeVisible();
  const trainer = page.getByRole("radio").first();
  test.skip((await trainer.count()) === 0, "nenhum profissional público no banco de teste");
  await page.getByLabel("Objetivo principal").selectOption("hipertrofia");
  await page.getByLabel("Observações para o profissional").fill("Quero focar em membros superiores.");
  await page.getByRole("button", { name: "Enviar solicitação" }).click();
  await expect(page).toHaveURL(/\/aluno\/solicitar-profissional\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Aguardando profissional").first()).toBeVisible();
  await page.getByRole("textbox", { name: "Mensagem" }).fill("Olá! Treino de manhã.");
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByText("Olá! Treino de manhã.")).toBeVisible();
  await snap(page, "11-solicitacao");
  await page.getByRole("button", { name: "Cancelar solicitação" }).click();
  await expect(page.getByText("Cancelado").first()).toBeVisible();
});

test("exporta os dados em JSON", async () => {
  const res = await page.request.get("/aluno/perfil/exportar");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-disposition"]).toContain("attachment");
  const data = await res.json();
  expect(data.profile.full_name).toBe(user.name);
  expect(data.workout_sessions).toHaveLength(1);
  expect(data.health_info.limitations).toContain("joelho");
});

test("exclui a conta com senha e confirmação", async () => {
  await page.goto("/aluno/perfil");
  await page.getByText("Excluir minha conta").click();
  await page.getByLabel("Sua senha").fill(user.password);
  await page.getByLabel('Digite "EXCLUIR"').fill("excluir");
  await page.getByRole("button", { name: "Excluir conta permanentemente" }).click();
  await expect(page.getByText("Digite EXCLUIR para confirmar.")).toBeVisible();
  await page.getByLabel('Digite "EXCLUIR"').fill("EXCLUIR");
  await page.getByRole("button", { name: "Excluir conta permanentemente" }).click();
  await expect(page).toHaveURL(/\/\?conta=excluida/);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(user.email);
  await page.getByLabel("Senha").fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
});
