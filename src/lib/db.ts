import "server-only";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { getDatabaseUrl } from "@/lib/env";

declare global {
  var __leoesPool: Pool | undefined;
}

/** Pool único por processo (reaproveitado entre recargas em desenvolvimento). */
export function getPool(): Pool | null {
  const url = getDatabaseUrl();
  if (!url) return null;
  globalThis.__leoesPool ??= new Pool({
    connectionString: url,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
  });
  return globalThis.__leoesPool;
}

export type Db = {
  query<R extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<R[]>;
  one<R extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<R | null>;
};

function wrap(client: PoolClient): Db {
  return {
    async query(text, params) {
      return (await client.query(text, params)).rows;
    },
    async one(text, params) {
      return (await client.query(text, params)).rows[0] ?? null;
    },
  };
}

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL não configurada.");
  }
}

/**
 * Executa `fn` numa transação com as permissões do usuário: o papel de banco
 * vira `authenticated` (ou `anon` sem usuário) e `auth.uid()` retorna o id da
 * sessão. Todas as políticas RLS se aplicam.
 */
export async function withUser<T>(userId: string | null, fn: (db: Db) => Promise<T>): Promise<T> {
  const pool = getPool();
  if (!pool) throw new DatabaseNotConfiguredError();
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(userId ? "set local role authenticated" : "set local role anon");
    await client.query("select set_config('app.user_id', $1, true)", [userId ?? ""]);
    const result = await fn(wrap(client));
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/** Consultas públicas (sem sessão), sujeitas às políticas do papel `anon`. */
export function withAnon<T>(fn: (db: Db) => Promise<T>) {
  return withUser(null, fn);
}
