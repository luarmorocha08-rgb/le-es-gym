import "server-only";
import { gym } from "@/content/gym";
import { emailMode } from "@/lib/env";

type Mail = { to: string; subject: string; text: string; html: string };

/**
 * Envio de e-mails transacionais via API HTTP do Resend.
 * Sem Resend: em desenvolvimento (ou EMAIL_LOG_ONLY=1) o conteúdo vai para o log;
 * em produção lança erro (o fluxo mostra "configuração pendente").
 */
export async function sendMail(mail: Mail) {
  const mode = emailMode();
  if (mode === "log") {
    console.info(`\n[e-mail não enviado — modo log]\nPara: ${mail.to}\nAssunto: ${mail.subject}\n${mail.text}\n`);
    return;
  }
  if (mode === "off") throw new Error("Envio de e-mails não configurado (RESEND_API_KEY / EMAIL_FROM).");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: mail.to, subject: mail.subject, text: mail.text, html: mail.html }),
  });
  if (!res.ok) throw new Error(`Falha ao enviar e-mail (${res.status}).`);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function actionEmail({ to, subject, intro, cta, url }: { to: string; subject: string; intro: string; cta: string; url: string }): Mail {
  return {
    to,
    subject: `${subject} · ${gym.name}`,
    text: `${intro}\n\n${cta}: ${url}\n\nSe você não fez esta solicitação, ignore este e-mail.`,
    html: `<div style="font-family:Arial,sans-serif;background:#000;color:#fff;padding:32px">
<p style="letter-spacing:3px;font-size:12px;color:#9a9ea5">${escapeHtml(gym.name)}</p>
<h1 style="font-size:24px;text-transform:uppercase">${escapeHtml(subject)}</h1>
<p style="color:#ccc">${escapeHtml(intro)}</p>
<p><a href="${escapeHtml(url)}" style="display:inline-block;background:#fff;color:#000;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:bold">${escapeHtml(cta)}</a></p>
<p style="color:#777;font-size:12px">Se você não fez esta solicitação, ignore este e-mail.</p></div>`,
  };
}
