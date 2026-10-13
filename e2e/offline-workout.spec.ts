import { expect, test } from "@playwright/test";
import { signup, uniqueTag } from "./helpers";

// Séries registradas sem conexão ficam pendentes e são enviadas quando ela volta.
test.skip(!process.env.E2E_WITH_DB || !process.env.DATABASE_URL, "requer banco (E2E_WITH_DB=1 e DATABASE_URL)");
test.setTimeout(120_000);

test("série registrada offline é salva ao reconectar", async ({ browser }) => {
  const stamp = Date.now();
  const page = await signup(browser, { name: `Nina ${uniqueTag(stamp)}`, email: `nina.${stamp}@teste.local`, password: "treino123" }, false);
  const context = page.context();

  await page.goto("/aluno/criar-treino");
  await page.getByLabel("Nome do treino").fill("Treino offline");
  await page.getByRole("button", { name: "Adicionar exercícios" }).click();
  const dialog = page.getByRole("dialog", { name: "Adicionar exercícios" });
  await dialog.getByPlaceholder("Buscar exercício").fill("supino reto");
  await dialog.getByText("Supino reto com barra").click();
  await dialog.getByRole("button", { name: "Adicionar" }).click();
  await page.getByRole("button", { name: "Salvar treino" }).click();
  await expect(page.getByRole("heading", { name: "Treino offline" })).toBeVisible();

  await page.goto("/aluno/dashboard");
  await page.getByRole("button", { name: "Iniciar treino" }).click();
  await expect(page).toHaveURL(/\/aluno\/treino\/[0-9a-f-]{36}$/);

  await context.setOffline(true);
  await page.getByLabel("Carga (kg)", { exact: true }).first().fill("42.5");
  await page.getByRole("button", { name: "Concluir série 1" }).click();
  await expect(page.getByText("Sem conexão — esta série será salva assim que a conexão voltar.")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Sem conexão. O que você registrar" })).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByRole("timer")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Sem conexão — esta série")).toHaveCount(0);

  // persistiu no servidor
  await page.reload();
  await expect(page.getByText("42.5").first()).toBeVisible();
  await page.context().close();
});
