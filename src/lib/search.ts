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
  return items.filter(i => getNormalizedCategory(i) === category);
}

export function getItemsByOrg(org: string): Item[] {
  return items.filter(i => i.org === org);
}

export function getCategories(): { name: string; count: number; orgs: string[] }[] {
  const catMap = new Map<string, { count: number; orgs: Set<string> }>();
  
  for (const item of items) {
    const normalizedCategory = getNormalizedCategory(item);
    const existing = catMap.get(normalizedCategory);
    if (existing) {
      existing.count++;
      existing.orgs.add(item.org);
    } else {
      catMap.set(normalizedCategory, { count: 1, orgs: new Set([item.org]) });
    }
  }
  
  return Array.from(catMap.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      orgs: Array.from(data.orgs),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
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

export function getNormalizedCategory(item: Item): string {
  const raw = item.category.toLowerCase();
  const name = item.productName.toLowerCase();
  const text = `${raw} ${name} ${item.notes ?? ''} ${item.conditions ?? ''}`.toLowerCase();

  if (
    raw.includes('oral hygiene') ||
    raw.includes('personal & oral hygiene') ||
    /\b(mouthwash|toothpaste|toothpicks?|dental|dentures|floss|lipstick|lip balm|lip gloss|lip products?|gum|wax for braces|braces)\b/.test(text)
  ) {
    return 'Oral Care';
  }

  if (
    raw.includes('medicine') ||
    /\b(medicine|medicines|vitamins?|supplements?|pill|pills|antacid|chewable|laxative|suppositor|tums)\b/.test(text)
  ) {
    return 'Medicine';
  }

  if (raw.includes('kitniyot') || item.isKitniyot) {
    return 'Kitniyot';
  }

  if (item.isNonFood || raw.includes('non-food')) {
    return 'Non-Food';
  }

  if (
    raw.includes('health & beauty') ||
    raw.includes('health & hygiene') ||
    /\b(cosmetics?|makeup|mascara|deodorant|perfume|cologne|nail polish|nail polish remover|hair gel|hairspray|mousse|sunscreen|baby powder|baby wipes)\b/.test(text)
  ) {
    return 'Health & Beauty';
  }

  if (raw.includes('paper') || raw.includes('plastic') || /\b(foil|paper|plastic|bags?|cups?|plates?|napkins?|tissues|pans?)\b/.test(text)) {
    return 'Paper & Plastic';
  }

  if (raw.includes('beverage') || raw.includes('coffee') || raw.includes('tea') || raw.includes('water')) {
    return 'Beverages';
  }

  if (raw.includes('wine') || raw.includes('liquor') || /\b(wine|vodka|beer|rum|whiskey|brandy|liqueur)\b/.test(text)) {
    return 'Wines & Liquors';
  }

  if (raw.includes('oil')) return 'Oils';
  if (raw.includes('dairy')) return 'Dairy';
  if (raw.includes('fish')) return 'Fish';
  if (raw.includes('meat') || raw.includes('poultry')) return 'Meat & Poultry';
  if (raw.includes('fruit') || raw.includes('vegetable') || raw.includes('produce')) return 'Fruits & Vegetables';
  if (raw.includes('nuts')) return 'Nuts';
  if (raw.includes('spice') || raw.includes('seasoning') || raw === 'salt') return 'Spices & Seasonings';
  if (raw.includes('sugar') || raw.includes('sweetener')) return 'Sugar & Sweeteners';
  if (raw.includes('condiment') || /\b(ketchup|mustard|pickle|jam|jelly|vinegar|mayonnaise)\b/.test(text)) return 'Condiments';
  if (raw.includes('candy') || raw.includes('chocolate') || raw.includes('dessert') || raw.includes('snack')) return 'Candy & Chocolate';
  if (raw.includes('baking') || raw.includes('cooking') || raw.includes('matzah')) return 'Baking & Cooking';

  return item.category;
}
