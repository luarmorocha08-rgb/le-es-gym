import { expect, test, type Page } from "@playwright/test";

// Fluxo real de conta: só roda quando o servidor de teste tem banco configurado
// (E2E_WITH_DB=1). Usa e-mails únicos a cada execução.
test.skip(!process.env.E2E_WITH_DB, "requer banco de dados (E2E_WITH_DB=1)");
test.describe.configure({ mode: "serial" });

const stamp = Date.now();
const student = { name: "Aluna Teste", email: `aluna.${stamp}@teste.local`, password: "treino123" };
const pro = { name: "Treinador Teste", email: `pro.${stamp}@teste.local`, password: "treino123" };

async function signup(page: Page, user: typeof student, professional = false) {
  await page.goto(professional ? "/cadastro?perfil=profissional" : "/cadastro");
  await page.getByLabel("Nome completo").fill(user.name);
  await page.getByLabel("E-mail").fill(user.email);
  await page.getByLabel("Senha").fill(user.password);
  if (professional) await page.getByLabel("Registro CREF").fill("000000-G/SP");
  await page.getByRole("checkbox", { name: /política de privacidade/i }).check();
  await page.getByRole("button", { name: "Criar conta" }).click();
}

test("aluno se cadastra, cai no portal, sai e entra de novo", async ({ page }) => {
  await signup(page, student);
  await expect(page).toHaveURL(/\/aluno\/dashboard/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Aluna");
  await expect(page.getByText("Treinos concluídos")).toBeVisible();

  await page.getByRole("button", { name: "Sair da conta" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/aluno/dashboard");
  await expect(page).toHaveURL(/\/login\?next=/);

  await page.getByLabel("E-mail").fill(student.email);
  await page.getByLabel("Senha").fill("senhaerrada1");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();

  await page.getByLabel("Senha").fill(student.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/aluno\/dashboard/);
});

test("e-mail duplicado é recusado", async ({ page }) => {
  await signup(page, student);
  await expect(page.getByText("Já existe uma conta com este e-mail.")).toBeVisible();
});

test("aluno não acessa áreas de profissional nem de admin", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(student.email);
  await page.getByLabel("Senha").fill(student.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/aluno\/dashboard/);

  await page.goto("/admin/dashboard");
  await expect(page).toHaveURL(/acesso-negado\?motivo=admin/);
  await page.goto("/profissional/dashboard");
  await expect(page).toHaveURL(/acesso-negado\?motivo=profissional$/);
});

test("cadastro profissional fica pendente de aprovação", async ({ page }) => {
  await signup(page, pro, true);
  await expect(page).toHaveURL(/acesso-negado\?motivo=profissional-pendente/);
  await expect(page.getByRole("heading", { name: /Cadastro profissional em análise/i })).toBeVisible();

  await page.goto("/profissional/dashboard");
  await expect(page).toHaveURL(/profissional-pendente/);
  await page.goto("/aluno/dashboard");
  await expect(page.getByText(/cadastro profissional está em análise/i)).toBeVisible();
});
