import { expect, test } from "@playwright/test";

test.describe("Landing page", () => {
  test("exibe o hero com a mensagem principal e os três botões", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Desperte o leão/i);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/em você/i);
    await expect(page.getByText("Seu treino. Sua evolução. Sua força.")).toBeVisible();
    await expect(page.getByRole("link", { name: /Sou aluno/i })).toHaveAttribute("href", "/login?perfil=aluno");
    await expect(page.getByRole("link", { name: /Sou profissional/i })).toHaveAttribute(
      "href",
      "/login?perfil=profissional",
    );
    await expect(page.getByRole("link", { name: /Conhecer a academia/i })).toHaveAttribute("href", "#academia");
  });

  test("apresenta academia, plataforma, experiência e CTA final", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#academia")).toContainText("Av. Dr. Pedro Lessa, 1890");
    await expect(page.locator("#plataforma")).toContainText("Monte seu treino");
    await expect(page.locator("#plataforma")).toContainText("Treine com IA");
    await expect(page.locator("#plataforma")).toContainText("Acompanhamento profissional");
    await expect(page.getByRole("heading", { name: /Os resultados começam aqui/i })).toBeAttached();
    await expect(page.getByText(/dados ilustrativos/i)).toBeAttached();
  });

  test("abas do preview do aluno trocam a tela demonstrativa", async ({ page }) => {
    await page.goto("/#experiencia");
    const tab = page.getByRole("tab", { name: /Evolução/i });
    await tab.scrollIntoViewIfNeeded();
    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toContainText(/Carga/i);
  });

  test("rodapé tem Instagram, WhatsApp e localização reais", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer.getByRole("link", { name: /Instagram/i })).toHaveAttribute(
      "href",
      "https://www.instagram.com/leoesgymc5/",
    );
    await expect(footer.getByRole("link", { name: /WhatsApp/i })).toHaveAttribute(
      "href",
      "https://bit.ly/whatsleoesgymc5",
    );
    await expect(footer.getByRole("link", { name: /Google Maps/i })).toHaveAttribute("href", /google\.com\/maps/);
  });

  test("com movimento reduzido, usa o fallback estático no lugar do WebGL", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForTimeout(800);
    await expect(page.locator("canvas")).toHaveCount(0);
    await context.close();
  });

  test("não há links internos quebrados na landing", async ({ page, request }) => {
    await page.goto("/");
    const hrefs = await page
      .locator('a[href^="/"]')
      .evaluateAll((els) => [...new Set(els.map((e) => (e as HTMLAnchorElement).getAttribute("href")!.split("#")[0]))]);
    for (const href of hrefs.filter(Boolean)) {
      const res = await request.get(href, { maxRedirects: 0 });
      expect(res.status(), href).toBeLessThan(400);
    }
  });
});

test.describe("Navegação mobile", () => {
  test("menu abre, navega e fecha", async ({ page, isMobile }) => {
    test.skip(!isMobile, "somente mobile");
    await page.goto("/");
    await page.getByRole("button", { name: "Abrir menu" }).click();
    const menu = page.getByRole("navigation", { name: "Menu mobile" });
    await expect(menu).toBeVisible();
    await menu.getByRole("link", { name: "Contato" }).click();
    await expect(page).toHaveURL(/\/contato$/);
    await expect(menu).toBeHidden();
  });
});
