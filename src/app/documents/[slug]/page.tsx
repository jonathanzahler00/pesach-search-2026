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
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/documents"
          className="text-sm text-primary-400 hover:text-primary-600 transition-colors"
        >
          ← All Documents
        </Link>
        <span className="text-primary-200">|</span>
        <h2 className="font-display text-xl font-bold text-primary-900">
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
            {/*
              CURSOR IMPLEMENTATION NOTE:
              
              The react-pdf-viewer library needs to be set up with the PDF.js worker.
              Here's the pattern:

              import { Viewer, Worker } from '@react-pdf-viewer/core';
              import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
              import '@react-pdf-viewer/core/lib/styles/index.css';
              import '@react-pdf-viewer/default-layout/lib/styles/index.css';

              const defaultLayoutPluginInstance = defaultLayoutPlugin();

              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                <Viewer
                  fileUrl={fileUrl}
                  plugins={[defaultLayoutPluginInstance]}
                  initialPage={initialPage - 1}
                />
              </Worker>

              For now, we use an iframe fallback which works in all browsers:
            */}
            <iframe
              src={`${fileUrl}#page=${initialPage}`}
              className="w-full h-full border-0"
              title={source.title}
              style={{ minHeight: 'calc(100vh - 200px)' }}
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
