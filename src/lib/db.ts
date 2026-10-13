import "server-only";
import { Pool, types, type PoolClient, type QueryResultRow } from "pg";
import { getDatabaseUrl } from "@/lib/env";

/**
 * Parsers do pool da aplicação: datas chegam como string ISO (serializáveis
 * e com tipagem honesta) e `date` fica "YYYY-MM-DD". O Better Auth usa um
 * pool separado com os parsers padrão (ele espera objetos Date).
 */
const appTypes = {
  getTypeParser(oid: number, format?: "text" | "binary") {
    if (oid === types.builtins.TIMESTAMPTZ) return (v: string) => new Date(v).toISOString();
    if (oid === types.builtins.TIMESTAMP) return (v: string) => new Date(`${v}Z`).toISOString();
    if (oid === types.builtins.DATE) return (v: string) => v;
    return types.getTypeParser(oid, format as "text");
  },
};

declare global {
  var __leoesPool: Pool | undefined;
  var __leoesAuthPool: Pool | undefined;
}

function createPool(url: string, custom: boolean) {
  return new Pool({
    connectionString: url,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    ...(custom ? { types: appTypes } : {}),
  });
}

/** Pool da aplicação, único por processo (reaproveitado entre recargas em dev). */
export function getPool(): Pool | null {
  const url = getDatabaseUrl();
  if (!url) return null;
  globalThis.__leoesPool ??= createPool(url, true);
  return globalThis.__leoesPool;
}

/** Pool usado pelo Better Auth (schema auth), com parsers padrão do pg. */
export function getAuthPool(): Pool | null {
  const url = getDatabaseUrl();
  if (!url) return null;
  globalThis.__leoesAuthPool ??= createPool(url, false);
  return globalThis.__leoesAuthPool;
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
