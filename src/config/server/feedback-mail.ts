import nodemailer from "nodemailer";
import { z } from "zod";

const settings = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65535).default(465),
  security: z.enum(["tls", "starttls", "none"]).default("tls"),
  user: z.string().optional(),
  pass: z.string().optional(),
  from: z.string().email(),
  to: z.string().email(),
});

export function getFeedbackMailTransport() {
  const config = settings.parse({
    host: process.env.FEEDBACK_SMTP_HOST,
    port: process.env.FEEDBACK_SMTP_PORT || undefined,
    security: process.env.FEEDBACK_SMTP_SECURITY || undefined,
    user: process.env.FEEDBACK_SMTP_USER || undefined,
    pass: process.env.FEEDBACK_SMTP_PASSWORD || undefined,
    from: process.env.FEEDBACK_FROM_EMAIL || "support@quoska.de",
    to: process.env.FEEDBACK_TO_EMAIL || "support@quoska.de",
  });
  const transport = nodemailer.createTransport({
    host: config.host, port: config.port, secure: config.security === "tls",
    requireTLS: config.security === "starttls", ignoreTLS: config.security === "none",
    auth: config.user ? { user: config.user, pass: config.pass } : undefined,
    connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000,
    disableFileAccess: true, disableUrlAccess: true,
  });
  return { transport, from: config.from, to: config.to };
}
