import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const FEEDBACK_TYPES: Record<string, string> = {
  missing_product: '🔍 Missing Product',
  wrong_status: '⚠️ Wrong Status',
  wrong_info: '📝 Wrong Information',
  suggestion: '💡 Suggestion',
  bug: '🐛 Bug Report',
  other: '💬 Other',
};

// Simple in-memory rate limit: max 3 submissions per IP per 10 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  if (!process.env.RESEND_API_KEY || !process.env.FEEDBACK_TO_EMAIL) {
    return NextResponse.json({ error: 'Feedback not configured' }, { status: 503 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many submissions. Please wait a few minutes.' }, { status: 429 });
  }

  let body: { type?: string; product?: string; message?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { type = 'other', product = '', message = '', email = '' } = body;

  if (!message || message.trim().length < 5) {
    return NextResponse.json({ error: 'Message is too short.' }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: 'Message is too long.' }, { status: 400 });
  }

  const typeLabel = FEEDBACK_TYPES[type] ?? '💬 Other';
  const subject = `[Pesach Search] ${typeLabel}${product ? ` — ${product}` : ''}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a2744; background: #faf8f5;">
  <div style="background: #1a2744; color: white; padding: 16px 24px; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0; font-size: 18px; font-weight: 700;">Pesach Search — New Feedback</h1>
  </div>
  <div style="background: white; padding: 24px; border: 1px solid #d9e2ec; border-top: none; border-radius: 0 0 12px 12px;">
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr>
        <td style="padding: 8px 12px; background: #f0f4f8; border-radius: 6px; font-weight: 600; font-size: 13px; width: 140px; vertical-align: top;">Type</td>
        <td style="padding: 8px 12px; font-size: 14px;">${typeLabel}</td>
      </tr>
      ${product ? `
      <tr>
        <td style="padding: 8px 12px; background: #f0f4f8; border-radius: 6px; font-weight: 600; font-size: 13px; vertical-align: top; margin-top: 6px;">Product</td>
        <td style="padding: 8px 12px; font-size: 14px;">${escapeHtml(product)}</td>
      </tr>` : ''}
      <tr>
        <td style="padding: 8px 12px; background: #f0f4f8; border-radius: 6px; font-weight: 600; font-size: 13px; vertical-align: top; margin-top: 6px;">Message</td>
        <td style="padding: 8px 12px; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(message.trim())}</td>
      </tr>
      ${email ? `
      <tr>
        <td style="padding: 8px 12px; background: #f0f4f8; border-radius: 6px; font-weight: 600; font-size: 13px; vertical-align: top; margin-top: 6px;">Reply to</td>
        <td style="padding: 8px 12px; font-size: 14px;"><a href="mailto:${escapeHtml(email)}" style="color: #c9a84c;">${escapeHtml(email)}</a></td>
      </tr>` : ''}
    </table>
    <p style="font-size: 11px; color: #829ab1; margin: 0; border-top: 1px solid #d9e2ec; padding-top: 12px;">
      Sent from Pesach Search · ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}
    </p>
  </div>
</body>
</html>`;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Pesach Search <noreply@isitkosherforpesach.com>',
      to: process.env.FEEDBACK_TO_EMAIL,
      replyTo: email || undefined,
      subject,
      html,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to send. Please try again.' }, { status: 500 });
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
