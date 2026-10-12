import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email using the configured email provider (currently Resend).
 * This abstraction allows the provider to be swapped later without changing call sites.
 *
 * @throws Error if RESEND_API_KEY is not set or if the email send fails
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY environment variable is not set');
  }

  const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';

  const result = await resend.emails.send({
    from: fromEmail,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  // Resend returns { error } on failure even with a 200 response in some cases
  if (result.error) {
    throw new Error(`Failed to send email: ${result.error.message}`);
  }
}
