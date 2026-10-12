# LEÕES GYM C5 — Smart Fitness Experience

> "SE VOCÊ QUER SER UM LEÃO, DEVE TREINAR COM OS LEÕES."

Plataforma da academia LEÕES GYM C5 (Santos/SP): site cinematográfico, portal do
aluno, portal do profissional e painel administrativo, com Supabase e IA.

- Arquitetura, modelo de dados e plano por etapas: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 4 ·
componentes próprios no estilo shadcn/ui · Lucide · GSAP + ScrollTrigger +
SplitText · Lenis · Motion · Three.js + React Three Fiber + Drei · Supabase
(Auth, Postgres, RLS, Storage) · Zod · Vitest · Playwright.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha as variáveis (veja abaixo)
npm run dev                  # http://localhost:3000
```

Sem as variáveis do Supabase o site público funciona normalmente e as telas
de login/cadastro exibem **"Configuração pendente"** — nada é simulado.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | Gera tipos de rotas e roda `tsc` |
| `npm test` | Testes unitários (Vitest) |
| `npm run test:e2e` | Testes E2E (Playwright, desktop + mobile) |
| `npm run test:db` | Aplica migrations em um Postgres local descartável e roda os testes de RLS (requer `DATABASE_URL`) |

## Credenciais necessárias

### 1. Supabase (obrigatório para login e portais)

1. Crie um projeto em <https://supabase.com/dashboard> (região sugerida: São Paulo, `sa-east-1`).
2. Em **Project Settings → API** copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Publishable key** (`sb_publishable_…`, ou a *anon key* em projetos antigos) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **Secret key** (`sb_secret_…` / *service_role*) → `SUPABASE_SECRET_KEY` (somente servidor; usada a partir da Etapa 6)
3. Aplique o banco (com a [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)):
   ```bash
   npx supabase login
   npx supabase link --project-ref SEU_PROJECT_REF
   npx supabase db push                         # aplica supabase/migrations
   psql "$SUA_CONNECTION_STRING" -f supabase/seed.sql   # biblioteca de exercícios
   ```
   (ou cole os arquivos no **SQL Editor** do painel, na mesma ordem).
4. Em **Authentication → URL Configuration**:
   - *Site URL*: a URL de produção (ex.: `https://leoesgymc5.com.br`)
   - *Redirect URLs*: `http://localhost:3000/auth/confirm` e `https://SEU-DOMINIO/auth/confirm`
5. Crie sua conta pelo `/cadastro` e torne-se o **primeiro administrador** no SQL Editor:
   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'admin' from auth.users where email = 'seu-email@exemplo.com';
   ```
   Depois disso, novos papéis são concedidos apenas pelo painel/funções administrativas.

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
- RLS em todas as tabelas, com testes automatizados (`supabase/tests`).
- Parâmetro `next` sanitizado contra open redirect; cabeçalhos de segurança
  em `next.config.ts`; segredos somente em variáveis sem `NEXT_PUBLIC_`.
