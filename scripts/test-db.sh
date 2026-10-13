#!/usr/bin/env bash
# Aplica as migrations + seed em um banco descartável e roda os testes de RLS.
# Uso: DATABASE_URL=postgres://postgres@localhost:5432/postgres scripts/test-db.sh
set -euo pipefail
cd "$(dirname "$0")/.."
: "${DATABASE_URL:?Defina DATABASE_URL apontando para um Postgres local descartável}"
DB=leoes_rls_test_$$
psql "$DATABASE_URL" -qc "create database $DB"
trap 'psql "$DATABASE_URL" -qc "drop database if exists $DB" >/dev/null' EXIT
URL="${DATABASE_URL%/*}/$DB"
for f in db/migrations/*.sql; do psql "$URL" -q -v ON_ERROR_STOP=1 -f "$f"; done
psql "$URL" -q -v ON_ERROR_STOP=1 -f db/seed.sql
psql "$URL" -q -t -v ON_ERROR_STOP=1 -f db/tests/rls_test.sql 2>&1 | sed 's/^psql:[^ ]* NOTICE:  //' | grep -E "OK|FALHA|ERRO|ERROR|PASSARAM"
