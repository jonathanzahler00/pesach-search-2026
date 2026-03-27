'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';

interface Props {
  onDetected: (barcode: string) => void;
  active: boolean;
}

type CameraError =
  | { type: 'not_secure' }
  | { type: 'denied' }
  | { type: 'not_found' }
  | { type: 'generic'; message: string };

export default function BarcodeScanner({ onDetected, active }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [error, setError] = useState<CameraError | null>(null);
  const [ready, setReady] = useState(false);

  const stop = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setReady(false);
  }, []);

  useEffect(() => {
    if (!active) { stop(); return; }

    // Camera requires a secure context (HTTPS or localhost)
    if (!window.isSecureContext) {
      setError({ type: 'not_secure' });
      return;
    }

    const reader = new BrowserMultiFormatReader();

    reader
      .decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
        if (result) {
          onDetected(result.getText());
          stop();
        }
      })
      .then((controls) => {
        controlsRef.current = controls;
        setReady(true);
        setError(null);
      })
      .catch((err: Error) => {
        if (err.name === 'NotAllowedError') setError({ type: 'denied' });
        else if (err.name === 'NotFoundError') setError({ type: 'not_found' });
        else setError({ type: 'generic', message: err.message });
      });

    return () => stop();
  }, [active, onDetected, stop]);

  if (error) return <CameraErrorView error={error} />;

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black">
      <video
        ref={videoRef}
        className="w-full aspect-[4/3] object-cover"
        playsInline
        muted
      />

      {ready && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10 rounded-lg" style={{ width: '72%', aspectRatio: '3/2' }}>
            {(['tl','tr','bl','br'] as const).map((c) => (
              <span key={c} className="absolute w-7 h-7 border-white border-[3px]" style={{
                top: c.startsWith('t') ? 0 : 'auto',
                bottom: c.startsWith('b') ? 0 : 'auto',
                left: c.endsWith('l') ? 0 : 'auto',
                right: c.endsWith('r') ? 0 : 'auto',
                borderRight: c.endsWith('l') ? 'none' : undefined,
                borderLeft: c.endsWith('r') ? 'none' : undefined,
                borderBottom: c.startsWith('t') ? 'none' : undefined,
                borderTop: c.startsWith('b') ? 'none' : undefined,
                borderRadius: c === 'tl' ? '4px 0 0 0' : c === 'tr' ? '0 4px 0 0' : c === 'bl' ? '0 0 0 4px' : '0 0 4px 0',
              }} />
            ))}
            <div className="absolute inset-x-0 top-0 h-0.5 bg-red-500/90 scan-line" />
          </div>
          <p className="absolute bottom-4 left-0 right-0 text-center text-white/80 text-xs font-medium">
            Point camera at a barcode
          </p>
        </div>
      )}

      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="text-white text-sm flex items-center gap-2">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Starting camera…
          </div>
        </div>
      )}
    </div>
  );
}

function CameraErrorView({ error }: { error: CameraError }) {
  const content = {
    not_secure: {
      icon: '🔒',
      title: 'HTTPS required for camera',
      body: 'Camera access only works on secure connections. Use the live app at pesach-search-2026.vercel.app, or upload a photo below instead.',
    },
    denied: {
      icon: '🚫',
      title: 'Camera access denied',
      body: (
        <>
          To fix this:
          <br /><strong>iPhone:</strong> Settings → Safari → Camera → Allow
          <br /><strong>Android:</strong> Browser menu → Site settings → Camera → Allow
          <br /><br />Or upload a photo instead.
        </>
      ),
    },
    not_found: {
      icon: '📷',
      title: 'No camera found',
      body: 'This device doesn\'t have an accessible camera. Use the "Upload a photo" option below.',
    },
    generic: {
      icon: '⚠️',
      title: 'Could not start camera',
      body: 'Try the "Upload a photo" option below instead.',
    },
  }[error.type];

  return (
    <div className="flex flex-col items-center justify-center bg-gray-900 rounded-2xl p-6 text-center gap-3 min-h-[220px]">
      <span className="text-4xl">{content.icon}</span>
      <p className="text-white font-semibold text-sm">{content.title}</p>
      <p className="text-gray-300 text-xs leading-relaxed">{content.body}</p>
    </div>
  );
}
