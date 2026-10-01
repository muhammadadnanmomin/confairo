import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const DEFAULT_FROM = "Confairo <no-reply@confairo.com>";
const DEFAULT_REPLY_TO = "contact@confairo.com";

export async function sendEmail(
  to: string,
  subject: string,
  html: string
) {
  const from = process.env.EMAIL_FROM || DEFAULT_FROM;
  const replyTo = process.env.EMAIL_REPLY_TO || DEFAULT_REPLY_TO;

  return await resend.emails.send({
    from,
    replyTo,
    to,
    subject,
    html,
  });
}