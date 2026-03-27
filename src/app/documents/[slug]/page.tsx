'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
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

  const fileUrl = `/pdfs/${source.fileName}`;
  const isImage = source.fileType === 'image';

  return (
    <div>
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
        <h2 className="font-display text-lg sm:text-xl font-bold text-primary-900 leading-snug">
          {source.org}: {source.title}
        </h2>
      </div>

      <div className="bg-white rounded-xl border border-primary-100 overflow-hidden">
        {isImage ? (
          /* Image viewer for COR Costco PNG */
          <div className="p-4">
            <img
              src={fileUrl}
              alt={source.title}
              className="w-full max-w-4xl mx-auto rounded-lg shadow-md"
              style={{ imageRendering: 'auto' }}
            />
          </div>
        ) : (
          /* PDF viewer */
          <div className="pdf-viewer-container">
            <iframe
              src={`${fileUrl}#page=${initialPage}`}
              className="w-full h-full border-0"
              title={source.title}
              style={{ minHeight: 'calc(100dvh - 180px)' }}
            />
          </div>
        )}
      </div>

      <p className="text-xs text-primary-400 mt-3 text-center">
        Source: {source.orgFull} · {source.fileName}
        {source.pageCount ? ` · ${source.pageCount} pages` : ''}
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
