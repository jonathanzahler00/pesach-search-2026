'use client';

import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { searchItems } from '@/lib/search';
import { STATUS_CONFIG, ORG_CONFIG } from '@/lib/types';
import type { SearchResult, ItemStatus, OrgCode } from '@/lib/types';

const BarcodeScanner = dynamic(
  () => import('@/components/BarcodeScanner'),
  { ssr: false, loading: () => <CameraPlaceholder /> }
);

function CameraPlaceholder() {
  return (
    <div className="flex items-center justify-center bg-gray-900 rounded-2xl min-h-[260px]">
      <p className="text-white/60 text-sm">Loading camera…</p>
    </div>
  );
}

type ScanState =
  | { phase: 'idle' }
  | { phase: 'scanning' }
  | { phase: 'looking_up'; barcode: string }
  | { phase: 'results'; barcode: string; productName: string; brand: string; imageUrl: string | null; results: SearchResult[] }
  | { phase: 'not_found'; barcode: string; productName?: string }
  | { phase: 'error'; message: string };

export default function ScanPage() {
  const [state, setState] = useState<ScanState>({ phase: 'idle' });
  const fileRef = useRef<HTMLInputElement>(null);

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
        setState({
          phase: 'not_found',
          barcode,
          productName: [data.brand, data.productName].filter(Boolean).join(' — '),
        });
        return;
      }

      setState({
        phase: 'results',
        barcode,
        productName: data.productName,
        brand: data.brand,
        imageUrl: data.imageUrl,
        results,
      });
    } catch {
      setState({ phase: 'error', message: 'Network error. Check your connection and try again.' });
    }
  }, []);

  const handleDetected = useCallback((barcode: string) => {
    lookupBarcode(barcode);
  }, [lookupBarcode]);

  const reset = () => setState({ phase: 'scanning' });
  const startScan = () => setState({ phase: 'scanning' });

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
          <h2 className="font-display text-xl font-bold text-primary-900 leading-tight">
            Scan a Barcode
          </h2>
          <p className="text-xs text-primary-400">Instant kosher-for-Pesach check</p>
        </div>
      </div>

      {/* Idle state — big start button */}
      {state.phase === 'idle' && (
        <div className="space-y-4">
          <button
            onClick={startScan}
            className="w-full bg-primary-900 text-white rounded-2xl p-6 flex flex-col items-center gap-3 active:bg-primary-800 transition-colors"
          >
            <span className="text-5xl">📷</span>
            <span className="font-display text-lg font-semibold">Tap to Scan</span>
            <span className="text-xs text-primary-300">Point at any product barcode</span>
          </button>

          <div className="relative flex items-center">
            <div className="flex-1 border-t border-primary-100" />
            <span className="px-3 text-xs text-primary-300 font-medium">or</span>
            <div className="flex-1 border-t border-primary-100" />
          </div>

          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-primary-200 text-primary-600 rounded-2xl p-5 flex items-center gap-3 active:border-primary-400 transition-colors"
          >
            <span className="text-2xl">🖼️</span>
            <div className="text-left">
              <p className="font-medium text-sm">Upload a photo</p>
              <p className="text-xs text-primary-400">Works with barcode photos from your camera roll</p>
            </div>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageFile(file, handleDetected, setState);
            }}
          />

          <div className="bg-primary-50 rounded-xl p-4 text-xs text-primary-500 space-y-1">
            <p className="font-medium text-primary-700">How it works</p>
            <p>1. Scan or upload a product barcode</p>
            <p>2. We look it up in the Open Food Facts database</p>
            <p>3. We check the product name against OU, CRC &amp; Star-K guides</p>
            <p className="text-primary-400 pt-1">
              <strong>Note:</strong> Camera requires HTTPS. If using the live app at vercel.app it will work. On first use, tap &ldquo;Allow&rdquo; when the browser asks for camera permission.
            </p>
          </div>
        </div>
      )}

      {/* Scanning state */}
      {state.phase === 'scanning' && (
        <div className="space-y-4">
          <BarcodeScanner onDetected={handleDetected} active={true} />
          <button
            onClick={() => setState({ phase: 'idle' })}
            className="w-full py-3 rounded-xl border border-primary-200 text-primary-600 text-sm font-medium active:bg-primary-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Looking up */}
      {state.phase === 'looking_up' && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-14 h-14 rounded-full border-4 border-primary-900 border-t-transparent animate-spin" />
          <p className="font-medium text-primary-700">Looking up barcode…</p>
          <p className="text-xs text-primary-400 font-mono">{state.barcode}</p>
        </div>
      )}

      {/* Results */}
      {state.phase === 'results' && (
        <div className="space-y-4">
          {/* Product header */}
          <div className="bg-white rounded-xl border border-primary-100 p-4 flex items-start gap-3">
            {state.imageUrl && (
              <img
                src={state.imageUrl}
                alt={state.productName}
                className="w-14 h-14 rounded-lg object-contain border border-primary-100 bg-gray-50 shrink-0"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-primary-400 uppercase tracking-wide font-medium">Scanned product</p>
              {state.brand && <p className="font-semibold text-primary-900 text-base leading-snug">{state.brand}</p>}
              {state.productName && <p className="text-sm text-primary-600">{state.productName}</p>}
              <p className="text-xs text-primary-300 font-mono mt-0.5">{state.barcode}</p>
            </div>
          </div>

          {/* Matches */}
          <div>
            <p className="text-xs text-primary-400 mb-2">
              {state.results.length} match{state.results.length !== 1 ? 'es' : ''} found
            </p>
            <div className="space-y-2">
              {state.results.slice(0, 8).map((r) => {
                const sc = STATUS_CONFIG[r.item.status as ItemStatus];
                const oc = ORG_CONFIG[r.item.org as OrgCode];
                const sourceUrl = `/documents/${r.item.sourceSlug}${r.item.pageNumber ? `?page=${r.item.pageNumber}` : ''}`;
                return (
                  <div key={r.item.id} className="bg-white rounded-xl border border-primary-100 p-3">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="font-medium text-primary-900 text-sm flex-1 min-w-0 leading-snug">
                        {r.item.productName}
                      </p>
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${oc.bgColor} ${oc.color}`}>
                        {r.item.org}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${sc.bgColor} ${sc.color} ${sc.borderColor}`}>
                        {sc.emoji} {sc.label}
                      </span>
                      <Link href={sourceUrl} className="text-xs text-gold-600 font-medium shrink-0">
                        View source →
                      </Link>
                    </div>
                    {r.item.conditions && (
                      <p className="text-xs text-primary-400 mt-1.5 line-clamp-2">{r.item.conditions}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={reset}
            className="w-full py-3 bg-primary-900 text-white rounded-xl text-sm font-medium active:bg-primary-800 transition-colors"
          >
            📷 Scan Another
          </button>
        </div>
      )}

      {/* Not found */}
      {state.phase === 'not_found' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-primary-100 p-5 text-center space-y-2">
            <p className="text-3xl">🔍</p>
            <p className="font-semibold text-primary-900">Not in our database</p>
            {state.productName && (
              <p className="text-sm text-primary-500">{state.productName}</p>
            )}
            <p className="text-xs text-primary-400">
              This product wasn&apos;t matched in the OU, CRC, or Star-K guides.
              {state.productName && ' Try searching manually below.'}
            </p>
          </div>

          {state.productName && (
            <Link
              href={`/?q=${encodeURIComponent(state.productName)}`}
              className="block w-full py-3 bg-primary-900 text-white rounded-xl text-sm font-medium text-center active:bg-primary-800 transition-colors"
            >
              Search for &ldquo;{state.productName}&rdquo;
            </Link>
          )}

          <button
            onClick={reset}
            className="w-full py-3 rounded-xl border border-primary-200 text-primary-600 text-sm font-medium active:bg-primary-50 transition-colors"
          >
            📷 Try Again
          </button>
        </div>
      )}

      {/* Error */}
      {state.phase === 'error' && (
        <div className="space-y-4">
          <div className="bg-red-50 rounded-xl border border-red-200 p-5 text-center space-y-2">
            <p className="text-2xl">⚠️</p>
            <p className="font-semibold text-red-800">Something went wrong</p>
            <p className="text-sm text-red-600">{state.message}</p>
          </div>
          <button
            onClick={reset}
            className="w-full py-3 bg-primary-900 text-white rounded-xl text-sm font-medium active:bg-primary-800 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

async function handleImageFile(
  file: File,
  onDetected: (barcode: string) => void,
  setState: (s: ScanState) => void
) {
  setState({ phase: 'looking_up', barcode: 'Reading image…' });

  try {
    const { BrowserMultiFormatReader } = await import('@zxing/browser');
    const img = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    const reader = new BrowserMultiFormatReader();
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Try to decode from the canvas element
    canvas.toBlob(async (blob) => {
      if (!blob) { setState({ phase: 'error', message: 'Could not read image.' }); return; }
      const url = URL.createObjectURL(blob);
      try {
        const result = await reader.decodeFromImageUrl(url);
        URL.revokeObjectURL(url);
        if (result) {
          onDetected(result.getText());
        } else {
          setState({ phase: 'not_found', barcode: 'N/A' });
        }
      } catch {
        URL.revokeObjectURL(url);
        setState({ phase: 'not_found', barcode: 'N/A', productName: 'No barcode detected in image' });
      }
    });
  } catch {
    setState({ phase: 'error', message: 'Could not process image. Try scanning with your camera instead.' });
  }
}
