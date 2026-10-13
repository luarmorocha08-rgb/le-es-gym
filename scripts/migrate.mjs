#!/usr/bin/env node
// Aplica db/migrations/*.sql em ordem (uma vez cada) e, com --seed, db/seed.sql.
// Uso: node --env-file=.env.local scripts/migrate.mjs [--seed]
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Defina DATABASE_URL (ex.: no .env.local).");
  process.exit(1);
}
const root = path.resolve(import.meta.dirname, "..");
const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  await client.query(`create table if not exists public.schema_migrations (
    name text primary key, applied_at timestamptz not null default now())`);
  await client.query("revoke all on public.schema_migrations from public");
  const applied = new Set((await client.query("select name from public.schema_migrations")).rows.map((r) => r.name));
  const files = (await readdir(path.join(root, "db/migrations"))).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(root, "db/migrations", file), "utf8");
    process.stdout.write(`→ ${file} … `);
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into public.schema_migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log("ok");
    } catch (error) {
      await client.query("rollback");
      console.log("falhou");
      throw error;
    }
  }

  if (process.argv.includes("--seed")) {
    await client.query(await readFile(path.join(root, "db/seed.sql"), "utf8"));
    console.log("→ seed.sql ok");
  }
  // o controle de migrations não deve ser visível aos papéis da aplicação
  await client.query("revoke all on public.schema_migrations from anon, authenticated");
  console.log("Banco atualizado.");
} finally {
  await client.end();
}
