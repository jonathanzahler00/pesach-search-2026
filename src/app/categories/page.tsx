'use client';

import { Suspense, useState, useMemo } from 'react';
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
      <h2 className="font-display text-2xl font-bold text-primary-900 mb-1">
        {selectedCat ? selectedCat : 'Browse by Category'}
      </h2>
      {selectedCat && (
        <Link href="/categories" className="text-sm text-gold-600 hover:underline">
          ← All Categories
        </Link>
      )}

      {!selectedCat ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              href={`/categories?cat=${encodeURIComponent(cat.name)}`}
              className="bg-white rounded-lg border border-primary-100 p-4 hover:shadow-md hover:border-gold-300 transition-all"
            >
              <p className="font-semibold text-primary-800">{cat.name}</p>
              <p className="text-sm text-primary-400 mt-1">
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
        <div className="mt-4 space-y-2">
          {items.map((item) => {
            const statusConfig = STATUS_CONFIG[item.status as ItemStatus];
            const orgConfig = ORG_CONFIG[item.org as OrgCode];
            const sourceUrl = `/documents/${item.sourceSlug}${item.pageNumber ? `?page=${item.pageNumber}` : ''}`;

            return (
              <div key={item.id} className="bg-white rounded-lg border border-primary-100 p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-primary-900 text-sm truncate">{item.productName}</p>
                  {item.conditions && (
                    <p className="text-xs text-primary-400 truncate">{item.conditions}</p>
                  )}
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${statusConfig.bgColor} ${statusConfig.color}`}>
                  {statusConfig.emoji} {statusConfig.label}
                </span>
                <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${orgConfig?.bgColor} ${orgConfig?.color}`}>
                  {item.org}
                </span>
                <Link href={sourceUrl} className="shrink-0 text-xs text-gold-600 hover:underline">
                  Source
                </Link>
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
