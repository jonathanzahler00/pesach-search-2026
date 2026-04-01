'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import sourcesData from '@/data/sources.json';

function DocumentViewerInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const initialPage = parseInt(searchParams.get('page') ?? '1', 10);

  const source = sourcesData.find(s => s.slug === slug);

  if (!source) {
    return (
      <div className="text-center py-12">
        <p className="text-xl mb-2">📭</p>
        <p className="text-primary-500">Document not found.</p>
        <Link href="/documents" className="text-gold-600 underline text-sm mt-2 inline-block">
          Back to documents
        </Link>
      </div>
    );
  }

  const fileUrl = (source as { externalUrl?: string }).externalUrl ?? `/pdfs/${source.fileName}`;
  const isImage = source.fileType === 'image';
  const isViewOnlySource = slug === 'cor-costco';

  return (
    <div>
      {/* Header row */}
      <div className="flex items-start gap-3 mb-4">
        <Link
          href="/documents"
          className="shrink-0 text-primary-400 hover:text-primary-600 transition-colors p-1 -m-1"
          aria-label="Back to documents"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-lg sm:text-xl font-bold text-primary-900 leading-snug">
            {source.org}: {source.title}
          </h2>
          <p className="text-xs text-primary-400 mt-0.5">{source.fileName}{source.pageCount ? ` · ${source.pageCount} pages` : ''}</p>
        </div>
        {/* Open in new tab — always visible, critical for mobile */}
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-900 hover:bg-primary-800 text-white text-sm font-medium transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span className="hidden sm:inline">Open</span>
        </a>
      </div>

      {/* Document viewer */}
      <div className="bg-white rounded-xl border border-primary-100 overflow-hidden">
        {isImage ? (
          <div className="p-4">
            {isViewOnlySource && (
              <div className="max-w-4xl mx-auto mb-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                This source image is available to view, but it is not yet included in the searchable product results.
              </div>
            )}
            <img
              src={fileUrl}
              alt={source.title}
              className="w-full max-w-4xl mx-auto rounded-lg shadow-md"
              style={{ imageRendering: 'auto' }}
            />
          </div>
        ) : (
          <>
            {/* Mobile: prompt to open externally since inline PDF rendering is unreliable */}
            <div className="sm:hidden p-6 text-center space-y-4">
              <p className="text-4xl">📄</p>
              <p className="font-semibold text-primary-900">{source.title}</p>
              <p className="text-sm text-primary-500">
                Tap the button below to open the PDF in your browser&apos;s PDF viewer.
              </p>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary-900 hover:bg-primary-800 text-white font-semibold transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open PDF
              </a>
            </div>

            {/* Desktop: embedded iframe */}
            <div className="hidden sm:block pdf-viewer-container">
              <iframe
                src={`${fileUrl}#page=${initialPage}`}
                className="w-full h-full border-0"
                title={source.title}
                style={{ minHeight: 'calc(100dvh - 180px)' }}
              />
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-primary-400 mt-3 text-center">
        Source: {source.orgFull}
      </p>
    </div>
  );
}

export default function DocumentViewerPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-primary-400">Loading document...</div>}>
      <DocumentViewerInner />
    </Suspense>
  );
}
