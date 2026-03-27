'use client';

import { useState } from 'react';
import FeedbackDrawer from './FeedbackDrawer';

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating button — above bottom nav on mobile, bottom-right on desktop */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        className="
          fixed z-50
          bottom-[76px] right-4
          sm:bottom-6 sm:right-6
          flex items-center gap-1.5
          bg-white border border-primary-200 text-primary-700
          shadow-lg hover:shadow-xl
          rounded-full
          pl-3 pr-4 py-2
          text-xs font-semibold
          hover:bg-primary-50 active:bg-primary-50
          transition-all
        "
      >
        <span className="text-base leading-none">💬</span>
        <span>Feedback</span>
      </button>

      <FeedbackDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
