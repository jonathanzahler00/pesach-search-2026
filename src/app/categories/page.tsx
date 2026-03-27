'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getCategories, getItemsByCategory } from '@/lib/search';
import { STATUS_CONFIG, ORG_CONFIG } from '@/lib/types';
import type { ItemStatus, OrgCode } from '@/lib/types';

function CategoriesInner() {
  const searchParams = useSearchParams();
  const selectedCat = searchParams.get('cat');
  const categories = getCategories();

  const items = useMemo(() => {
    if (!selectedCat) return [];
    return getItemsByCategory(selectedCat);
  }, [selectedCat]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        {selectedCat && (
          <Link href="/categories" className="text-primary-400 hover:text-primary-600 p-1 -m-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        )}
        <h2 className="font-display text-xl sm:text-2xl font-bold text-primary-900">
          {selectedCat ?? 'Browse by Category'}
        </h2>
      </div>

      {!selectedCat ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              href={`/categories?cat=${encodeURIComponent(cat.name)}`}
              className="bg-white rounded-lg border border-primary-100 p-3 hover:shadow-md active:shadow-md hover:border-gold-300 transition-all"
            >
              <p className="font-semibold text-primary-800 text-sm leading-snug">{cat.name}</p>
              <p className="text-xs text-primary-400 mt-1">
                {cat.count} item{cat.count !== 1 ? 's' : ''}
              </p>
              <div className="flex gap-1 mt-2 flex-wrap">
                {cat.orgs.map(org => {
                  const config = ORG_CONFIG[org as OrgCode];
                  return (
                    <span key={org} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${config?.bgColor ?? 'bg-gray-100'} ${config?.color ?? 'text-gray-600'}`}>
                      {org}
                    </span>
                  );
                })}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-primary-400 mb-3">
            {items.length} item{items.length !== 1 ? 's' : ''}
          </p>
          {items.map((item) => {
            const statusConfig = STATUS_CONFIG[item.status as ItemStatus];
            const orgConfig = ORG_CONFIG[item.org as OrgCode];
            const sourceUrl = `/documents/${item.sourceSlug}${item.pageNumber ? `?page=${item.pageNumber}` : ''}`;

            return (
              <div key={item.id} className="bg-white rounded-xl border border-primary-100 p-3">
                {/* Row 1: name + org */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="font-medium text-primary-900 text-sm flex-1 min-w-0 leading-snug">
                    {item.productName}
                  </p>
                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${orgConfig?.bgColor} ${orgConfig?.color}`}>
                    {item.org}
                  </span>
                </div>

                {/* Row 2: status badge + source link */}
                <div className="flex items-center justify-between gap-2">
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${statusConfig.bgColor} ${statusConfig.color}`}>
                    {statusConfig.emoji} {statusConfig.label}
                  </span>
                  <Link href={sourceUrl} className="text-xs text-gold-600 font-medium shrink-0">
                    View source →
                  </Link>
                </div>

                {/* Conditions (if any) */}
                {item.conditions && (
                  <p className="text-xs text-primary-400 mt-1.5 line-clamp-1">{item.conditions}</p>
                )}
              </div>
            );
          })}
          {items.length === 0 && (
            <p className="text-primary-400 text-center py-8">No items in this category.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-primary-400">Loading...</div>}>
      <CategoriesInner />
    </Suspense>
  );
}
