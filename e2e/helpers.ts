import type { Browser, BrowserContextOptions } from "@playwright/test";
import pg from "pg";

export type TestUser = { name: string; email: string; password: string };

/** Nomes só aceitam letras: sufixo único derivado do timestamp. */
export function uniqueTag(stamp: number) {
  return String(stamp).slice(-6).replace(/\d/g, (d) => "abcdefghij"[Number(d)]);
}

export async function signup(browser: Browser, user: TestUser, professional: boolean, options: BrowserContextOptions = {}) {
  // contexto explícito (exigido pelo axe-core); feche com page.context().close()
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...options });
  const page = await context.newPage();
  await page.goto(professional ? "/cadastro?perfil=profissional" : "/cadastro");
  await page.getByLabel("Nome completo").fill(user.name);
  await page.getByLabel("E-mail").fill(user.email);
  await page.getByLabel("Senha").fill(user.password);
  if (professional) await page.getByLabel("Registro CREF").fill("123456-G/SP");
  await page.getByRole("checkbox", { name: /política de privacidade/i }).check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.waitForURL(professional ? /profissional-pendente/ : /\/aluno\/dashboard/);
  return page;
}

/** Aprovação feita como um admin de teste (atalho de teste; a tela fica em /admin/profissionais). */
export async function approveTrainer(email: string, stamp: number) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query("select id from auth.users where email = $1", [email]);
    const trainerId = rows[0].id;
    const admin = await client.query(
      `insert into auth.users (name, email, "emailVerified") values ('Admin E2E', $1, true) returning id`,
      [`admin.${stamp}@teste.local`],
    );
    const adminId = admin.rows[0].id;
    await client.query("insert into public.user_roles (user_id, role) values ($1, 'admin')", [adminId]);
    await client.query("begin");
    await client.query("set local role authenticated");
    await client.query("select set_config('app.user_id', $1, true)", [adminId]);
    await client.query("select public.review_professional($1, 'aprovado', 'E2E')", [trainerId]);
    await client.query("commit");
  } finally {
    await client.end();
  }
}

/** Promove uma conta já cadastrada a administradora (como scripts/make-admin.mjs). */
export async function makeAdmin(email: string) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(
      `insert into public.user_roles (user_id, role) select id, 'admin' from auth.users where email = $1 on conflict do nothing`,
      [email],
    );
  } finally {
    await client.end();
  }
}
