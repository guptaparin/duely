import nodemailer from "nodemailer";

/**
 * Optional email sending over SMTP (free with a Gmail App Password).
 * If SMTP isn't configured the app falls back to "open in your email app".
 */
export function emailEnabled() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendEmail(opts: { to: string; subject: string; text: string; replyTo?: string; fromName?: string }) {
  if (!emailEnabled()) throw new Error("Email sending is not configured");
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  const from = `"${(opts.fromName || "Duely").replace(/"/g, "")}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`;
  await transport.sendMail({ from, to: opts.to, subject: opts.subject, text: opts.text, replyTo: opts.replyTo });
}
