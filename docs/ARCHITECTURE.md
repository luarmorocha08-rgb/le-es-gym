# LEÕES GYM C5 — Arquitetura

Plataforma web com quatro ambientes (landing pública, portal do aluno, portal do
profissional e painel administrativo) sobre Next.js + PostgreSQL, com login
próprio (Better Auth) e uma camada de IA server-side. Não depende de nenhum
provedor de backend específico: qualquer Postgres 14+ (Neon, Railway, Docker…).

## 1. Visão geral

```
        ┌──────────────────────────── Navegador ────────────────────────────┐
        │  Landing (GSAP, Lenis, R3F)  ·  Portais (React, Motion)  ·  PWA  │
        └───────────────┬────────────────────────────────────────────────────┘
                        │ HTTPS (cookie de sessão httpOnly)
        ┌───────────────▼────────────────────────────────────────────────────┐
        │ Next.js 16 (App Router)                                            │
        │  proxy.ts ── sem cookie de sessão → /login (checagem otimista)     │
        │  /api/auth/* ── Better Auth (login, cadastro, senha, verificação)  │
        │  Server Components ── DAL: getViewer()/requireArea()               │
        │  Server Actions ── validação Zod → withUser(id, …)                 │
        │  lib/ai (server-only) ── provedor configurável, JSON + Zod         │
        └───────────────┬──────────────────────────────────┬─────────────────┘
                        │ pg (pool)                         │ API do provedor de IA
        ┌───────────────▼──────────────────────────┐   ┌────▼──────────────┐
        │ PostgreSQL                               │   │ Anthropic (padrão)│
        │  schema auth  ── tabelas do Better Auth  │   └───────────────────┘
        │  schema public ── dados + RLS + funções  │
        └──────────────────────────────────────────┘
```

**Como a RLS funciona sem Supabase** (`src/lib/db.ts`): toda consulta feita em
nome de um usuário roda dentro de uma transação que executa
`set local role authenticated` e `set_config('app.user_id', <id>, true)`.
A função `auth.uid()` lê esse valor, e as políticas do banco filtram linhas e
bloqueiam escritas. Visitantes usam o papel `anon`. O usuário de conexão (dono
do banco) só é usado pelo Better Auth (schema `auth`) e pelos scripts de
migração.

**Três camadas de autorização** (nenhuma depende só da interface):

1. `src/proxy.ts` — redireciona visitantes sem cookie de sessão das áreas logadas.
2. `src/lib/auth/dal.ts` — valida a sessão no banco e, em cada layout,
   `requireArea()` verifica o papel lido de `user_roles`.
3. **RLS no Postgres** — a barreira definitiva. Transições sensíveis
   (publicar ficha, mudar status de solicitação, aprovar profissional) só
   acontecem por funções que validam o ator, gravam histórico e auditam.

## 2. Estrutura de pastas

```
├─ db/
│  ├─ migrations/              Schema versionado (auth + tabelas, RLS, funções, triggers)
│  ├─ seed.sql                 Biblioteca inicial de exercícios
│  └─ tests/rls_test.sql       Testes de autorização em SQL
├─ docs/                       Arquitetura e decisões
├─ e2e/                        Testes Playwright (desktop + mobile; fluxo real de conta)
├─ public/media/               Vídeo/fotos próprios da academia (opcional)
├─ scripts/                    migrate.mjs · make-admin.mjs · test-db.sh
├─ docker-compose.yml          Postgres local
└─ src/
   ├─ app/
   │  ├─ (site)/               Landing, /academia, /equipe, /contato, /privacidade, /acesso-negado
   │  ├─ (auth)/               /login, /cadastro, /recuperar-senha, /redefinir-senha + actions.ts
   │  ├─ api/auth/[...all]/    Rotas do Better Auth (verificação de e-mail, reset de senha…)
   │  ├─ aluno/ · profissional/ · admin/   Portais com layout protegido por papel
   │  └─ layout.tsx · globals.css · manifest.ts · icon.svg · not-found.tsx · error.tsx
   ├─ components/              ui · brand · landing · three · motion · auth · layout · providers
   ├─ content/gym.ts           Dados institucionais (endereço, links, mídias)
   ├─ lib/
   │  ├─ auth/                 auth.ts (Better Auth), dal.ts, routes.ts (regras puras, testadas)
   │  ├─ db.ts                 Pool Postgres + withUser/withAnon (RLS por requisição)
   │  ├─ email.ts              E-mails transacionais (Resend, ou log em dev)
   │  ├─ data/ · validation/ · hooks/ · gsap.ts · env.ts · utils.ts
   └─ proxy.ts                 (antigo middleware no Next 16)
```

Próximas etapas adicionam `src/lib/ai/` (cliente do provedor, prompts,
schemas de saída, rate limit), `src/lib/storage.ts` (arquivos: avatares,
fotos de progresso, mídias de exercícios — S3 compatível, ex. Cloudflare R2)
e `src/features/<domínio>/` para os módulos dos portais.

## 3. Modelo de dados

Arquivo: `db/migrations/0001_init_schema.sql`. As tabelas `auth.users`, `auth.session`, `auth.account` e `auth.verification` pertencem ao Better Auth.

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
| `progress_records` / `personal_goals` | Medidas, fotos (armazenamento privado), metas | Titular; profissional só se compartilhado |
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

Os testes em `db/tests/rls_test.sql` exercitam 83 cenários de permissão
(aluno, aluno de outro, profissional vinculado/não vinculado/pendente/
suspenso, admin, anônimo — incluindo o bloqueio ao schema `auth`).

## 4. Portal do aluno (Etapa 4)

| Rota | O que faz |
| --- | --- |
| `/aluno/dashboard` | Treino do dia (próximo da sequência), retomar treino em andamento, calendário e meta semanal, frequência, metas, notificações, solicitações |
| `/aluno/meus-treinos` · `/[id]` · `/[id]/editar` | Fichas próprias, prescrições e sugestões; usar como atual, duplicar, arquivar, excluir |
| `/aluno/criar-treino` | Editor: divisões ABC/ABCD/ABCDE/Full Body/Upper-Lower/Personalizado, dias, séries, repetições, descanso, carga, observações, reordenação (arrastar ou botões) |
| `/aluno/exercicios` · `/[slug]` | Biblioteca com busca, filtros, instruções e histórico de cargas do aluno |
| `/aluno/treino/[id]` | Modo treino: cada série é gravada na hora (retoma após recarregar), carga anterior, timer de descanso, conclusão com esforço percebido e resumo com recordes |
| `/aluno/evolucao` | Frequência e volume semanais, evolução de cargas, recordes, histórico, metas, medidas corporais (com consentimento) |
| `/aluno/solicitar-profissional` · `/[id]` | Meu Treinador: pedir treino, status em etapas, mensagens, pedir ajuste, concluir ou cancelar |
| `/aluno/perfil` · `/exportar` | Dados e rotina, saúde (consentimento LGPD), consentimento de IA, senha, notificações, exportar JSON, excluir conta |
| `/aluno/treino-ia` | Aviso transparente até a Etapa 6 |

Leituras em `src/lib/student/queries.ts` e mutações em `src/app/aluno/_actions/`,
sempre via `withUser` (RLS). Regras puras (divisões, sequência de dias,
semana em America/Sao_Paulo, recordes, volume) em `src/lib/workout/` com testes.

## 5. Portal do profissional (Etapa 5)

| Rota | O que faz |
| --- | --- |
| `/profissional/dashboard` | Indicadores, o que precisa de atenção (solicitações, alunos sem treinar 7+ dias), últimas atividades com esforço/feedback, fichas publicadas por semana |
| `/profissional/alunos` · `/[id]` | Alunos vinculados com busca e filtros; perfil com saúde declarada, fichas, frequência, cargas, recordes, histórico/feedback, metas, medidas compartilhadas, notas privadas |
| `/profissional/criar-treino` | Ficha para aluno vinculado, a partir de solicitação ou como modelo; editor com arrastar-e-soltar |
| `/profissional/fichas` · `/[id]` · `/[id]/editar` | Rascunhos, publicadas, modelos e arquivadas; publicação explícita com nota; nova versão; comparação com a versão publicada; histórico de versões; duplicar para outro aluno; salvar como modelo |
| `/profissional/solicitacoes` · `/[id]` | Central por status; aceitar (cria vínculo), montar ficha, mensagens, concluir |
| `/profissional/acompanhamento` | Treinos em 4 semanas, aderência à meta, última atividade, esforço médio, volume e último feedback |
| `/profissional/perfil` | CREF, apresentação, especialidades, perfil público e disponibilidade |

**Fluxo de versões:** ficha publicada é imutável. "Nova versão" cria um rascunho
(`based_on_plan_id`) que o aluno não vê; ao publicar, a anterior é arquivada, a
nova vira o treino atual do aluno, a numeração continua (v1 → v2) e a
solicitação ligada passa para "entregue".

## 6. Camada de IA (Etapa 6)

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

## 7. Plano de implementação

| Etapa | Escopo | Status |
| --- | --- | --- |
| 1. Fundação | Next 16, Tailwind 4, design system, fontes, marca, PWA manifest | ✅ |
| 2. Landing | Hero cinematográfico, 3D, scroll storytelling, seções, rodapé | ✅ |
| 3. Autenticação | Better Auth, login/cadastro/recuperação, proxy, DAL, papéis | ✅ (testado ponta a ponta com Postgres local) |
| — Banco | Schema completo + RLS + funções + seed + testes + scripts de migração | ✅ |
| 4. Portal do aluno | Navegação inferior, biblioteca, montar treino, modo treino, evolução, Meu Treinador, perfil (exportar/excluir dados) | ✅ (fotos de progresso aguardam o armazenamento de arquivos) |
| 5. Portal profissional | Meus alunos, editor drag-and-drop, solicitações, acompanhamento | ✅ |
| 6. IA | Gerador conversacional (aluno e profissional), ajustes, comparação de versões | Próxima |
| 7. Administração | Aprovações, vínculos, exercícios/mídias, horários, conteúdos, logs | — |
| 8. Refinamento | Service worker/offline, performance, acessibilidade, testes ampliados | — |
