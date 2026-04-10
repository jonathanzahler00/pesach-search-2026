import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function saveToSupabase(email: string): Promise<{ ok: true } | { error: string; status: number }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { error: 'Sign-up is not configured yet.', status: 503 };
  }

  const normalized = email.trim().toLowerCase();
  const { error } = await supabase.from('waitlist_signups').insert({ email: normalized });

  if (!error) {
    return { ok: true };
  }

  // Unique violation — treat as success so the UI does not error on repeat signups
  if (error.code === '23505') {
    return { ok: true };
  }

  console.error('[waitlist] Supabase insert failed:', error.code, error.message);
  return { error: 'Failed to save. Please try again.', status: 500 };
}

async function notifyViaResend(email: string): Promise<{ ok: true } | { error: string; status: number }> {
  if (!process.env.RESEND_API_KEY) {
    return { error: 'Sign-up is not configured yet.', status: 503 };
  }

  const toEmail = process.env.WAITLIST_TO_EMAIL || process.env.FEEDBACK_TO_EMAIL;
  if (!toEmail) {
    return { error: 'Sign-up is not configured yet.', status: 503 };
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a2744; background: #faf8f5;">
  <div style="background: #1a2744; color: white; padding: 16px 24px; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0; font-size: 18px; font-weight: 700;">Pesach Search — Waitlist (5787)</h1>
  </div>
  <div style="background: white; padding: 24px; border: 1px solid #d9e2ec; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="margin: 0 0 12px; font-size: 14px;">New signup:</p>
    <p style="margin: 0; font-size: 16px;"><a href="mailto:${escapeHtml(email)}" style="color: #c9a84c; font-weight: 600;">${escapeHtml(email)}</a></p>
    <p style="font-size: 11px; color: #829ab1; margin: 20px 0 0; border-top: 1px solid #d9e2ec; padding-top: 12px;">
      ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}
    </p>
  </div>
</body>
</html>`;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Pesach Search <noreply@isitkosherforpesach.com>',
      to: toEmail,
      subject: `[Pesach Search] Waitlist signup — ${email}`,
      html,
    });
    return { ok: true };
  } catch {
    return { error: 'Failed to save. Please try again.', status: 500 };
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many attempts. Please wait a few minutes.' }, { status: 429 });
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const supabaseConfigured =
    Boolean(process.env.SUPABASE_URL?.trim()) && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

  if (supabaseConfigured) {
    const result = await saveToSupabase(email);
    if ('ok' in result) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const resendResult = await notifyViaResend(email);
  if ('ok' in resendResult) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: resendResult.error }, { status: resendResult.status });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
