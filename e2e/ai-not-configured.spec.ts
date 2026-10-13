import { expect, test } from "@playwright/test";
import { signup, uniqueTag } from "./helpers";

// Sem ANTHROPIC_API_KEY o app não gera nem simula nada: mostra "Configuração pendente".
test.skip(
  !process.env.E2E_WITH_DB || !process.env.DATABASE_URL || Boolean(process.env.E2E_AI_MOCK),
  "requer banco e a IA sem chave configurada",
);

test("sem chave da IA, o portal mostra configuração pendente e esconde ações de IA", async ({ browser }) => {
  const stamp = Date.now();
  const page = await signup(browser, { name: `Lia ${uniqueTag(stamp)}`, email: `lia.${stamp}@teste.local`, password: "treino123" }, false);
  await page.goto("/aluno/treino-ia");
  await expect(page.getByText("Configuração pendente")).toBeVisible();
  await expect(page.getByRole("link", { name: "Montar treino manualmente" })).toBeVisible();
  await page.goto("/aluno/exercicios/supino-reto-barra");
  await expect(page.getByText("Tirar dúvida com a IA")).toHaveCount(0);
  await page.close();
});
