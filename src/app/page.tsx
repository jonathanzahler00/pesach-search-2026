'use client';

import { useState, useMemo } from 'react';
import { searchItems, getTotalCount, getCategories, getOrgs } from '@/lib/search';
import { STATUS_CONFIG, ORG_CONFIG } from '@/lib/types';
import type { SearchResult, ItemStatus, OrgCode } from '@/lib/types';
import Link from 'next/link';

function StatusBadge({ status }: { status: ItemStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${config.bgColor} ${config.color} ${config.borderColor} border ${status === 'ask_rabbi' ? 'pulse-gentle' : ''}`}
    >
      {config.emoji} {config.label}
    </span>
  );
}

function OrgBadge({ org }: { org: OrgCode }) {
  const config = ORG_CONFIG[org];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.color}`}>
      {org}
    </span>
  );
}

function ProductCard({ result }: { result: SearchResult }) {
  const { item } = result;
  const sourceUrl = item.sourceSlug
    ? `/documents/${item.sourceSlug}${item.pageNumber ? `?page=${item.pageNumber}` : ''}`
    : '#';

  return (
    <div className="bg-white rounded-xl border border-primary-100 p-4 shadow-sm active:scale-[0.99] transition-transform">
      {/* Top row: product name + org badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-primary-900 text-base leading-tight flex-1 min-w-0">
          {item.productName}
        </h3>
        <OrgBadge org={item.org as OrgCode} />
      </div>

      {/* Category + status */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <StatusBadge status={item.status} />
        <span className="text-xs text-primary-400">{item.category}</span>
        {item.isKitniyot && (
          <span className="text-xs text-yellow-600 font-medium">🫘 Kitniyot</span>
        )}
      </div>

      {/* Conditions */}
      {item.conditions && (
        <p className="text-xs text-primary-600 bg-primary-50 rounded px-2 py-1.5 mb-2">
          <span className="font-medium">Conditions:</span> {item.conditions}
        </p>
      )}

      {/* Notes */}
      {item.notes && (
        <p className="text-xs text-primary-400 line-clamp-2 mb-2">{item.notes}</p>
      )}

      {/* Source link */}
      <Link
        href={sourceUrl}
        className="inline-flex items-center gap-1 text-xs text-gold-600 font-medium active:underline"
      >
        📄 {item.sourceTitle}{item.pageNumber ? `, p.${item.pageNumber}` : ''}
      </Link>
    </div>
  );
}

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterOrg, setFilterOrg] = useState<string>('all');

  const totalCount = getTotalCount();
  const categories = getCategories();
  const orgs = getOrgs();

  const results = useMemo(() => {
    if (!query || query.length < 2) return [];
    let r = searchItems(query);
    if (filterStatus !== 'all') r = r.filter(res => res.item.status === filterStatus);
    if (filterOrg !== 'all') r = r.filter(res => res.item.org === filterOrg);
    return r;
  }, [query, filterStatus, filterOrg]);

  return (
    <div>
      {/* Hero */}
      <section className="text-center mb-6">
        <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-primary-900 mb-1">
          Is it Kosher for Pesach?
        </h2>
        <p className="text-sm sm:text-base text-primary-500 mb-4">
          Search {totalCount.toLocaleString()} products across {orgs.length} organizations
        </p>

        {/* Search input */}
        <div className="max-w-2xl mx-auto space-y-2">
          <input
            type="search"
            inputMode="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a product or brand..."
            className="search-input w-full px-4 py-3.5 text-base sm:text-lg rounded-xl border-2 border-primary-200 bg-white placeholder:text-primary-300 focus:border-gold-400 focus:outline-none"
            autoFocus
          />

          {/* Filters — full width on mobile, side by side on sm+ */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-center sm:gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-lg border border-primary-200 bg-white text-primary-700 text-sm w-full sm:w-auto"
            >
              <option value="all">All Statuses</option>
              <option value="approved">✅ Approved</option>
              <option value="kitniyot">🟡 Kitniyot</option>
              <option value="ask_rabbi">⚠️ Ask Rabbi</option>
              <option value="conditional">🔵 Conditional</option>
            </select>

            <select
              value={filterOrg}
              onChange={(e) => setFilterOrg(e.target.value)}
              className="px-3 py-2 rounded-lg border border-primary-200 bg-white text-primary-700 text-sm w-full sm:w-auto"
            >
              <option value="all">All Orgs</option>
              {orgs.map(o => (
                <option key={o.code} value={o.code}>
                  {o.code} ({o.count})
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Results */}
      {query.length >= 2 && (
        <section>
          <p className="text-xs text-primary-400 mb-3">
            {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
          </p>

          {results.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-primary-100">
              <p className="text-3xl mb-2">🔍</p>
              <p className="text-primary-500 font-medium">No results for &ldquo;{query}&rdquo;</p>
              <p className="text-sm text-primary-400 mt-1">
                Try a different spelling, or{' '}
                <Link href="/documents" className="text-gold-600 underline">browse the source documents</Link>.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {results.map((r) => (
                <ProductCard key={r.item.id} result={r} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Browse categories — shown when no search query */}
      {query.length < 2 && (
        <section>
          <h3 className="font-display text-lg sm:text-xl font-semibold text-primary-800 mb-3">
            Browse by Category
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                href={`/categories?cat=${encodeURIComponent(cat.name)}`}
                className="bg-white rounded-lg border border-primary-100 p-3 active:shadow-md hover:shadow-md hover:border-gold-300 transition-all"
              >
                <p className="font-medium text-primary-800 text-sm leading-snug">{cat.name}</p>
                <p className="text-xs text-primary-400 mt-1">
                  {cat.count} item{cat.count !== 1 ? 's' : ''} · {cat.orgs.join(', ')}
                </p>
              </Link>
            ))}
          </div>

          {/* Quick-links row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
            <Link
              href="/documents"
              className="bg-primary-900 text-white rounded-xl p-4 hover:bg-primary-800 active:bg-primary-800 transition-colors"
            >
              <p className="text-base font-display font-semibold">📚 Source Documents</p>
              <p className="text-xs text-primary-300 mt-1">View OU, CRC, Star-K, COR guides in full</p>
            </Link>
            <Link
              href="/medicine"
              className="bg-orange-50 text-orange-900 rounded-xl p-4 border border-orange-200 hover:shadow-md active:shadow-md transition-all"
            >
              <p className="text-base font-display font-semibold">💊 Medicine Guide</p>
              <p className="text-xs text-orange-700 mt-1">Pesach guidelines for medications</p>
            </Link>
            <Link
              href="/categories?cat=Non-Food"
              className="bg-blue-50 text-blue-900 rounded-xl p-4 border border-blue-200 hover:shadow-md active:shadow-md transition-all"
            >
              <p className="text-base font-display font-semibold">🧴 Non-Food Items</p>
              <p className="text-xs text-blue-700 mt-1">Usable without Pesach certification</p>
            </Link>
          </div>

          {/* Mobile disclaimer */}
          <p className="sm:hidden text-center text-xs text-primary-300 mt-6">
            Reference only — consult your rabbi for halachic guidance.
          </p>
        </section>
      )}
    </div>
  );
}
