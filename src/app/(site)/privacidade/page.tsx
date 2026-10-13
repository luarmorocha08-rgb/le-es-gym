import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageHero } from "@/components/layout/page-hero";
import { gym } from "@/content/gym";

export const metadata: Metadata = {
  title: "Privacidade e LGPD",
  description: "Como tratamos seus dados pessoais na plataforma.",
};

/*
 * Versão inicial redigida para a plataforma. Antes da produção, revisar com a
 * assessoria jurídica da academia e incluir razão social, CNPJ e o contato do
 * encarregado (DPO).
 */
const sections: { title: string; body: ReactNode }[] = [
  {
    title: "1. Quais dados coletamos",
    body: (
      <ul>
        <li>Cadastro: nome, e-mail e, opcionalmente, telefone e data de nascimento.</li>
        <li>Treino: fichas, sessões realizadas, séries, repetições e cargas registradas.</li>
        <li>
          Dados de saúde informados por você (limitações físicas, exercícios a evitar), medidas corporais e fotos de
          progresso — sempre opcionais.
        </li>
        <li>Profissionais: registro CREF, biografia e especialidades.</li>
      </ul>
    ),
  },
  {
    title: "2. Para que usamos",
    body: (
      <ul>
        <li>Permitir que você monte, execute e acompanhe seus treinos.</li>
        <li>Permitir que profissionais vinculados a você elaborem e acompanhem suas fichas.</li>
        <li>Gerar sugestões de treino com inteligência artificial, quando você solicitar.</li>
        <li>Enviar notificações sobre solicitações e treinos publicados.</li>
      </ul>
    ),
  },
  {
    title: "3. Dados sensíveis",
    body: (
      <p>
        Informações de saúde e fotos corporais são dados sensíveis (LGPD, art. 11). Só são tratadas com o seu
        consentimento, ficam acessíveis apenas a você e aos profissionais vinculados que você autorizar, e nunca são
        públicas. Fotos de progresso ficam em armazenamento privado.
      </p>
    ),
  },
  {
    title: "4. Inteligência artificial",
    body: (
      <p>
        Ao usar o gerador de treinos, enviamos ao provedor de IA somente as informações necessárias para montar a
        sugestão (objetivo, experiência, disponibilidade, equipamentos e restrições declaradas) — sem nome, e-mail ou
        telefone. As sugestões são identificadas como tal, não substituem avaliação profissional e não são publicadas
        sem revisão de um profissional.
      </p>
    ),
  },
  {
    title: "5. Quem acessa",
    body: (
      <p>
        Você; os profissionais vinculados ao seu perfil; e administradores autorizados da academia, para gestão de
        cadastros. As permissões são aplicadas diretamente no banco de dados e as ações administrativas ficam
        registradas.
      </p>
    ),
  },
  {
    title: "6. Seus direitos",
    body: (
      <p>
        Você pode acessar, corrigir, exportar e excluir seus dados, além de revogar consentimentos a qualquer momento
        (LGPD, art. 18). No portal, em Perfil → Seus dados, você exporta todos os seus dados em JSON, revoga
        consentimentos e exclui a conta; também é possível solicitar pelos canais oficiais da academia.
      </p>
    ),
  },
  {
    title: "7. Retenção e segurança",
    body: (
      <p>
        Mantemos os dados enquanto sua conta estiver ativa. Ao excluir a conta, os dados pessoais são removidos,
        ressalvadas obrigações legais. Utilizamos conexão criptografada, controle de acesso por função e políticas de
        segurança em nível de linha no banco de dados.
      </p>
    ),
  },
  {
    title: "8. Contato",
    body: (
      <p>
        Dúvidas sobre privacidade: fale com a {gym.name} pelo{" "}
        <a href={gym.links.whatsapp} target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>{" "}
        ou pelo Instagram {gym.links.instagramHandle}.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Privacidade" title="Seus dados, suas regras.">
        Transparência sobre como a plataforma {gym.name} trata as suas informações, conforme a Lei Geral de Proteção
        de Dados (Lei nº 13.709/2018).
      </PageHero>
      <article className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        {sections.map((s) => (
          <section key={s.title} className="border-b border-white/10 py-8">
            <h2 className="font-heading text-xl uppercase tracking-[0.06em]">{s.title}</h2>
            <div className="mt-4 text-white/70 [&_a]:text-white [&_a]:underline [&_li]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
              {s.body}
            </div>
          </section>
        ))}
      </article>
    </>
  );
}
