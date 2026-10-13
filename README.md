# LEÕES GYM C5 — Smart Fitness Experience

> "SE VOCÊ QUER SER UM LEÃO, DEVE TREINAR COM OS LEÕES."

Plataforma da academia LEÕES GYM C5 (Santos/SP): site cinematográfico, portal do
aluno, portal do profissional e painel administrativo, com Postgres e IA.

- Arquitetura, modelo de dados e plano por etapas: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 4 ·
componentes próprios no estilo shadcn/ui · Lucide · GSAP + ScrollTrigger +
SplitText · Lenis · Motion · Three.js + React Three Fiber + Drei ·
**PostgreSQL (qualquer provedor) com RLS** · **Better Auth** (login por e-mail e
senha) · Zod · Vitest · Playwright.

## Rodando localmente

```bash
npm install
cp .env.example .env.local      # gere o BETTER_AUTH_SECRET: openssl rand -base64 32
docker compose up -d            # Postgres local (ou use um banco do Neon)
npm run db:seed                 # aplica as migrations + biblioteca de exercícios
npm run dev                     # http://localhost:3000
```

Sem `DATABASE_URL`/`BETTER_AUTH_SECRET` o site público funciona normalmente e
as telas de login/cadastro exibem **"Configuração pendente"** — nada é simulado.

Em desenvolvimento, sem provedor de e-mail, os links de recuperação de senha
aparecem no terminal do servidor.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm run lint` · `npm run typecheck` | ESLint · tipos de rotas + `tsc` |
| `npm test` | Testes unitários (Vitest) |
| `npm run test:e2e` | Testes E2E (Playwright, desktop + mobile). Com `E2E_WITH_DB=1` inclui o fluxo real de conta |
| `npm run db:migrate` | Aplica migrations pendentes de `db/migrations` |
| `npm run db:seed` | Migrations + seed da biblioteca de exercícios |
| `npm run db:make-admin -- email@x.com` | Torna uma conta cadastrada administradora (1º admin) |
| `npm run test:db` | Banco descartável + testes de RLS (requer `DATABASE_URL` de um Postgres local) |

## Credenciais necessárias

### 1. Banco de dados Postgres (obrigatório para login e portais)

Qualquer Postgres 14+ serve. Sugestão: **[Neon](https://neon.tech)** (possui plano
gratuito; confira os limites atuais no site). Railway ou um Postgres próprio também funcionam.

1. Crie um projeto no Neon → copie a *connection string* (com `?sslmode=require`) → `DATABASE_URL`.
2. Gere o segredo das sessões: `openssl rand -base64 32` → `BETTER_AUTH_SECRET`.
3. Defina `BETTER_AUTH_URL` e `NEXT_PUBLIC_SITE_URL` com a URL do site.
4. `npm run db:seed` (aplica schema, políticas RLS e exercícios).
5. Cadastre-se pelo site e rode `npm run db:make-admin -- seu-email@exemplo.com`.
   Depois disso, novos papéis são concedidos apenas pelas funções administrativas.

> O usuário do banco precisa poder criar papéis (`CREATEROLE`) na primeira
> migração — o usuário padrão do Neon, Railway, Supabase ou Docker já pode.

### E-mails (opcional, recomendado em produção)

Para confirmação de cadastro e recuperação de senha, crie uma conta no
[Resend](https://resend.com), verifique o domínio e defina `RESEND_API_KEY` e
`EMAIL_FROM`. Sem isso, a confirmação de e-mail fica desativada e a
recuperação de senha mostra "não configurada" em produção.

### 2. Provedor de IA (Etapa 6)

- Crie uma chave em <https://console.anthropic.com/> → `ANTHROPIC_API_KEY`, e defina `AI_MODEL`.
- A chave fica apenas no servidor. Sem ela, o gerador mostra "configuração pendente".

### 3. Mídias da academia (opcional, recomendado)

Coloque vídeo e fotos **da própria academia** em `public/media/` e informe os
caminhos em `src/content/gym.ts` (`media.heroVideo`, `media.heroPoster`,
`media.gallery`). Enquanto vazios, a landing usa a cena 3D procedural — sem
imagens genéricas. Se houver o arquivo vetorial oficial do logotipo, ele pode
substituir o emblema em `src/components/brand/emblem.tsx`.

## Segurança

- Papéis nunca vêm do cliente: cadastro sempre cria "aluno"; profissional
  depende de aprovação; admin é concedido por outro admin.
- Cada requisição roda no banco como o papel `authenticated` com o id da
  sessão: as políticas RLS valem mesmo se houver bug no código. Testes em
  `db/tests`. As tabelas de login (schema `auth`) ficam inacessíveis a esse papel.
- Parâmetro `next` sanitizado contra open redirect; cabeçalhos de segurança
  em `next.config.ts`; segredos somente no servidor; limite de tentativas de
  login pelo Better Auth.
