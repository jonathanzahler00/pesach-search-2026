import Fuse from 'fuse.js';
import type { Item, SearchResult, ConflictGroup } from './types';
import itemsData from '@/data/items.json';

// Cast the imported JSON to our Item type
const items: Item[] = itemsData as Item[];

// Initialize Fuse.js with search configuration
const fuse = new Fuse(items, {
  keys: [
    { name: 'productName', weight: 0.7 },
    { name: 'category', weight: 0.2 },
    { name: 'notes', weight: 0.07 },
    { name: 'conditions', weight: 0.03 },
  ],
  threshold: 0.25,      // 0 = exact match, 1 = match anything — tighter for better precision
  distance: 80,
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 3,
  ignoreLocation: true,  // search anywhere in string
});

export function searchItems(query: string): SearchResult[] {
  if (!query || query.trim().length < 2) return [];
  
  const results = fuse.search(query.trim(), { limit: 50 });
  
  return results.map(r => ({
    item: r.item,
    score: r.score ?? 1,
    matchedFields: r.matches?.map(m => m.key ?? '') ?? [],
  }));
}

export function getAllItems(): Item[] {
  return items;
}

export function getItemsByCategory(category: string): Item[] {
  return items.filter(i => i.category === category);
}

export function getItemsByOrg(org: string): Item[] {
  return items.filter(i => i.org === org);
}

export function getCategories(): { name: string; count: number; orgs: string[] }[] {
  const catMap = new Map<string, { count: number; orgs: Set<string> }>();
  
  for (const item of items) {
    const existing = catMap.get(item.category);
    if (existing) {
      existing.count++;
      existing.orgs.add(item.org);
    } else {
      catMap.set(item.category, { count: 1, orgs: new Set([item.org]) });
    }
  }
  
  return Array.from(catMap.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      orgs: Array.from(data.orgs),
    }))
    .sort((a, b) => b.count - a.count);
}

export function getOrgs(): { code: string; count: number }[] {
  const orgMap = new Map<string, number>();
  for (const item of items) {
    orgMap.set(item.org, (orgMap.get(item.org) ?? 0) + 1);
  }
  return Array.from(orgMap.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);
}

// Find products listed by multiple orgs — highlight conflicts
export function findConflicts(): ConflictGroup[] {
  const productMap = new Map<string, Item[]>();
  
  for (const item of items) {
    const key = item.productName.toLowerCase();
    const existing = productMap.get(key);
    if (existing) {
      existing.push(item);
    } else {
      productMap.set(key, [item]);
    }
  }
  
  return Array.from(productMap.entries())
    .filter(([_, items]) => items.length > 1)
    .map(([name, groupItems]) => {
      const statuses = new Set(groupItems.map(i => i.status));
      return {
        productName: groupItems[0].productName,
        items: groupItems,
        hasConflict: statuses.size > 1,
      };
    })
    .filter(g => g.hasConflict)
    .sort((a, b) => a.productName.localeCompare(b.productName));
}

export function getTotalCount(): number {
  return items.length;
}
