'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { searchItems } from '@/lib/search';
import { STATUS_CONFIG, ORG_CONFIG } from '@/lib/types';
import type { SearchResult, ItemStatus, OrgCode } from '@/lib/types';

type ScanState =
  | { phase: 'idle' }
  | { phase: 'processing' }
  | { phase: 'looking_up'; barcode: string }
  | { phase: 'results'; barcode: string; productName: string; brand: string; imageUrl: string | null; results: SearchResult[] }
  | { phase: 'not_found'; barcode: string; productName?: string }
  | { phase: 'error'; message: string };

export default function ScanPage() {
  const [state, setState] = useState<ScanState>({ phase: 'idle' });
  const fileRef = useRef<HTMLInputElement>(null);
  const liveFileRef = useRef<HTMLInputElement>(null);

  const lookupBarcode = useCallback(async (barcode: string) => {
    setState({ phase: 'looking_up', barcode });
    try {
      const res = await fetch(`/api/lookup?barcode=${encodeURIComponent(barcode)}`);
      const data = await res.json();
      if (!data.found || !data.searchQuery) {
        setState({ phase: 'not_found', barcode, productName: data.productName });
        return;
      }
      const results = searchItems(data.searchQuery);
      if (results.length === 0) {
        setState({ phase: 'not_found', barcode, productName: [data.brand, data.productName].filter(Boolean).join(' — ') });
        return;
      }
      setState({ phase: 'results', barcode, productName: data.productName, brand: data.brand, imageUrl: data.imageUrl, results });
    } catch {
      setState({ phase: 'error', message: 'Network error. Check your connection and try again.' });
    }
  }, []);

  const processFile = useCallback(async (file: File) => {
    setState({ phase: 'processing' });
    let url: string | null = null;
    try {
      url = URL.createObjectURL(file);

      // Load image into an <img> element (browser respects EXIF orientation)
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('img-load-failed'));
        img.src = url!;
      });

      // Draw onto a canvas so ZXing reads correct pixel data
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas-unavailable');
      ctx.drawImage(img, 0, 0);

      // Decode directly from canvas pixels — more reliable than decodeFromImageUrl
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      const result = reader.decodeFromCanvas(canvas);
      lookupBarcode(result.getText());
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'img-load-failed' || msg === 'canvas-unavailable') {
        setState({ phase: 'error', message: 'Could not read image. Please try again.' });
      } else {
        // NotFoundException from ZXing means no barcode was found
        setState({ phase: 'not_found', barcode: 'N/A', productName: 'No barcode detected — try a clearer photo' });
      }
    } finally {
      if (url) URL.revokeObjectURL(url);
    }
  }, [lookupBarcode]);

  const reset = () => setState({ phase: 'idle' });

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/" className="text-primary-400 hover:text-primary-600 p-1 -m-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h2 className="font-display text-xl font-bold text-primary-900 leading-tight">Scan a Barcode</h2>
          <p className="text-xs text-primary-400">Instant kosher-for-Pesach check</p>
        </div>
      </div>

      {/* IDLE */}
      {state.phase === 'idle' && (
        <div className="space-y-3">
          {/* Primary — opens native camera (works on all devices, no permission prompt) */}
          <button
            onClick={() => liveFileRef.current?.click()}
            className="w-full bg-primary-900 text-white rounded-2xl p-6 flex flex-col items-center gap-3 active:bg-primary-800 transition-colors"
          >
            <span className="text-5xl">📸</span>
            <span className="font-display text-lg font-semibold">Scan Barcode</span>
            <span className="text-xs text-primary-300 text-center">Opens your camera — point at any barcode</span>
          </button>
          {/* Hidden input — capture=environment opens rear camera directly on mobile */}
          <input
            ref={liveFileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ''; }}
          />

          {/* Secondary — upload from photo library */}
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-primary-200 text-primary-600 rounded-2xl p-4 flex items-center gap-3 active:border-primary-400 transition-colors"
          >
            <span className="text-2xl">🖼️</span>
            <div className="text-left">
              <p className="font-medium text-sm">Upload from photo library</p>
              <p className="text-xs text-primary-400">Already have a photo with a barcode?</p>
            </div>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ''; }}
          />

          <div className="bg-primary-50 rounded-xl p-4 text-xs text-primary-500 space-y-1">
            <p className="font-medium text-primary-700">How it works</p>
            <p>1. Tap <strong>Scan Barcode</strong> — your camera opens</p>
            <p>2. Point at a product barcode and take a photo</p>
            <p>3. We look it up in Open Food Facts &amp; match against OU, CRC &amp; Star-K guides</p>
            <p className="text-primary-400 pt-1">Works on iPhone, Android, and desktop.</p>
          </div>
        </div>
      )}

      {/* PROCESSING */}
      {state.phase === 'processing' && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-14 h-14 rounded-full border-4 border-primary-900 border-t-transparent animate-spin" />
          <p className="font-medium text-primary-700">Reading barcode…</p>
        </div>
      )}

      {/* LOOKING UP */}
      {state.phase === 'looking_up' && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-14 h-14 rounded-full border-4 border-primary-900 border-t-transparent animate-spin" />
          <p className="font-medium text-primary-700">Looking up product…</p>
          <p className="text-xs text-primary-400 font-mono">{state.barcode}</p>
        </div>
      )}

      {/* RESULTS */}
      {state.phase === 'results' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-primary-100 p-4 flex items-start gap-3">
            {state.imageUrl && (
              <img src={state.imageUrl} alt={state.productName} className="w-14 h-14 rounded-lg object-contain border border-primary-100 bg-gray-50 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-primary-400 uppercase tracking-wide font-medium">Scanned product</p>
              {state.brand && <p className="font-semibold text-primary-900 text-base leading-snug">{state.brand}</p>}
              {state.productName && <p className="text-sm text-primary-600">{state.productName}</p>}
              <p className="text-xs text-primary-300 font-mono mt-0.5">{state.barcode}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-primary-400 mb-2">{state.results.length} match{state.results.length !== 1 ? 'es' : ''} found</p>
            <div className="space-y-2">
              {state.results.slice(0, 8).map((r) => {
                const sc = STATUS_CONFIG[r.item.status as ItemStatus];
                const oc = ORG_CONFIG[r.item.org as OrgCode];
                const sourceUrl = `/documents/${r.item.sourceSlug}${r.item.pageNumber ? `?page=${r.item.pageNumber}` : ''}`;
                return (
                  <div key={r.item.id} className="bg-white rounded-xl border border-primary-100 p-3">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="font-medium text-primary-900 text-sm flex-1 min-w-0 leading-snug">{r.item.productName}</p>
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${oc.bgColor} ${oc.color}`}>{r.item.org}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${sc.bgColor} ${sc.color} ${sc.borderColor}`}>
                        {sc.emoji} {sc.label}
                      </span>
                      <Link href={sourceUrl} className="text-xs text-gold-600 font-medium shrink-0">View source →</Link>
                    </div>
                    {r.item.conditions && <p className="text-xs text-primary-400 mt-1.5 line-clamp-2">{r.item.conditions}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={reset} className="w-full py-3 bg-primary-900 text-white rounded-xl text-sm font-medium active:bg-primary-800 transition-colors">
            📸 Scan Another
          </button>
        </div>
      )}

      {/* NOT FOUND */}
      {state.phase === 'not_found' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-primary-100 p-5 text-center space-y-2">
            <p className="text-3xl">🔍</p>
            <p className="font-semibold text-primary-900">Not in our database</p>
            {state.productName && <p className="text-sm text-primary-500">{state.productName}</p>}
            <p className="text-xs text-primary-400">
              {state.barcode === 'N/A'
                ? 'Try again with the barcode clearly in frame and good lighting.'
                : 'This product wasn\'t matched in the OU, CRC, or Star-K guides.'}
            </p>
          </div>
          {state.productName && state.barcode !== 'N/A' && (
            <Link href={`/?q=${encodeURIComponent(state.productName)}`} className="block w-full py-3 bg-primary-900 text-white rounded-xl text-sm font-medium text-center active:bg-primary-800 transition-colors">
              Search for &ldquo;{state.productName}&rdquo;
            </Link>
          )}
          <button onClick={reset} className="w-full py-3 rounded-xl border border-primary-200 text-primary-600 text-sm font-medium active:bg-primary-50 transition-colors">
            📸 Try Again
          </button>
        </div>
      )}

      {/* ERROR */}
      {state.phase === 'error' && (
        <div className="space-y-4">
          <div className="bg-red-50 rounded-xl border border-red-200 p-5 text-center space-y-2">
            <p className="text-2xl">⚠️</p>
            <p className="font-semibold text-red-800">Something went wrong</p>
            <p className="text-sm text-red-600">{state.message}</p>
          </div>
          <button onClick={reset} className="w-full py-3 bg-primary-900 text-white rounded-xl text-sm font-medium active:bg-primary-800 transition-colors">
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
