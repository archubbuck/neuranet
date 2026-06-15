import config from '../config.js';
import { logger } from './logger.js';

const RESEND_API = 'https://api.resend.com';

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
 * Sends a transactional email via the Resend REST API directly
 * (bypassing the SDK so we capture the real underlying fetch error).
 *
 * Returns `{ ok: false }` when the API key is missing or the send
 * fails — callers decide how to surface the error.
 *
 * The "from" address must be a domain you've verified in Resend.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult | SendEmailError> {
  if (!config.resendApiKey) {
    logger.warn('sendEmail skipped: RESEND_API_KEY not configured');
    return { ok: false, error: 'Email service not configured' };
  }

  const body: Record<string, unknown> = {
    from: opts.from,
    to: opts.to,
    subject: opts.subject,
  };
  if (opts.text) body['text'] = opts.text;
  if (opts.html) body['html'] = opts.html;
  if (opts.replyTo) body['reply_to'] = opts.replyTo;

  let response: Response;
  try {
    response = await fetch(`${RESEND_API}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    // This is the real network error that the Resend SDK swallows.
    logger.error({ err, from: opts.from, to: opts.to }, 'Resend fetch failed (network)');
    return { ok: false, error: 'Failed to send email' };
  }

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = await response.text().catch(() => '(unreadable)');
    }
    logger.error(
      { status: response.status, errorBody, from: opts.from, to: opts.to },
      'Resend API error',
    );
    return { ok: false, error: 'Failed to send email' };
  }

  const data = (await response.json()) as { id: string };
  logger.info({ emailId: data.id }, 'Email sent');
  return { ok: true, id: data.id };
}

/**
 * Returns `true` when the Resend client is configured and ready
 * (i.e. RESEND_API_KEY is present).
 */
export function isEmailConfigured(): boolean {
  return Boolean(config.resendApiKey);
}
