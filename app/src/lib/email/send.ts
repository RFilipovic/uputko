import type { ReactElement } from "react";
import { Resend } from "resend";
import { serverEnv } from "@/lib/env";

export type SendResult =
  { sent: true; id: string } | { sent: false; reason: string };

/**
 * Send a demo email. It ALWAYS goes to DEMO_INBOX (team-controlled), never to
 * a real doctor or patient. Without DEMO_INBOX or RESEND_API_KEY nothing is sent.
 */
export async function sendDemoEmail(opts: {
  subject: string;
  react: ReactElement;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType?: string;
  }>;
}): Promise<SendResult> {
  const env = serverEnv();
  if (!env.RESEND_API_KEY || !env.DEMO_INBOX)
    return { sent: false, reason: "email_not_configured" };
  try {
    const resend = new Resend(env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: [env.DEMO_INBOX],
      subject: opts.subject,
      react: opts.react,
      attachments: opts.attachments,
    });
    if (error || !data)
      return { sent: false, reason: error?.message ?? "unknown" };
    return { sent: true, id: data.id };
  } catch (err) {
    return {
      sent: false,
      reason: err instanceof Error ? err.message : "unknown",
    };
  }
}
