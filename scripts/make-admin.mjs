#!/usr/bin/env node
// Concede o papel de administrador a uma conta já cadastrada (bootstrap do 1º admin).
// Uso: node --env-file=.env.local scripts/make-admin.mjs email@exemplo.com
import pg from "pg";

const email = process.argv[2]?.trim().toLowerCase();
if (!process.env.DATABASE_URL || !email) {
  console.error("Uso: DATABASE_URL=... node scripts/make-admin.mjs email@exemplo.com");
  process.exit(1);
}
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const { rows } = await client.query(
    `insert into public.user_roles (user_id, role)
     select id, 'admin' from auth.users where lower(email) = $1
     on conflict do nothing returning user_id`,
    [email],
  );
  const exists = (await client.query("select 1 from auth.users where lower(email) = $1", [email])).rowCount;
  if (!exists) {
    console.error(`Nenhuma conta com o e-mail ${email}. Cadastre-se no site primeiro.`);
    process.exitCode = 1;
  } else {
    if (rows.length) {
      await client.query(
        "insert into public.audit_logs (action, entity, entity_id, metadata) values ('conceder_papel', 'user_roles', $1, '{\"role\":\"admin\",\"origem\":\"script\"}')",
        [rows[0].user_id],
      );
    }
    console.log(rows.length ? `${email} agora é administrador.` : `${email} já era administrador.`);
  }
} finally {
  await client.end();
}
