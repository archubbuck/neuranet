import { Resend } from 'resend';
import type { CreateEmailOptions } from 'resend';
import config from '../config.js';
import { logger } from './logger.js';

/**
 * Lazily-initialised Resend client. Returns `undefined` when
 * RESEND_API_KEY is not configured so callers can check availability
 * before attempting to send.
 */
let _resend: Resend | undefined;

function getResend(): Resend | undefined {
  if (!config.resendApiKey) return undefined;
  if (!_resend) {
    _resend = new Resend(config.resendApiKey);
  }
  return _resend;
}

export interface SendEmailOptions {
  /** "From" address (must be a verified domain in Resend). */
  from: string;
  /** Recipient address(es). */
  to: string | string[];
  /** Email subject line. */
  subject: string;
  /** Plain-text body. */
  text?: string;
  /** HTML body (takes precedence over text in most clients). */
  html?: string;
  /** Reply-to address. */
  replyTo?: string;
}

export interface SendEmailResult {
  ok: true;
  id: string;
}

export interface SendEmailError {
  ok: false;
  error: string;
}

/**
 * Sends a transactional email via Resend. Returns `{ ok: false }` when
 * the API key is missing or the send fails — callers decide how to
 * surface the error (toast, log, etc.).
 *
 * The "from" address must be a domain you've verified in Resend.
 */
export async function sendEmail(
  opts: SendEmailOptions,
): Promise<SendEmailResult | SendEmailError> {
  const resend = getResend();
  if (!resend) {
    logger.warn('sendEmail skipped: RESEND_API_KEY not configured');
    return { ok: false, error: 'Email service not configured' };
  }

  try {
    // Build payload with only defined properties so the discriminated
    // union in CreateEmailOptions narrows correctly.
    const payload = {
      from: opts.from,
      to: opts.to,
      subject: opts.subject,
      ...(opts.text ? { text: opts.text } : {}),
      ...(opts.html ? { html: opts.html } : {}),
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    };

    const { data, error } = await resend.emails.send(
      payload as unknown as CreateEmailOptions,
    );

    if (error) {
      logger.error({ err: error }, 'Resend send failed');
      return { ok: false, error: 'Failed to send email' };
    }

    logger.info({ emailId: data?.id }, 'Email sent');
    return { ok: true, id: data!.id };
  } catch (err) {
    logger.error({ err }, 'Resend send threw');
    return { ok: false, error: 'Failed to send email' };
  }
}

/**
 * Returns `true` when the Resend client is configured and ready
 * (i.e. RESEND_API_KEY is present).
 */
export function isEmailConfigured(): boolean {
  return Boolean(config.resendApiKey);
}
