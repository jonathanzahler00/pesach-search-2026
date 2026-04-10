'use client';

import { useState, FormEvent } from 'react';

export default function SeasonEndedLanding() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setStatus('error');
      setMessage('Please enter your email address.');
      return;
    }
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus('error');
        setMessage(typeof data.error === 'string' ? data.error : 'Something went wrong. Please try again.');
        return;
      }
      setStatus('success');
      setMessage('You are on the list. We will email you when the next guide search is live.');
      setEmail('');
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  }

  return (
    <div className="max-w-lg mx-auto text-center py-6 sm:py-10">
      <p className="text-4xl sm:text-5xl mb-4" aria-hidden>🫓</p>
      <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary-900 mb-3">
        Thanks for using Pesach Search
      </h2>
      <p className="text-primary-600 text-sm sm:text-base leading-relaxed mb-2">
        Our live search for the 5786 (2026) guides has ended for the season.
      </p>
      <p className="text-primary-500 text-sm sm:text-base leading-relaxed mb-8">
        Drop your email and we will let you know when the{' '}
        <span className="font-semibold text-primary-700">2027 / 5787</span> Pesach guide search is ready.
      </p>

      {status === 'success' ? (
        <div
          className="rounded-xl border border-gold-300 bg-gold-50 text-primary-800 px-4 py-4 text-sm sm:text-base"
          role="status"
        >
          {message}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3 text-left">
          <label htmlFor="waitlist-email" className="sr-only">
            Email address
          </label>
          <input
            id="waitlist-email"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'loading'}
            className="search-input w-full px-4 py-3.5 text-base rounded-xl border-2 border-primary-200 bg-white placeholder:text-primary-300 focus:border-gold-400 focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full py-3.5 rounded-xl bg-primary-900 text-white font-semibold text-base hover:bg-primary-800 active:bg-primary-800 transition-colors disabled:opacity-60 disabled:pointer-events-none"
          >
            {status === 'loading' ? 'Sending…' : 'Notify me for 5787'}
          </button>
          {status === 'error' && message && (
            <p className="text-sm text-red-600 text-center" role="alert">
              {message}
            </p>
          )}
        </form>
      )}

      <p className="text-xs text-primary-400 mt-8 leading-relaxed">
        We use your email only for this announcement. You can unsubscribe from any message we send.
      </p>
    </div>
  );
}
