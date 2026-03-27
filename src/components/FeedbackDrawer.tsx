'use client';

import { useState, useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  prefillProduct?: string;
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

const TYPES = [
  { value: 'missing_product', label: '🔍 Missing product' },
  { value: 'wrong_status', label: '⚠️ Wrong kosher status' },
  { value: 'wrong_info', label: '📝 Wrong information' },
  { value: 'suggestion', label: '💡 Suggestion' },
  { value: 'bug', label: '🐛 Bug report' },
  { value: 'other', label: '💬 Other' },
];

export default function FeedbackDrawer({ open, onClose, prefillProduct = '' }: Props) {
  const [type, setType] = useState('other');
  const [product, setProduct] = useState(prefillProduct);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const firstInputRef = useRef<HTMLSelectElement>(null);

  // Sync prefill
  useEffect(() => { setProduct(prefillProduct); }, [prefillProduct]);

  // Focus first input when opened
  useEffect(() => {
    if (open) setTimeout(() => firstInputRef.current?.focus(), 150);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const reset = () => {
    setType('other');
    setProduct(prefillProduct);
    setMessage('');
    setEmail('');
    setSubmitState('idle');
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSubmitState('submitting');
    setErrorMsg('');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, product: product.trim(), message: message.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Something went wrong.');
        setSubmitState('error');
      } else {
        setSubmitState('success');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      setSubmitState('error');
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer — slides up from bottom on mobile, centered modal on desktop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Send feedback"
        className="fixed z-[70] bg-white shadow-2xl
          bottom-0 left-0 right-0 rounded-t-2xl
          sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
          sm:w-full sm:max-w-md sm:rounded-2xl
          max-h-[92dvh] sm:max-h-[85vh] overflow-y-auto
          animate-slide-up sm:animate-none"
      >
        {/* Handle bar (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-display text-lg font-bold text-primary-900">Send Feedback</h2>
            <p className="text-xs text-primary-400">Help improve Pesach Search</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Success state */}
        {submitState === 'success' ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 gap-4 text-center">
            <span className="text-5xl">🙏</span>
            <h3 className="font-display text-xl font-bold text-primary-900">Thank you!</h3>
            <p className="text-primary-500 text-sm">Your feedback was sent. We&apos;ll review it and improve the app.</p>
            <button
              onClick={() => { reset(); onClose(); }}
              className="mt-2 px-6 py-2.5 bg-primary-900 text-white rounded-xl text-sm font-medium"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 pb-8">
            {/* Type */}
            <div>
              <label className="block text-xs font-semibold text-primary-700 mb-1.5">
                What kind of feedback?
              </label>
              <select
                ref={firstInputRef}
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-primary-200 bg-white text-primary-800 text-sm focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20"
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Product (optional) */}
            <div>
              <label className="block text-xs font-semibold text-primary-700 mb-1.5">
                Product name <span className="font-normal text-primary-400">(optional)</span>
              </label>
              <input
                type="text"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="e.g. Folgers Coffee, Dawn Dish Soap"
                className="w-full px-3 py-2.5 rounded-xl border border-primary-200 bg-white text-primary-800 text-sm placeholder:text-primary-300 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-semibold text-primary-700 mb-1.5">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe the issue or suggestion…"
                rows={4}
                required
                minLength={5}
                maxLength={2000}
                className="w-full px-3 py-2.5 rounded-xl border border-primary-200 bg-white text-primary-800 text-sm placeholder:text-primary-300 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 resize-none"
              />
              <p className="text-right text-xs text-primary-300 mt-1">{message.length}/2000</p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-primary-700 mb-1.5">
                Your email <span className="font-normal text-primary-400">(optional — if you want a reply)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 rounded-xl border border-primary-200 bg-white text-primary-800 text-sm placeholder:text-primary-300 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20"
              />
            </div>

            {/* Error */}
            {submitState === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitState === 'submitting' || !message.trim()}
              className="w-full py-3 bg-primary-900 text-white rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-800 active:bg-primary-800 transition-colors flex items-center justify-center gap-2"
            >
              {submitState === 'submitting' ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Sending…
                </>
              ) : 'Send Feedback'}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
