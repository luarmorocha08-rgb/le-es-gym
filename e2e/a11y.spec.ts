import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { approveTrainer, makeAdmin, signup, uniqueTag } from "./helpers";

// Auditoria automática WCAG 2.1 A/AA (axe-core). Movimento reduzido para que
// o conteúdo animado esteja visível na análise de contraste.
test.use({ reducedMotion: "reduce" });

async function audit(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    // mapa do Google em iframe de terceiros fica fora do nosso controle
    .exclude("iframe")
    .analyze();
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`);
  expect(summary, `Violações em ${path}`).toEqual([]);
}

const PUBLIC = ["/", "/academia", "/equipe", "/contato", "/privacidade", "/login", "/cadastro", "/recuperar-senha", "/offline"];

for (const path of PUBLIC) {
  test(`acessibilidade: ${path}`, async ({ page }) => {
    await audit(page, path);
  });
}

test.describe("portais", () => {
  test.skip(!process.env.E2E_WITH_DB || !process.env.DATABASE_URL, "requer banco (E2E_WITH_DB=1 e DATABASE_URL)");
  test.setTimeout(180_000);

  test("acessibilidade: portal do aluno e painel administrativo", async ({ browser }) => {
    const stamp = Date.now();
    const user = { name: `Vera ${uniqueTag(stamp)}`, email: `vera.${stamp}@teste.local`, password: "treino123" };
    const page = await signup(browser, user, false, { reducedMotion: "reduce" });
    await makeAdmin(user.email);
    const paths = [
      "/aluno/dashboard",
      "/aluno/meus-treinos",
      "/aluno/criar-treino",
      "/aluno/exercicios",
      "/aluno/exercicios/supino-reto-barra",
      "/aluno/evolucao",
      "/aluno/solicitar-profissional",
      "/aluno/treino-ia",
      "/aluno/perfil",
      "/admin/dashboard",
      "/admin/profissionais",
      "/admin/usuarios",
      "/admin/vinculos",
      "/admin/exercicios",
      "/admin/exercicios/novo",
      "/admin/horarios",
      "/admin/conteudo",
      "/admin/logs",
      "/admin/logs?aba=ia",
    ];
    for (const path of paths) await audit(page, path);
    await page.context().close();
  });

  test("acessibilidade: portal do profissional", async ({ browser }) => {
    const stamp = Date.now();
    const user = { name: `Caio ${uniqueTag(stamp)}`, email: `caio.${stamp}@teste.local`, password: "treino123" };
    const page = await signup(browser, user, true, { reducedMotion: "reduce" });
    await approveTrainer(user.email, stamp);
    for (const path of [
      "/profissional/dashboard",
      "/profissional/alunos",
      "/profissional/solicitacoes",
      "/profissional/fichas",
      "/profissional/criar-treino?tipo=modelo",
      "/profissional/acompanhamento",
      "/profissional/treino-ia",
      "/profissional/perfil",
    ])
      await audit(page, path);
    await page.context().close();
  });
});
