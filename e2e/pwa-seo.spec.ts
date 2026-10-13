import { expect, test } from "@playwright/test";

test("manifest instalável com ícones PNG e maskable", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBeTruthy();
  const manifest = await res.json();
  expect(manifest.display).toBe("standalone");
  const sizes = manifest.icons.map((i: { sizes: string; purpose?: string }) => `${i.sizes}:${i.purpose ?? "any"}`);
  expect(sizes).toEqual(expect.arrayContaining(["192x192:any", "512x512:any", "512x512:maskable"]));
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBeTruthy();
});

test("robots bloqueia áreas autenticadas e aponta o sitemap", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  for (const path of ["/aluno/", "/profissional/", "/admin/", "/api/"]) expect(robots).toContain(`Disallow: ${path}`);
  expect(robots).toMatch(/Sitemap: .+\/sitemap\.xml/);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/contato</loc>");
  expect(sitemap).not.toContain("/aluno");
});

test("home tem dados estruturados reais da academia e imagem de compartilhamento", async ({ page, request }) => {
  await page.goto("/");
  const json = await page.locator('script[type="application/ld+json"]').first().textContent();
  const data = JSON.parse(json ?? "{}");
  expect(data["@type"]).toBe("HealthClub");
  expect(data.address.postalCode).toBe("11025-003");
  expect(data.sameAs).toContain("https://www.instagram.com/leoesgymc5/");
  const og = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(og).toBeTruthy();
  const image = await request.get(new URL(og!).pathname);
  expect(image.headers()["content-type"]).toContain("image/png");
});

test("service worker sem cache e página offline", async ({ baseURL }) => {
  const sw = await fetch(new URL("/sw.js", baseURL));
  expect(sw.headers.get("cache-control")).toContain("no-store");
  expect(await sw.text()).toContain("OFFLINE_URL");
  const offline = await fetch(new URL("/offline", baseURL));
  expect(await offline.text()).toContain("Sem conexão");
});

test("sem conexão, a navegação mostra a página offline do service worker", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // garante que o SW controla a página antes de cortar a rede
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.goto("/academia").catch(() => {});
  await expect(page.getByRole("heading", { name: "Sem conexão" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
  await context.setOffline(false);
  await page.goto("/academia");
  await expect(page.getByRole("heading", { name: "Sem conexão" })).toHaveCount(0);
});
