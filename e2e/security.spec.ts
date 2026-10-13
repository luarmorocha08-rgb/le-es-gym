import { expect, test } from "@playwright/test";
import { signup, uniqueTag } from "./helpers";

// Proteção contra força bruta nas Server Actions de login (contadores no banco).
test.skip(!process.env.E2E_WITH_DB || !process.env.DATABASE_URL, "requer banco (E2E_WITH_DB=1 e DATABASE_URL)");

test("login bloqueia após muitas tentativas para o mesmo e-mail", async ({ browser }) => {
  test.setTimeout(90_000);
  const stamp = Date.now();
  const user = { name: `Rui ${uniqueTag(stamp)}`, email: `rui.${stamp}@teste.local`, password: "treino123" };
  const owner = await signup(browser, user, false);
  await owner.context().close();

  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login");
  const message = page.getByRole("alert").filter({ hasText: /incorretos|Muitas tentativas/ });
  for (let i = 0; i < 8; i++) {
    await page.getByLabel("E-mail").fill(user.email);
    await page.getByLabel("Senha").fill(`errada${i}xx`);
    // espera a resposta desta tentativa (a anterior ainda está na tela)
    const response = page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/login"));
    await page.getByRole("button", { name: "Entrar" }).click();
    await response;
    await expect(message).toBeVisible();
    await expect(message).not.toContainText("Muitas tentativas");
  }
  // 9ª tentativa — mesmo com a senha certa — é bloqueada
  await page.getByLabel("Senha").fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText(/Muitas tentativas\. Aguarde \d+ minutos?/)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
  await context.close();
});
