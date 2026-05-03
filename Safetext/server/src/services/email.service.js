import nodemailer from "nodemailer";
import { appConfig } from "../config/app.config.js";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const { host, port, secure, user, pass } = appConfig.email;
  if (!host || !user || !pass) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
  return transporter;
}

/**
 * @param {{ subject: string, text: string, html?: string }} opts
 */
export async function sendModeratorEmail(opts) {
  if (!appConfig.emailEnabled) {
    console.info("[email] skipped (EMAIL_ENABLED=false):", opts.subject);
    return;
  }

  const t = getTransporter();
  const to = appConfig.email.moderatorEmail;
  const from = appConfig.email.from;

  if (!t) {
    console.warn("[email] SMTP not configured; logging instead:\n", opts.text);
    return;
  }

  await t.sendMail({
    from,
    to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html ?? `<pre>${opts.text}</pre>`,
  });
}
