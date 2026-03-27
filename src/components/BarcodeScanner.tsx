'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';

interface Props {
  onDetected: (barcode: string) => void;
  active: boolean;
}

export default function BarcodeScanner({ onDetected, active }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const stop = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setReady(false);
  }, []);

  useEffect(() => {
    if (!active) {
      stop();
      return;
    }

    const reader = new BrowserMultiFormatReader();

    reader
      .decodeFromVideoDevice(undefined, videoRef.current!, (result, err) => {
        if (result) {
          onDetected(result.getText());
          stop();
        }
        if (err && !(err.message?.includes('No MultiFormat Readers'))) {
          // Suppress the common "no barcode found in frame" noise
        }
      })
      .then((controls) => {
        controlsRef.current = controls;
        setReady(true);
        setError(null);
      })
      .catch((err: Error) => {
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow camera access and try again.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else {
          setError('Could not start camera. Try uploading a photo instead.');
        }
      });

    return () => stop();
  }, [active, onDetected, stop]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center bg-gray-900 rounded-2xl p-8 text-center gap-3 min-h-[260px]">
        <span className="text-4xl">📷</span>
        <p className="text-white text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black">
      <video
        ref={videoRef}
        className="w-full aspect-[4/3] object-cover"
        playsInline
        muted
      />

      {/* Viewfinder overlay */}
      {ready && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Dark surround */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Clear scan window */}
          <div
            className="relative z-10 rounded-lg"
            style={{ width: '72%', aspectRatio: '3/2' }}
          >
            {/* Corner brackets */}
            {(['tl','tr','bl','br'] as const).map((corner) => (
              <span
                key={corner}
                className="absolute w-7 h-7 border-white border-[3px]"
                style={{
                  top: corner.startsWith('t') ? 0 : 'auto',
                  bottom: corner.startsWith('b') ? 0 : 'auto',
                  left: corner.endsWith('l') ? 0 : 'auto',
                  right: corner.endsWith('r') ? 0 : 'auto',
                  borderRight: corner.endsWith('l') ? 'none' : undefined,
                  borderLeft: corner.endsWith('r') ? 'none' : undefined,
                  borderBottom: corner.startsWith('t') ? 'none' : undefined,
                  borderTop: corner.startsWith('b') ? 'none' : undefined,
                  borderRadius: corner === 'tl' ? '4px 0 0 0' : corner === 'tr' ? '0 4px 0 0' : corner === 'bl' ? '0 0 0 4px' : '0 0 4px 0',
                }}
              />
            ))}

            {/* Scanning line animation */}
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
