/**
 * Waitlist sign-up endpoint. Accepts an email, persists it to the
 * database, and sends a confirmation email via Resend.
 */
import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { drizzle } from '../db.js';
import * as s from '../db/schema.js';
import config from '../config.js';
import * as schemas from '../schemas.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../lib/async-handler.js';
import { sendEmail } from '../lib/email.js';
import { logger } from '../lib/logger.js';

const router = Router();

router.post(
  '/waitlist',
  validateBody(schemas.joinWaitlist),
  asyncHandler(async (req, res) => {
    const { email } = req.body as { email: string };

    // Check for duplicate.
    const rows = await drizzle
      .select()
      .from(s.waitlistEntries)
      .where(eq(s.waitlistEntries.email, email));
    const existing = rows[0];

    if (existing) {
      // Don't reveal whether the email is already registered.
      res.status(201).json({ ok: true });
      return;
    }

    // Insert the entry.
    await drizzle.insert(s.waitlistEntries).values({ email });

    // Send confirmation email and update the record. On Vercel
    // serverless functions the runtime may freeze after the response
    // is sent, so we must await the send before responding.
    try {
      const result = await sendEmail({
        from: config.resendFromAddress,
        to: email,
        subject: "You're on the Neuranet waitlist!",
        text: `Hi there,\n\nThanks for joining the Neuranet waitlist! We'll let you know as soon as early access opens up.\n\n— The Neuranet Team`,
        html: `<p>Hi there,</p><p>Thanks for joining the <strong>Neuranet</strong> waitlist! We'll let you know as soon as early access opens up.</p><p>— The Neuranet Team</p>`,
      });

      if (result.ok) {
        await drizzle
          .update(s.waitlistEntries)
          .set({ confirmationSent: true })
          .where(eq(s.waitlistEntries.email, email));
      } else {
        logger.warn({ email }, 'Waitlist confirmation email failed to send');
      }
    } catch (err) {
      logger.error({ err, email }, 'Waitlist confirmation email threw');
    }

    res.status(201).json({ ok: true });
  }),
);

export default router;
