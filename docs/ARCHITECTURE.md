# LEÕES GYM C5 — Arquitetura

Plataforma web com quatro ambientes (landing pública, portal do aluno, portal do
profissional e painel administrativo) sobre Next.js + Supabase, com uma camada
de IA server-side.

## 1. Visão geral

```
                ┌──────────────────────────── Navegador ────────────────────────────┐
                │  Landing (GSAP, Lenis, R3F)  ·  Portais (React, Motion)  ·  PWA  │
                └───────────────┬───────────────────────────────────┬──────────────┘
                                │ HTTPS (cookies de sessão)         │
                ┌───────────────▼───────────────────────────────────▼──────────────┐
                │ Next.js 16 (App Router)                                          │
                │  proxy.ts ── renova sessão + checagem otimista de rotas          │
                │  Server Components ── leem dados via DAL (getViewer/requireArea) │
                │  Server Actions / Route Handlers ── mutações validadas com Zod   │
                │  lib/ai (server-only) ── provedor configurável, JSON + Zod       │
                └───────────────┬───────────────────────────────────┬──────────────┘
                                │ supabase-js (JWT do usuário)      │ API do provedor de IA
                ┌───────────────▼──────────────┐          ┌─────────▼─────────┐
                │ Supabase                     │          │ Anthropic (padrão)│
                │  Auth · Postgres + RLS       │          │ ou outro provedor │
                │  Storage (buckets privados)  │          └───────────────────┘
                │  Funções SECURITY DEFINER    │
                └──────────────────────────────┘
```

**Três camadas de autorização** (nenhuma depende só da interface):

1. `src/proxy.ts` — redireciona visitantes não autenticados das áreas logadas.
2. `src/lib/auth/dal.ts` — `requireArea()` em cada layout verifica o papel lido
   do banco (nunca de metadados editáveis pelo usuário).
3. **RLS no Postgres** — a barreira definitiva: mesmo com a chave pública, um
   usuário só lê/escreve o que as políticas permitem. Transições sensíveis
   (publicar ficha, mudar status de solicitação, aprovar profissional) só
   acontecem por funções que validam o ator, gravam histórico e auditam.

## 2. Estrutura de pastas

```
├─ docs/                       Arquitetura e decisões
├─ e2e/                        Testes Playwright (desktop + mobile)
├─ public/media/               Vídeo/fotos próprios da academia (opcional)
├─ scripts/test-db.sh          Aplica migrations em Postgres local e roda testes de RLS
├─ supabase/
│  ├─ migrations/              Schema versionado (tabelas, RLS, funções, triggers)
│  ├─ seed.sql                 Biblioteca inicial de exercícios
│  └─ tests/                   Stub do Supabase + testes de autorização em SQL
└─ src/
   ├─ app/
   │  ├─ (site)/               Landing, /academia, /equipe, /contato, /privacidade, /acesso-negado
   │  ├─ (auth)/               /login, /cadastro, /recuperar-senha, /redefinir-senha + actions.ts
   │  ├─ auth/confirm/         Destino dos links de e-mail (PKCE e token_hash)
   │  ├─ aluno/                Portal do aluno (layout protegido)
   │  ├─ profissional/         Portal do profissional (layout protegido)
   │  ├─ admin/                Painel administrativo (layout protegido)
   │  ├─ layout.tsx · globals.css · manifest.ts · icon.svg · not-found.tsx · error.tsx
   ├─ components/
   │  ├─ ui/                   Design system (Button, Input, Card, Badge, Alert…)
   │  ├─ brand/                Emblema, wordmark, ícones de marca
   │  ├─ landing/              Seções da landing
   │  ├─ three/                Cena 3D (medalhão do leão) + fallback
   │  ├─ motion/               Reveal, Parallax, TextReveal, TiltCard
   │  ├─ auth/                 Formulários de autenticação
   │  ├─ layout/               Header, footer, shell dos portais
   │  └─ providers/            Smooth scroll (Lenis + ScrollTrigger)
   ├─ content/gym.ts           Dados institucionais (endereço, links, mídias)
   ├─ lib/
   │  ├─ auth/                 DAL (server-only) e regras de rota (puras, testadas)
   │  ├─ supabase/             Clientes server, browser e proxy
   │  ├─ data/                 Consultas públicas (horários, equipe)
   │  ├─ validation/           Schemas Zod
   │  ├─ hooks/ · gsap.ts · env.ts · utils.ts
   └─ proxy.ts                 (antigo middleware no Next 16)
```

Próximas etapas adicionam `src/lib/ai/` (cliente do provedor, prompts,
schemas de saída, rate limit) e `src/features/<domínio>/` para os módulos dos
portais (treinos, sessões, solicitações, evolução).

## 3. Modelo de dados

Arquivo: `supabase/migrations/20261012000000_init_schema.sql`.

| Tabela | Finalidade | Quem acessa |
| --- | --- | --- |
| `profiles` | Perfil de todo usuário (nome, objetivo, nível, consentimentos LGPD) | Titular; profissionais vinculados; admin |
| `user_roles` | Papéis `aluno`, `profissional`, `admin` | Leitura própria/admin; escrita **só** por funções admin |
| `professional_profiles` | CREF, bio, especialidades, status de aprovação | Titular edita bio; status só via `review_professional()` |
| `student_health_info` | Limitações, exercícios a evitar, equipamentos (dado sensível) | Titular; profissional vinculado (admin **não**) |
| `trainer_student_links` | Vínculo profissional ↔ aluno | Participantes; criado pelo admin ou ao aceitar solicitação |
| `exercises` | Biblioteca com instruções, músculos, equipamento, mídia | Leitura pública; escrita admin |
| `workout_plans` | Fichas (origem `aluno`/`profissional`/`ia`, status, template) | Ver regras abaixo |
| `workout_days` / `workout_exercises` | Dias e exercícios (séries, reps, descanso, carga alvo) | Herdam da ficha |
| `workout_versions` | Snapshots imutáveis a cada publicação | Quem vê a ficha |
| `workout_requests` | Pedidos de treino ao profissional | Aluno e profissional da solicitação |
| `request_events` / `request_messages` | Histórico de status e mensagens reais | Participantes |
| `workout_sessions` / `completed_sets` | Execução do treino e cargas registradas | Aluno escreve; vinculados leem |
| `ai_generations` | Registro de cada chamada de IA (entrada minimizada, saída, tokens) | Inserção só pelo servidor |
| `progress_records` / `personal_goals` | Medidas, fotos (bucket privado), metas | Titular; profissional só se compartilhado |
| `notifications` | Notificações internas | Titular |
| `trainer_notes` | Observações privadas do profissional | Somente o autor vinculado |
| `audit_logs` | Rastreabilidade de ações sensíveis | Somente admin lê |
| `opening_hours` / `site_content` | Horários e conteúdo institucional | Leitura pública; escrita admin |

**Regras de negócio garantidas no banco**

- Cadastro cria perfil + papel `aluno`. "Sou profissional" cria apenas um
  cadastro **pendente**; o papel só é concedido por `review_professional()`.
- Profissional **suspenso** perde imediatamente acesso a dados de alunos.
- Ficha só vira `publicado` via `publish_workout_plan()`: exige profissional
  ativo vinculado, ao menos um exercício, gera versão, arquiva a anterior,
  entrega a solicitação, notifica o aluno e audita.
- Fichas de origem `aluno` nunca podem ser publicadas como prescrição; origem,
  autor e aluno de uma ficha são imutáveis; sugestões de IA nunca são
  publicadas sem revisão profissional.
- Status de solicitação muda só via `transition_request()` (máquina de estados
  por ator); aceitar uma solicitação cria o vínculo.
- `export_my_data()` exporta todos os dados do titular (LGPD art. 18).

Os testes em `supabase/tests/10_rls_test.sql` exercitam 66 cenários de
permissão (aluno, aluno de outro, profissional vinculado/não vinculado/
pendente/suspenso, admin, anônimo).

## 4. Camada de IA (Etapa 6)

- `src/lib/ai/` **server-only**; chave em `ANTHROPIC_API_KEY` (ou outro
  provedor via `AI_PROVIDER`), modelo em `AI_MODEL`.
- Entrada minimizada: objetivo, nível, disponibilidade, equipamentos,
  preferências e restrições declaradas — sem nome, e-mail ou telefone.
- Saída em JSON validada com Zod (`WorkoutPlanSuggestion`) e exercícios
  resolvidos contra a biblioteca (`exercises.slug`); respostas inválidas são
  descartadas e registradas como `invalido`.
- Limite por usuário/dia (contagem em `ai_generations`) + consentimento
  (`profiles.ai_consent_at`) antes do primeiro uso.
- Sem chave configurada: a interface informa "configuração pendente" — nunca
  simula uma resposta.
- Guardrails no prompt e na validação: sem diagnóstico, sem promessa de
  resultado; dor/lesão/condição de saúde → orientar avaliação profissional.

## 5. Plano de implementação

| Etapa | Escopo | Status |
| --- | --- | --- |
| 1. Fundação | Next 16, Tailwind 4, design system, fontes, marca, PWA manifest | ✅ |
| 2. Landing | Hero cinematográfico, 3D, scroll storytelling, seções, rodapé | ✅ |
| 3. Autenticação | Supabase SSR, login/cadastro/recuperação, proxy, DAL, papéis | ✅ (aguarda credenciais para teste ponta a ponta) |
| — Banco | Schema completo + RLS + funções + seed + testes | ✅ (aplicar no projeto Supabase) |
| 4. Portal do aluno | Navegação inferior, biblioteca, montar treino, modo treino, evolução, Meu Treinador, perfil (exportar/excluir dados) | Próxima |
| 5. Portal profissional | Meus alunos, editor drag-and-drop, solicitações, acompanhamento | — |
| 6. IA | Gerador conversacional (aluno e profissional), ajustes, comparação de versões | — |
| 7. Administração | Aprovações, vínculos, exercícios/mídias, horários, conteúdos, logs | — |
| 8. Refinamento | Service worker/offline, performance, acessibilidade, testes ampliados | — |
