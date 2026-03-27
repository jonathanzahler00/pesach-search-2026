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
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.bgColor} ${config.color} ${config.borderColor} border ${status === 'ask_rabbi' ? 'pulse-gentle' : ''}`}
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
    <div className="bg-white rounded-lg border border-primary-100 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-primary-900 text-base truncate">
            {item.productName}
          </h3>
          <p className="text-sm text-primary-500 mt-0.5">{item.category}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StatusBadge status={item.status} />
          <OrgBadge org={item.org as OrgCode} />
        </div>
      </div>

      {item.conditions && (
        <p className="mt-2 text-sm text-primary-600 bg-primary-50 rounded px-2 py-1">
          <span className="font-medium">Conditions:</span> {item.conditions}
        </p>
      )}

      {item.notes && (
        <p className="mt-1.5 text-xs text-primary-400 line-clamp-2">{item.notes}</p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <Link
          href={sourceUrl}
          className="text-xs text-gold-600 hover:text-gold-700 font-medium flex items-center gap-1"
        >
          📄 View in {item.sourceTitle}
          {item.pageNumber ? `, p.${item.pageNumber}` : ''}
        </Link>
        {item.isKitniyot && (
          <span className="text-xs text-yellow-600 font-medium">🫘 Kitniyot</span>
        )}
      </div>
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

    if (filterStatus !== 'all') {
      r = r.filter(res => res.item.status === filterStatus);
    }
    if (filterOrg !== 'all') {
      r = r.filter(res => res.item.org === filterOrg);
    }

    return r;
  }, [query, filterStatus, filterOrg]);

  return (
    <div>
      {/* Hero / Search */}
      <section className="text-center mb-8">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-900 mb-2">
          Is it Kosher for Pesach?
        </h2>
        <p className="text-primary-500 mb-6">
          Search {totalCount.toLocaleString()} products across {orgs.length} organizations
        </p>

        <div className="max-w-2xl mx-auto">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a product or brand... (e.g., Folgers, Dawn, Morton)"
            className="search-input w-full px-5 py-3.5 text-lg rounded-xl border-2 border-primary-200 bg-white placeholder:text-primary-300 focus:border-gold-400"
            autoFocus
          />

          {/* Filters */}
          <div className="flex items-center justify-center gap-3 mt-3 text-sm">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-primary-200 bg-white text-primary-700 text-sm"
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
              className="px-3 py-1.5 rounded-lg border border-primary-200 bg-white text-primary-700 text-sm"
            >
              <option value="all">All Organizations</option>
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
          <p className="text-sm text-primary-400 mb-3">
            {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
          </p>

          {results.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-primary-100">
              <p className="text-xl mb-2">🔍</p>
              <p className="text-primary-500">
                No results found for &ldquo;{query}&rdquo;
              </p>
              <p className="text-sm text-primary-400 mt-1">
                Try a different spelling, or check the{' '}
                <Link href="/documents" className="text-gold-600 underline">
                  source documents
                </Link>{' '}
                directly.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {results.map((r) => (
                <ProductCard key={r.item.id} result={r} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Quick Categories (when no search) */}
      {query.length < 2 && (
        <section>
          <h3 className="font-display text-xl font-semibold text-primary-800 mb-4">
            Browse by Category
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                href={`/categories?cat=${encodeURIComponent(cat.name)}`}
                className="bg-white rounded-lg border border-primary-100 p-3 hover:shadow-md hover:border-gold-300 transition-all"
              >
                <p className="font-medium text-primary-800 text-sm">{cat.name}</p>
                <p className="text-xs text-primary-400 mt-1">
                  {cat.count} item{cat.count !== 1 ? 's' : ''} · {cat.orgs.join(', ')}
                </p>
              </Link>
            ))}
          </div>

          {/* Quick Links */}
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            <Link
              href="/documents"
              className="bg-primary-900 text-white rounded-xl p-5 hover:bg-primary-800 transition-colors"
            >
              <p className="text-lg font-display font-semibold">📚 Source Documents</p>
              <p className="text-sm text-primary-300 mt-1">
                View each guide in full — OU, CRC, Star-K, COR
              </p>
            </Link>
            <Link
              href="/medicine"
              className="bg-orange-50 text-orange-900 rounded-xl p-5 border border-orange-200 hover:shadow-md transition-all"
            >
              <p className="text-lg font-display font-semibold">💊 Medicine Guide</p>
              <p className="text-sm text-orange-700 mt-1">
                Pesach guidelines for medications
              </p>
            </Link>
            <Link
              href="/categories?cat=Non-Food"
              className="bg-blue-50 text-blue-900 rounded-xl p-5 border border-blue-200 hover:shadow-md transition-all"
            >
              <p className="text-lg font-display font-semibold">🧴 Non-Food Items</p>
              <p className="text-sm text-blue-700 mt-1">
                Items usable without Pesach certification
              </p>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
