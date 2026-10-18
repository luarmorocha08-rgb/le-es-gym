import { expect, test } from "@playwright/test";

// Sem banco configurado (E2E_WITH_DB ausente) também verificam o estado
// de "configuração pendente"; com banco, a proteção de rotas segue valendo.
const dbConfigured = Boolean(process.env.E2E_WITH_DB);

test.describe("Autenticação e proteção de rotas", () => {
  for (const path of ["/aluno/dashboard", "/profissional/dashboard", "/admin/dashboard"]) {
    test(`redireciona visitante de ${path} para o login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByRole("heading", { name: /Bem-vindo de volta/i })).toBeVisible();
    });
  }

  test("botão Sou aluno leva ao login do aluno", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Sou aluno/i }).click();
    await expect(page).toHaveURL(/\/login\?perfil=aluno/);
    await expect(page.getByText("Portal do aluno")).toBeVisible();
  });

  test("login mostra configuração pendente sem simular acesso", async ({ page }) => {
    test.skip(dbConfigured, "somente sem banco configurado");
    await page.goto("/login");
    await expect(page.getByText("Configuração pendente")).toBeVisible();
    await expect(page.getByLabel("E-mail")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeDisabled();
  });

  test("cadastro profissional pede CREF e informa aprovação", async ({ page }) => {
    await page.goto("/cadastro?perfil=profissional");
    await expect(page.getByLabel("Registro CREF")).toBeVisible();
    await expect(page.getByText(/somente após aprovação da administração/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /política de privacidade/i })).toHaveAttribute("href", "/privacidade");
  });

  test("open redirect é neutralizado no parâmetro next", async ({ page }) => {
    await page.goto("/login?next=//evil.example");
    const hidden = page.locator('input[name="next"]');
    await expect(hidden).toHaveValue("/aluno/dashboard");
  });

  test("acesso negado explica cadastro profissional pendente", async ({ page }) => {
    await page.goto("/acesso-negado?motivo=profissional-pendente");
    await expect(page.getByRole("heading", { name: /Cadastro profissional em análise/i })).toBeVisible();
  });

  test("página inexistente mostra 404 da marca", async ({ page }) => {
    const res = await page.goto("/rota-que-nao-existe");
    expect(res?.status()).toBe(404);
    await expect(page.getByText("Território desconhecido.")).toBeVisible();
  });
});

test.describe("Páginas públicas", () => {
  for (const [path, heading] of [
    ["/academia", /Onde o treino/i],
    ["/equipe", /Quem move/i],
    ["/contato", /Vem treinar/i],
    ["/privacidade", /Seus dados/i],
  ] as const) {
    test(`${path} carrega`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
    });
  }
});
