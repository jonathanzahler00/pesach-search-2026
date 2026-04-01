#!/usr/bin/env node
/**
 * extract-data.ts
 *
 * Parses all Pesach PDF/image source files into a unified items.json
 *
 * USAGE:
 *   npx tsx scripts/extract-data.ts
 */

import fs from 'fs';
import path from 'path';

// ============================================================
// TYPES
// ============================================================

interface RawItem {
  id: string;
  productName: string;
  category: string;
  status: 'approved' | 'kitniyot' | 'ask_rabbi' | 'conditional' | 'not_approved';
  conditions: string | null;
  notes: string | null;
  org: 'OU' | 'CRC' | 'Star-K' | 'COR';
  sourceSlug: string;
  sourceTitle: string;
  pageNumber: number | null;
  isNonFood: boolean;
  isKitniyot: boolean;
  askRabbi: boolean;
}

// ============================================================
// HELPERS
// ============================================================

function makeId(org: string, source: string, category: string, product: string): string {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${clean(org)}-${clean(source)}-${clean(category)}-${clean(product)}`.substring(0, 120);
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(?:^|\s|[-/()])\w/g, (c) => c.toUpperCase()).trim();
}

// Handle spaced-out brand names from PDF rendering, e.g. "D AW N" → "Dawn", "B R AV O" → "Bravo"
function normalizeBrandName(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  // If every "word" is 1-4 chars and they all merge into a simple word, merge them
  if (words.length >= 2 && words.every(w => w.length <= 4 && /^[A-Z]+$/.test(w))) {
    const merged = words.join('');
    // Only collapse if the merged form looks like a real word (not random letters)
    if (merged.length <= 20) {
      return titleCase(merged);
    }
  }
  return titleCase(name);
}

function isUpperCaseLine(line: string): boolean {
  const letters = line.replace(/[^A-Za-z]/g, '');
  if (letters.length < 2) return false;
  const lowerCount = (line.match(/[a-z]/g) || []).length;
  return lowerCount === 0;
}

// ============================================================
// OU YEAR-ROUND PARSER
// ============================================================
// Structure: Category headings (all-caps) → brand names (all-caps, one per line)
// Some brands have product detail lines below them (mixed-case)
// The PDF starts with an index section; actual products start at "62  www.oupassover.org"

function parseOUYearRound(text: string): RawItem[] {
  // Find where actual product listings start (after the index section)
  const listStart = text.indexOf('62  www.oupassover.org');
  if (listStart === -1) return [];

  const listText = text.substring(listStart);
  const rawLines = listText.split('\n').map(l => l.trim());

  // Known category prefixes with their display name, conditions, and page number
  const CATEGORIES: Array<{ prefix: string; name: string; conditions: string | null; page: number }> = [
    { prefix: 'AVOCADO OIL', name: 'Avocado Oil', conditions: null, page: 62 },
    { prefix: 'BAKING SODA', name: 'Baking Soda', conditions: null, page: 62 },
    { prefix: 'BEVERAGES', name: 'Beverages', conditions: null, page: 62 },
    { prefix: 'CLEANERS &', name: 'Cleaners & Detergents', conditions: null, page: 62 },
    { prefix: 'COCOA POWDER', name: 'Cocoa Powder', conditions: null, page: 62 },
    { prefix: 'COCONUT OIL', name: 'Coconut Oil', conditions: 'Virgin Only', page: 62 },
    { prefix: 'COFFEE GROUND', name: 'Coffee (Ground/Whole Bean)', conditions: 'Unflavored, Not Decaffeinated', page: 62 },
    { prefix: 'COFFEE DECAF', name: 'Coffee (Decaffeinated)', conditions: 'Unflavored, Decaffeinated', page: 63 },
    { prefix: 'COFFEE INSTANT', name: 'Coffee (Instant)', conditions: null, page: 63 },
    { prefix: 'COFFEE K-CUP', name: 'Coffee (K-Cups/Single Serve)', conditions: 'Unflavored, Not Decaffeinated', page: 63 },
    { prefix: 'COFFEE VUE', name: 'Coffee (Vue Cups)', conditions: 'Unflavored', page: 63 },
    { prefix: 'COFFEE BOLT', name: 'Coffee (Bolt Packs)', conditions: 'Unflavored', page: 63 },
    { prefix: 'DISH DETERGENT', name: 'Dish Detergent', conditions: null, page: 63 },
    { prefix: 'EGG PRODUCTS', name: 'Egg Products', conditions: null, page: 63 },
    { prefix: 'FISH', name: 'Fish (Raw)', conditions: 'Pure frozen, not spiced/seasoned/smoked', page: 64 },
    { prefix: 'FRUITS', name: 'Fruits & Vegetables (Raw)', conditions: null, page: 64 },
    { prefix: 'JUICES', name: 'Juices & Juice Concentrates', conditions: 'Unsweetened', page: 64 },
    { prefix: 'MEAT & POULTRY', name: 'Meat & Poultry', conditions: 'In original manufacturer packaging', page: 64 },
    { prefix: 'NUTS', name: 'Nuts (Raw)', conditions: 'Whole, Pieces and Nut Meal; no added ingredients', page: 65 },
    { prefix: 'PECANS', name: 'Nuts - Pecans (Raw)', conditions: 'Whole & Halves only; no added ingredients', page: 66 },
    { prefix: 'OLIVE OIL', name: 'Olive Oil', conditions: 'Extra Virgin Only', page: 66 },
    { prefix: 'PAPER,', name: 'Paper, Plastic, Wraps, Foil & Candles', conditions: null, page: 69 },
    { prefix: 'PERSONAL', name: 'Personal & Oral Hygiene', conditions: null, page: 70 },
    { prefix: 'RAISINS', name: 'Raisins', conditions: 'Not Oil Treated Only', page: 70 },
    { prefix: 'SALT', name: 'Salt', conditions: 'Non-Iodized Only', page: 70 },
    { prefix: 'SUGAR', name: 'Sugar', conditions: null, page: 71 },
    { prefix: 'TEA BAGS', name: 'Tea Bags', conditions: 'Unflavored, Not Decaffeinated & Not Herbal', page: 71 },
    { prefix: 'WATER', name: 'Water', conditions: null, page: 71 },
  ];

  // Lines that are always noise
  const SKIP_PATTERNS = [
    /^\d+\s+www\.oupassover\.org/,
    /^www\.oupassover\.org/,
    /^OU\s+GUIDE TO PESACH/,
    /^\d+$/,
    /^CERTIFIED PRODUCTS/,
    /^Items listed in this section/,
    /^year-round use/,
    /^even without/,
    /^kosher-for-passover/i,
    /^WHEN YOU BECOME/,
    /^Move Our Story/,
    /^JOIN TODAY/,
    /^OU\.ORG/,
    /^Members gain/,
    /^Annual Jewish/,
    /^OU Passover Guide/,
    /^Exclusive member/,
    /^Swag/,
    /^PASSOVER APPROVED PRODUCTS/,
    /^PASSOVER CERTIFIED/,
    /^PESACH CONSUMER GUIDE/,
    /^• /,  // Bullet points (condition sub-items)
  ];

  // Condition/continuation lines that appear after a category heading (not brand names)
  const CONDITION_LINE_PATTERNS = [
    /^Virgin [Oo]nly/,
    /^Not [Oo]il [Tt]reated/,
    /^Non-[Ii]odized/,
    /^[Uu]nflavored/,
    /^[Nn]ot [Dd]ecaffeinated/,
    /^[Dd]ecaffeinated/,
    /^Brown •/,
    /^White [Gg]ranulated/,
    /^Raw:/,
    /^Whole &/,
    /^[Nn]o added/,
    /^Extra [Vv]irgin/,
    /^In [Oo]riginal/,
    /^[Uu]nsweetened/,
    /^& WHOLE BEAN/,
    /^& WHOLE/,
    /^BEAN$/,
    /^DETERGENTS$/,
    /^VEGETABLE RAW/,
    /^AND$/,
    /^CONCENTRATE/,
    /^CONCENTRATE$/,
    /^WRAPS,/,
    /^FOIL &/,
    /^CANDLES$/,
    /^WRAPS$/,
    /^FOIL$/,
    /^PLASTIC,/,
    /^HYGIENE$/,
    /^RAW$/,
    /^WHOLE BEAN/,
    /^GAS FILLING/i,
    /^Carbon Dioxide/,
    /^Not Decaffeinated/,
  ];

  const items: RawItem[] = [];
  let currentCategory = '';
  let currentConditions: string | null = null;
  let currentPage = 62;
  let currentBrand = '';
  let productDetails: string[] = [];

  function flushBrand() {
    if (!currentBrand || !currentCategory) return;
    const brandName = normalizeBrandName(currentBrand);
    if (brandName.length < 2) return;

    const notes = productDetails.length > 0
      ? productDetails.join(', ')
      : 'Year-round certified, no special Pesach certification needed';

    items.push({
      id: makeId('OU', 'yearround', currentCategory, brandName),
      productName: brandName,
      category: currentCategory,
      status: 'approved',
      conditions: currentConditions,
      notes,
      org: 'OU',
      sourceSlug: 'ou-yearround',
      sourceTitle: 'OU Year-Round Products',
      pageNumber: currentPage,
      isNonFood: currentCategory.toLowerCase().includes('cleaner') ||
                  currentCategory.toLowerCase().includes('detergent') ||
                  currentCategory.toLowerCase().includes('hygiene') ||
                  currentCategory.toLowerCase().includes('paper') ||
                  currentCategory.toLowerCase().includes('candle'),
      isKitniyot: false,
      askRabbi: false,
    });

    productDetails = [];
  }

  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (SKIP_PATTERNS.some(p => p.test(line))) continue;
    if (CONDITION_LINE_PATTERNS.some(p => p.test(line))) continue;

    // Check for category heading
    let foundCategory = false;
    for (const cat of CATEGORIES) {
      if (line.startsWith(cat.prefix)) {
        flushBrand();
        currentBrand = '';
        currentCategory = cat.name;
        currentConditions = cat.conditions;
        currentPage = cat.page;
        foundCategory = true;
        break;
      }
    }
    if (foundCategory) continue;
    if (!currentCategory) continue;

    // All-caps lines are brand names; mixed-case lines are product details
    if (isUpperCaseLine(line) && line.length >= 2 && line.length <= 80) {
      flushBrand();
      currentBrand = line;
    } else if (currentBrand && !isUpperCaseLine(line) && line.length > 1) {
      // Mixed-case product detail line under the current brand
      productDetails.push(line);
    }
  }

  flushBrand();
  return items;
}

// ============================================================
// OU NON-FOOD PARSER (original — unchanged)
// ============================================================

function parseOUNonFood(_text: string): RawItem[] {
  const items: RawItem[] = [];

  const nonFoodItems = [
    'Aluminum Foil', 'Aluminum Foil Baking Pans', 'Baby Ointments',
    'Bags (Paper or Plastic)', 'Body Wash', 'Bowl and Tub Cleaners',
    'Candles', 'Cardboard', 'Carpet Cleaners', 'Charcoal', 'Cheese Cloths',
    'Conditioners', 'Copper and Metal Cleaners', 'Cork',
    'Cosmetics (Except Possibly Lipsticks)', 'Cupcake Holders',
    'Cups (Paper, Plastic or Styrofoam)', 'Deodorants', 'Detergents',
    'Dishwashing Detergents', 'Drain Openers', 'Fabric Protectors',
    'Furniture Polish', 'Glass Cleaners', 'Hair Gels, Sprays and Mousse',
    'Hair Removers and Treatments', 'Hand Sanitizer', 'Insecticides',
    'Isopropyl Alcohol', 'Jewelry Polish', 'Laundry Detergents', 'Lotions',
    'Napkins (Paper)', 'Oven Cleaners', 'Paper Towels', 'Perfumes',
    'Plastic Containers', 'Plates (Paper, Plastic or Styrofoam)',
    'Scouring Pads and Powders', 'Shampoos', 'Shaving Cream and Gel',
    'Shaving Lotion', 'Silver Polish', 'Skin Cream', 'Soaps',
    'Suntan Lotion', 'Talcum Powder (100% Talc)', 'Toilet Bowl Cleaner',
    'Water Filters',
  ];

  for (const item of nonFoodItems) {
    items.push({
      id: makeId('OU', 'nonfood', 'non-food', item),
      productName: item,
      category: 'Non-Food',
      status: 'approved',
      conditions: null,
      notes: 'May be used on Passover without certification (consensus of OU poskim)',
      org: 'OU',
      sourceSlug: 'ou-nonfood',
      sourceTitle: 'OU Non-Food Items',
      pageNumber: 105,
      isNonFood: true,
      isKitniyot: false,
      askRabbi: false,
    });
  }

  items.push({
    id: makeId('OU', 'nonfood', 'oral-hygiene', 'toothpaste'),
    productName: 'Toothpaste',
    category: 'Oral Hygiene',
    status: 'ask_rabbi',
    conditions: null,
    notes: 'Rabbinical authorities disagree as to whether kosher certification is required for Passover and year-round. Consult your Rabbi.',
    org: 'OU',
    sourceSlug: 'ou-nonfood',
    sourceTitle: 'OU Non-Food Items',
    pageNumber: 105,
    isNonFood: false,
    isKitniyot: false,
    askRabbi: true,
  });

  items.push({
    id: makeId('OU', 'nonfood', 'oral-hygiene', 'mouthwash'),
    productName: 'Mouthwash',
    category: 'Oral Hygiene',
    status: 'ask_rabbi',
    conditions: null,
    notes: 'Rabbinical authorities disagree as to whether kosher certification is required for Passover and year-round. Consult your Rabbi.',
    org: 'OU',
    sourceSlug: 'ou-nonfood',
    sourceTitle: 'OU Non-Food Items',
    pageNumber: 105,
    isNonFood: false,
    isKitniyot: false,
    askRabbi: true,
  });

  items.push({
    id: makeId('OU', 'nonfood', 'oral-hygiene', 'lipstick'),
    productName: 'Lipstick / Lip Balm',
    category: 'Oral Hygiene',
    status: 'ask_rabbi',
    conditions: 'Flavored lip treatment',
    notes: 'Rabbinical authorities disagree as to whether kosher certification is required for Passover and year-round. Consult your Rabbi.',
    org: 'OU',
    sourceSlug: 'ou-nonfood',
    sourceTitle: 'OU Non-Food Items',
    pageNumber: 105,
    isNonFood: false,
    isKitniyot: false,
    askRabbi: true,
  });

  items.push({
    id: makeId('OU', 'nonfood', 'medicine', 'guidelines'),
    productName: 'Medicine (General Guidelines)',
    category: 'Medicine',
    status: 'conditional',
    conditions: 'See detailed guidelines',
    notes: 'Non-chewable pills, creams, and injections may be used even if they contain chametz/kitniyot. Liquid medicines, chewable pills, and flavored coated pills may contain chametz — consult your rabbi. If substitution is not possible and there is danger (sakana), medication may be taken.',
    org: 'OU',
    sourceSlug: 'ou-nonfood',
    sourceTitle: 'OU Non-Food Items',
    pageNumber: 105,
    isNonFood: false,
    isKitniyot: false,
    askRabbi: true,
  });

  return items;
}

// ============================================================
// OU SPECIFICS PARSER — All Pesach-certified products
// ============================================================

function parseOUSpecifics(text: string): RawItem[] {
  // The product listings start at the "74  www.oupassover.org" marker
  const listStart = text.indexOf('74  www.oupassover.org');
  if (listStart === -1) {
    console.log('  ⚠️  Could not find product listing start marker in OU-specifics');
    return [];
  }
  const listText = text.substring(listStart);
  const rawLines = listText.split('\n').map(l => l.trim());

  // Known categories in the OU specifics guide
  const KNOWN_CATEGORIES = new Set([
    'AVOCADO OIL', 'BABY FOOD', 'BAKED GOODS', 'BAKING SODA', 'BEVERAGES',
    'BREAKFAST FOODS', 'CANDLES', 'CANDY & CHOCOLATE', 'CLEANING PRODUCTS',
    'CONDIMENTS', 'COOKING & BAKING', 'DAIRY (CHALAV YISRAEL)',
    'DAIRY (NON-CHALAV YISRAEL)', 'EGG PRODUCTS', 'FISH PRODUCTS',
    'FROZEN FOODS', 'FRUITS & VEGETABLES', 'GRAPE JUICE', 'HEALTH & HYGIENE',
    'ICE CREAM & FROZEN NOVELTIES', 'JAMS & JELLIES', 'MATZAH PRODUCTS',
    'MEAT & POULTRY', 'PAPER, PLASTIC, WRAPS, & FOIL', 'PREPARED FOODS',
    'SALT', 'SNACKS & DESSERTS', 'SOAP & DETERGENTS', 'SPICES & SEASONINGS',
    'SUGAR', 'SWEETENERS', 'WATER', 'WINES & LIQUORS',
  ]);

  const SKIP_PATTERNS = [
    /^\d+\s+www\.oupassover\.org/,
    /^www\.oupassover\.org/,
    /^OU\s+GUIDE TO PESACH/,
    /^Items listed in this section/,
    /^and kosher certified for P/,
    /^only when bearing an/,
    /^PRODUCTS BEARING AN/,
    /^PASSOVER CERTIFIED PRODUCTS$/,
    /^PESACH CONSUMER GUIDE INDEX$/,
    /^OU KITNIYOT PRODUCTS/,
    /^OU MATZAH ASHIRA PRODUCTS/,
    /^INFANT FORMULA/,
    /^NON-FOOD ITEMS/,
    /^GUIDELINES FOR MEDICINE/,
    /^PASSOVER APPROVED PRODUCTS/,
    /^or an\s/i,
    /^kosher-for-Passover\.?$/i,
    /^\d+$/,
    /^•\s/,
  ];

  const items: RawItem[] = [];
  let currentCategory = '';
  let currentBrand = '';
  let productLines: string[] = [];

  function flushBrand() {
    if (!currentBrand || productLines.length === 0 || !currentCategory) {
      productLines = [];
      return;
    }

    // Merge continuation lines (lines that don't start with caps product-type indicator)
    const merged: string[] = [];
    for (const line of productLines) {
      const isProductTypeLine = /^[A-Z][A-Z\s&\-\/()]+:/.test(line);
      const isNewProduct = isProductTypeLine || (merged.length === 0);
      if (isNewProduct) {
        merged.push(line);
      } else {
        // Continuation — append to last
        if (merged.length > 0) {
          merged[merged.length - 1] += ', ' + line;
        } else {
          merged.push(line);
        }
      }
    }

    for (const productLine of merged) {
      const colonIdx = productLine.indexOf(':');
      let productName: string;
      let notes: string | null = null;

      if (colonIdx > 0 && /^[A-Z]/.test(productLine)) {
        const productType = titleCase(productLine.substring(0, colonIdx).trim());
        const variants = productLine.substring(colonIdx + 1).trim();
        productName = `${titleCase(currentBrand)} ${productType}`;
        notes = variants || null;
      } else {
        // Plain product line — just attach to brand
        productName = `${titleCase(currentBrand)} - ${titleCase(productLine)}`;
        notes = null;
      }

      if (productName.length > 2 && productName.length < 150) {
        items.push({
          id: makeId('OU', 'specifics', currentCategory, productName),
          productName,
          category: currentCategory,
          status: 'approved',
          conditions: 'Must bear OU-P (Kosher for Passover certification)',
          notes,
          org: 'OU',
          sourceSlug: 'ou-specifics',
          sourceTitle: 'OU Passover Certified Products',
          pageNumber: null,
          isNonFood: false,
          isKitniyot: false,
          askRabbi: false,
        });
      }
    }

    productLines = [];
  }

  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (SKIP_PATTERNS.some(p => p.test(line))) continue;

    const upperLine = line.toUpperCase();

    // Check for known category
    if (KNOWN_CATEGORIES.has(upperLine)) {
      flushBrand();
      currentCategory = titleCase(line);
      currentBrand = '';
      continue;
    }

    // Check for partial category match (handles "DAIRY (Chalav Yisrael)" etc.)
    let matchedCategory = '';
    for (const cat of KNOWN_CATEGORIES) {
      if (upperLine.startsWith(cat) || cat.startsWith(upperLine)) {
        matchedCategory = cat;
        break;
      }
    }
    if (matchedCategory) {
      flushBrand();
      currentCategory = titleCase(matchedCategory);
      currentBrand = '';
      continue;
    }

    // Skip if no category set yet
    if (!currentCategory) continue;

    // Check if this is a brand name (all uppercase, no lowercase letters, reasonable length)
    if (isUpperCaseLine(line) && line.length < 60 && !line.includes(':')) {
      flushBrand();
      currentBrand = line;
      continue;
    }

    // It's a product line for the current brand
    if (currentBrand && line.length > 1) {
      productLines.push(line);
    }
  }

  flushBrand();
  return items;
}

// ============================================================
// OU KITNIYOS PARSER
// ============================================================

function parseOUKitniyos(text: string): RawItem[] {
  const items: RawItem[] = [];

  const SKIP_PATTERNS = [
    /^OU\s+GUIDE TO PESACH/,
    /^Items listed in this section/,
    /^bearing an/,
    /^kitniyot - products are recommended/,
    /^those of ashkenazic/,
    /^those of sephardic/,
    /^small children and the infirm/,
    /^PRODUCTS BEARING AN/,
    /^Matzah Ashira-/,
    /^OU KITNIYOT PRODUCTS/,
    /^OU MATZAH ASHIRA PRODUCTS/,
    /^\d+$/,
    /^www\.oupassover\.org/,
  ];

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let inKitniyot = false;
  let inMatzahAshira = false;
  let currentBrand = '';
  let productLines: string[] = [];

  function flushBrand(isKitniyot: boolean) {
    if (!currentBrand || productLines.length === 0) {
      productLines = [];
      return;
    }

    // Merge all product lines
    const allProducts = productLines.join(', ');

    // Split by lines that start with a category tag (like "SEASONING MIXES: ...")
    const merged: string[] = [];
    for (const line of productLines) {
      const isTypeLine = /^[A-Z][A-Z\s&\-\/]+:/.test(line);
      if (isTypeLine) {
        merged.push(line);
      } else if (merged.length > 0) {
        merged[merged.length - 1] += ', ' + line;
      } else {
        merged.push(line);
      }
    }

    for (const productLine of merged) {
      const colonIdx = productLine.indexOf(':');
      let productName: string;
      let notes: string | null = null;

      if (colonIdx > 0 && /^[A-Z]/.test(productLine)) {
        const productType = titleCase(productLine.substring(0, colonIdx).trim());
        const variants = productLine.substring(colonIdx + 1).trim();
        productName = `${titleCase(currentBrand)} ${productType}`;
        notes = variants || null;
      } else {
        productName = `${titleCase(currentBrand)} - ${titleCase(productLine)}`;
      }

      if (productName.length > 2 && productName.length < 150) {
        const category = inMatzahAshira ? 'Matzah Ashira' : 'Kitniyot Products';
        items.push({
          id: makeId('OU', isKitniyot ? 'kitniyos' : 'matzah-ashira', category, productName),
          productName,
          category,
          status: 'kitniyot',
          conditions: isKitniyot
            ? 'For Sephardim; not for Ashkenazim (except small children and the infirm)'
            : 'Egg matza — for Sephardim and those who are ill; not for healthy Ashkenazim',
          notes,
          org: 'OU',
          sourceSlug: 'ou-kitniyos',
          sourceTitle: 'OU Kitniyot Products',
          pageNumber: 103,
          isNonFood: false,
          isKitniyot: true,
          askRabbi: false,
        });
      }
    }

    productLines = [];
  }

  for (const line of lines) {
    if (SKIP_PATTERNS.some(p => p.test(line))) continue;

    if (line.includes('OU KITNIYOT PRODUCTS') || line.includes('KITNIYOT')) {
      if (line.startsWith('OU KITNIYOT') || line.startsWith('PRODUCTS BEARING AN')) {
        flushBrand(true);
        inKitniyot = true;
        inMatzahAshira = false;
        currentBrand = '';
        continue;
      }
    }

    if (line.includes('MATZAH ASHIRA')) {
      flushBrand(false);
      inKitniyot = false;
      inMatzahAshira = true;
      currentBrand = '';
      continue;
    }

    if (!inKitniyot && !inMatzahAshira) continue;

    // Brand name detection
    if (isUpperCaseLine(line) && line.length < 60 && !line.includes(':')) {
      flushBrand(inKitniyot);
      currentBrand = line;
      continue;
    }

    if (currentBrand && line.length > 1) {
      productLines.push(line);
    }
  }

  flushBrand(inKitniyot);
  return items;
}

// ============================================================
// CRC PARSER — Chicago Rabbinical Council shopping guide
// ============================================================

function parseCRC(text: string): RawItem[] {
  const items: RawItem[] = [];

  // Find the shopping guide section
  const guideStart = text.indexOf('Acceptable without Pesach');
  if (guideStart === -1) {
    console.log('  ⚠️  Could not find CRC shopping guide section');
    return [];
  }

  // The shopping guide ends when the FAQ/Kashering section begins
  // Try multiple end markers
  const endMarkers = [
    'KASHERING THE KITCHEN',
    'FAQ\n',
    'Kashering the Kitchen\n',
    'PESACH FAQS',
    'Kashering\nthe Kitchen',
  ];
  let guideEnd = text.length;
  for (const marker of endMarkers) {
    const idx = text.indexOf(marker, guideStart + 5000); // At least 5000 chars into the guide
    if (idx > guideStart && idx < guideEnd) {
      guideEnd = idx;
    }
  }

  const guideText = text.substring(guideStart, guideEnd);
  const lines = guideText.split('\n').map(l => l.trim());

  const SKIP_PATTERNS = [
    /^= (Not acceptable|Acceptable|Must bear)/,
    /^PRODUCTNOTES$/,
    /^PRODUCT\s*NOTES$/,
    /^SHOPPING GUIDE/i,
    /^SHoPPING GuIDE/i,
    /^cRc Pesach Guide/,
    /^www\.(crckosher|ASKcRc)\.org/,
    /^\d+$/,
    /^RECOMMENDATIONS ARE FOR/,
    /^Acceptable without Pesach/,
    /^Food items in this section/,
    /^should preferably be purchased/,
    /^before Pesach$/,
    /^Must bear reliable/,
    /^Pesach Certification$/,
    /^Not acceptable$/,
    /^for Pesach$/,
    /^Sephardim should contact/,
    /^local Sephardic rabbi/,
    /^issues of kitniyos/,
    /^A publication of/,
    /^2701 W Howard/,
    /^crckosher\.org/,
    /^© The Chicago/,
    /^The cRc would like/,
    /^The cRc Pesach Guide/,
    /^Biranit Tova/,
    /^our dedicated/,
    /^tremendous effort/,
    /^community/,
    /^Kashering the Kitchen/,
    /^Can It Be Kashered/,
    /^Certification$/,
    /^Pesach$/,
    /^\s*=\s*/,
    /^Acceptable$/,
    /^RECOMMENDATIONS/,
    /^without Pesach Certification/,
    /^without Pesach$/,
    /^Kosher$/,
    /^Kosher for Pesach$/,
  ];

  function isStatusSymbol(line: string): line is '' | '' | '' {
    return line === '' || line === '' || line === '';
  }

  function escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function inferStatus(
    productName: string,
    notes: string,
    symbol: '' | '' | '' | null,
  ): RawItem['status'] {
    const lowerNotes = notes.toLowerCase();
    const lowerName = productName.toLowerCase();

    if (lowerNotes.includes('kitniyos') || lowerNotes.includes('same status as kitniyos')) return 'kitniyot';
    if (lowerNotes.includes('ask your rabbi') || lowerNotes.includes('consult your rabbi')) return 'ask_rabbi';
    if (lowerNotes.includes('see page 14') || lowerNotes.includes('see pages 14') ||
        lowerNotes.includes('see page 19') || lowerNotes.includes('see pages 19') ||
        lowerNotes.includes('see page 24') || lowerNotes.includes('see pages 24')) return 'ask_rabbi';
    if (lowerNotes.includes('see page') || lowerNotes.includes('see pages') ||
        lowerNotes.includes('see bit.ly') || lowerNotes.includes('see www')) return 'conditional';

    if (symbol === '') return 'not_approved';
    if (symbol === '') return 'conditional';

    if (lowerNotes.includes('chametz')) return 'not_approved';
    if (lowerNotes.includes('not acceptable')) return 'not_approved';
    if (lowerNotes.includes('requires pesach certification') ||
        lowerNotes.includes('requires certification') ||
        lowerNotes.includes('require pesach') ||
        lowerNotes.includes('must bear')) return 'conditional';
    if (lowerNotes.includes('requires') && lowerNotes.includes('certif')) return 'conditional';
    if (lowerNotes.includes('acceptable if') || lowerNotes.includes('if certified') ||
        lowerNotes.includes('when certified') || lowerNotes.includes('when produced in the usa')) return 'conditional';

    // Known kitniyot items by name
    const kitniyotItems = ['beans', 'corn', 'rice', 'legumes', 'peas', 'lentils', 'edamame',
      'chickpeas', 'sesame', 'sunflower', 'mustard', 'buckwheat', 'millet', 'kasha',
      'soy', 'popcorn', 'poppy', 'snow peas', 'string beans', 'green beans', 'tofu',
      'sorghum', 'anise', 'caraway', 'cumin', 'coriander', 'fennel', 'alfalfa'];
    if (kitniyotItems.some(k => lowerName.includes(k))) return 'kitniyot';

    return 'approved';
  }

  function looksLikeProductStart(lines: string[], idx: number): boolean {
    const line = lines[idx];
    if (!line || isStatusSymbol(line) || /^[a-z]/.test(line)) return false;
    if (/^(For|When|If|Only|Includes|Same|See|Acceptable|Requires|Must|Kitniyos|Chametz|Recommended|Cleaned|Contains|Concentrate|Canned|Raw|Dried|Fresh|Cooked)\b/.test(line)) {
      return false;
    }

    const next = lines[idx + 1] ?? '';
    const next2 = lines[idx + 2] ?? '';
    const firstWord = line.split(/\s+/)[0];

    if (isStatusSymbol(next)) return true;
    if (/^See page/i.test(next)) return true;
    if (/^(Acceptable|Requires|Must|When|If|Only|Includes|Kitniyos|Chametz|Recommended)\b/.test(next)) return true;
    if (firstWord && new RegExp(`^${escapeRegex(firstWord)}\\b`, 'i').test(next)) return true;
    if (/^[a-z]/.test(next) && isStatusSymbol(next2)) return true;

    return false;
  }

  const filteredLines: string[] = [];

  for (const line of lines) {
    if (!line) continue;
    if (SKIP_PATTERNS.some(p => p.test(line))) continue;
    filteredLines.push(line);
  }

  let idx = 0;
  while (idx < filteredLines.length) {
    if (!looksLikeProductStart(filteredLines, idx)) {
      idx++;
      continue;
    }

    const productParts = [filteredLines[idx]];
    let cursor = idx + 1;

    // Some product names wrap onto the next line before the symbol, e.g.:
    // "Denatured or Isopropyl" + "alcohol" + ""
    if (/^[a-z]/.test(filteredLines[cursor] ?? '') && isStatusSymbol(filteredLines[cursor + 1] ?? '')) {
      productParts.push(filteredLines[cursor]);
      cursor++;
    }

    const productName = productParts.join(' ').replace(/\s+/g, ' ').trim();
    let symbol: '' | '' | '' | null = null;
    if (isStatusSymbol(filteredLines[cursor] ?? '')) {
      symbol = filteredLines[cursor] as '' | '' | '';
      cursor++;
    }

    let notesLines: string[] = [];

    while (cursor < filteredLines.length && !looksLikeProductStart(filteredLines, cursor)) {
      const next = filteredLines[cursor];
      if (!next || isStatusSymbol(next)) {
        cursor++;
        continue;
      }
      notesLines.push(next);
      cursor++;
    }

    const notes = notesLines.join(' ').replace(/\s+/g, ' ').trim();
    const status = inferStatus(productName, notes, symbol);

    // Skip items that are page references or clearly not products
    const shouldSkip =
      productName.length < 2 ||
      productName.length > 80 ||
      /^\d/.test(productName) ||
      /^(Contents|Table of|The Essential|Pesach Guide|cRc Kosher|Rabbi|Informational|Largest|Kosher|CONTENTS|Serving)/.test(productName) ||
      / (is|are|can|does|not|the|but|and|may|that|this|have|has|also|when|if|for|with|to|of) /.test(productName) ||
      productName.endsWith(' but') ||
      productName.endsWith(' the') ||
      productName.endsWith(' of');

    if (shouldSkip) {
      idx = cursor;
      continue;
    }

    items.push({
      id: makeId('CRC', 'shopping-guide', 'general', productName),
      productName: productName.replace(/\s+/g, ' ').trim(),
      category: getCRCCategory(productName),
      status,
      conditions: notes || null,
      notes: notes || null,
      org: 'CRC',
      sourceSlug: 'crc',
      sourceTitle: 'CRC Passover Guide',
      pageNumber: null,
      isNonFood: isCRCNonFood(productName),
      isKitniyot: status === 'kitniyot',
      askRabbi: status === 'ask_rabbi',
    });

    idx = cursor;
  }

  const cleaned: RawItem[] = [];
  const seen = new Set<string>();

  function pushUnique(item: RawItem) {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    cleaned.push(item);
  }

  for (const item of items) {
    // Drop parser fragments that came from note continuations rather than real products.
    if (item.productName === '(e.g., Purell)') continue;
    if (item.productName === 'Shoes, or Silver)') continue;
    if (item.productName === 'Seeds, same status as kitniyos') continue;

    if (item.productName === 'Candy' && item.conditions === 'Canned Fruits or') {
      pushUnique({
        ...item,
        conditions: null,
        notes: null,
      });
      pushUnique({
        id: makeId('CRC', 'shopping-guide', 'general', 'Canned Fruits or Vegetables'),
        productName: 'Canned Fruits or Vegetables',
        category: getCRCCategory('Canned Fruits or Vegetables'),
        status: 'conditional',
        conditions: null,
        notes: null,
        org: 'CRC',
        sourceSlug: 'crc',
        sourceTitle: 'CRC Passover Guide',
        pageNumber: null,
        isNonFood: false,
        isKitniyot: false,
        askRabbi: false,
      });
      continue;
    }

    if (item.productName === 'Lip Products' && item.conditions === 'See pages 18. See') {
      pushUnique({
        ...item,
        conditions: 'See pages 18. See www.ASKcRc.org for updates',
        notes: 'See pages 18. See www.ASKcRc.org for updates',
      });
      continue;
    }

    if (item.productName === 'Hairspray' && item.conditions === 'When produced in the USA Hand Sanitizers') {
      pushUnique({
        ...item,
        conditions: 'When produced in the USA',
        notes: 'When produced in the USA',
      });
      pushUnique({
        id: makeId('CRC', 'shopping-guide', 'general', 'Hand Sanitizers (e.g., Purell)'),
        productName: 'Hand Sanitizers (e.g., Purell)',
        category: getCRCCategory('Hand Sanitizers'),
        status: 'approved',
        conditions: null,
        notes: null,
        org: 'CRC',
        sourceSlug: 'crc',
        sourceTitle: 'CRC Passover Guide',
        pageNumber: null,
        isNonFood: true,
        isKitniyot: false,
        askRabbi: false,
      });
      continue;
    }

    if (item.productName === 'Play-Doh' && item.conditions === 'May contain chametz Polish (For Furniture,') {
      pushUnique({
        ...item,
        conditions: 'May contain chametz',
        notes: 'May contain chametz',
      });
      pushUnique({
        id: makeId('CRC', 'shopping-guide', 'general', 'Polish (For Furniture, Shoes, or Silver)'),
        productName: 'Polish (For Furniture, Shoes, or Silver)',
        category: getCRCCategory('Polish'),
        status: 'approved',
        conditions: null,
        notes: null,
        org: 'CRC',
        sourceSlug: 'crc',
        sourceTitle: 'CRC Passover Guide',
        pageNumber: null,
        isNonFood: true,
        isKitniyot: false,
        askRabbi: false,
      });
      continue;
    }

    if (item.productName === 'Sanitizers (E.g. Purell)') {
      pushUnique({
        ...item,
        id: makeId('CRC', 'shopping-guide', 'general', 'Hand Sanitizers (e.g., Purell)'),
        productName: 'Hand Sanitizers (e.g., Purell)',
        category: 'Health & Beauty',
        isNonFood: true,
      });
      continue;
    }

    if (item.productName === 'Tums' && item.conditions === 'Chewable antacids require Pesach certification, and this brand is not certified for') {
      pushUnique({
        ...item,
        conditions: 'Chewable antacids require Pesach certification, and this brand is not certified for Pesach',
        notes: 'Chewable antacids require Pesach certification, and this brand is not certified for Pesach',
      });
      continue;
    }

    if (item.productName === 'Salads (Bagged)') {
      pushUnique({
        ...item,
        status: 'conditional',
        conditions: 'If certified is unavailable and contains no kitniyos or sensitive additives; buy before Pesach',
        notes: 'If certified is unavailable and contains no kitniyos or sensitive additives; buy before Pesach',
        isKitniyot: false,
      });
      continue;
    }

    if (item.productName === '(bagged)') continue;

    if (item.productName === 'Salmon' && item.conditions === 'Fresh Canned, frozen or processed') {
      pushUnique({
        ...item,
        conditions: 'Fresh',
        notes: 'Fresh',
      });
      pushUnique({
        id: makeId('CRC', 'shopping-guide', 'general', 'Salmon (Canned, Frozen, or Processed)'),
        productName: 'Salmon (Canned, Frozen, or Processed)',
        category: getCRCCategory('Salmon'),
        status: 'conditional',
        conditions: null,
        notes: null,
        org: 'CRC',
        sourceSlug: 'crc',
        sourceTitle: 'CRC Passover Guide',
        pageNumber: null,
        isNonFood: false,
        isKitniyot: false,
        askRabbi: false,
      });
      continue;
    }

    pushUnique(item);
  }

  return cleaned;
}

function getCRCCategory(product: string): string {
  const lower = product.toLowerCase();
  if (lower.includes('medicine') || lower.includes('pill') || lower.includes('drug') ||
      lower.includes('antacid') || lower.includes('aspirin') || lower.includes('tums') ||
      lower.includes('laxative') || lower.includes('suppository')) return 'Medicine';
  if (lower.includes('soap') || lower.includes('shampoo') || lower.includes('detergent') ||
      lower.includes('cleaner') || lower.includes('bleach') || lower.includes('laundry') ||
      lower.includes('dishwash')) return 'Cleaning Products';
  if (lower.includes('cosmetic') || lower.includes('makeup') || lower.includes('lipstick') ||
      lower.includes('mascara') || lower.includes('blush') || lower.includes('nail polish') ||
      lower.includes('perfume') || lower.includes('cologne') || lower.includes('deodorant') ||
      lower.includes('hairspray') || lower.includes('hair gel') || lower.includes('mousse')) return 'Health & Beauty';
  if (lower.includes('oil') && !lower.includes('fish oil')) return 'Oils';
  if (lower.includes('coffee') || lower.includes('tea')) return 'Beverages';
  if (lower.includes('juice') || lower.includes('soda') || lower.includes('seltzer') ||
      lower.includes('water') || lower.includes('beverage')) return 'Beverages';
  if (lower.includes('candy') || lower.includes('chocolate') || lower.includes('gum')) return 'Candy & Chocolate';
  if (lower.includes('fruit') || lower.includes('apple') || lower.includes('orange') ||
      lower.includes('grape') || lower.includes('berry') || lower.includes('pineapple')) return 'Fruits & Vegetables';
  if (lower.includes('vegetable') || lower.includes('beans') || lower.includes('peas') ||
      lower.includes('corn') || lower.includes('carrot') || lower.includes('mushroom') ||
      lower.includes('garlic') || lower.includes('salad')) return 'Fruits & Vegetables';
  if (lower.includes('meat') || lower.includes('poultry') || lower.includes('chicken') ||
      lower.includes('beef') || lower.includes('fish') || lower.includes('salmon')) return 'Meat & Fish';
  if (lower.includes('dairy') || lower.includes('milk') || lower.includes('cheese') ||
      lower.includes('butter') || lower.includes('yogurt') || lower.includes('cream') ||
      lower.includes('ice cream')) return 'Dairy';
  if (lower.includes('sugar') || lower.includes('honey') || lower.includes('sweetener') ||
      lower.includes('splenda') || lower.includes('stevia') || lower.includes('aspartame')) return 'Sugar & Sweeteners';
  if (lower.includes('bread') || lower.includes('matza') || lower.includes('flour') ||
      lower.includes('baking') || lower.includes('cracker')) return 'Baked Goods';
  if (lower.includes('spice') || lower.includes('salt') || lower.includes('pepper') ||
      lower.includes('cinnamon') || lower.includes('saffron')) return 'Spices & Seasonings';
  if (lower.includes('alcohol') || lower.includes('wine') || lower.includes('vodka') ||
      lower.includes('whiskey') || lower.includes('beer') || lower.includes('rum') ||
      lower.includes('brandy') || lower.includes('bourbon')) return 'Wines & Liquors';
  if (lower.includes('paper') || lower.includes('foil') || lower.includes('plastic') ||
      lower.includes('bag') || lower.includes('cup') || lower.includes('plate') ||
      lower.includes('napkin') || lower.includes('towel')) return 'Paper & Plastic';
  if (lower.includes('pet') || lower.includes('dog food') || lower.includes('cat food') ||
      lower.includes('bird food') || lower.includes('fish food')) return 'Pet Food';
  return 'General';
}

function isCRCNonFood(product: string): boolean {
  const lower = product.toLowerCase();
  return lower.includes('soap') || lower.includes('shampoo') || lower.includes('detergent') ||
    lower.includes('cleaner') || lower.includes('bleach') || lower.includes('cosmetic') ||
    lower.includes('makeup') || lower.includes('deodorant') || lower.includes('hairspray') ||
    lower.includes('paper') || lower.includes('foil') || lower.includes('plastic') ||
    lower.includes('bag') || lower.includes('cup') || lower.includes('plate');
}

// ============================================================
// STAR-K PARSER — Approved without KFP certification
// ============================================================

function parseStarK(text: string): RawItem[] {
  const items: RawItem[] = [];

  // Find the "Approved for Passover Without KFP" section
  const sectionStart = text.indexOf('APPROVED FOR PASSOVER WITHOUT');
  if (sectionStart === -1) {
    console.log('  ⚠️  Could not find Star-K approved list section');
    return [];
  }

  const sectionText = text.substring(sectionStart);
  const lines = sectionText.split('\n').map(l => l.trim()).filter(Boolean);

  const SKIP_PATTERNS = [
    /^STAR-K\.ORG/i,
    /^2026 APPROVED FOR PASSOVER/,
    /^APPROVED FOR PASSOVER WITHOUT/,
    /^The following products are approved/,
    /^without any additional Passover/,
    /^\d+$/,
    /^KFP OR/,
    /^"P" ON LABEL/,
  ];

  // Parse "Product Name - condition" or "Product Name\ncondition" paragraphs
  // Each paragraph is one item; bullet points (•) are sub-items
  let currentProduct = '';
  let currentNotes: string[] = [];

  function flushProduct() {
    if (!currentProduct) return;

    const notes = currentNotes.join(' ').replace(/\s+/g, ' ').trim();
    const status: RawItem['status'] = 'approved';

    // Clean up product name
    const dashIdx = currentProduct.indexOf(' - ');
    let productName = currentProduct;
    let conditionFromName = '';
    if (dashIdx > 0) {
      productName = currentProduct.substring(0, dashIdx).trim();
      conditionFromName = currentProduct.substring(dashIdx + 3).trim();
    }

    if (productName.length < 2 || productName.length > 100) {
      currentProduct = '';
      currentNotes = [];
      return;
    }

    const fullNotes = [conditionFromName, notes].filter(Boolean).join('. ');

    items.push({
      id: makeId('Star-K', 'no-kfp', getStarKCategory(productName), productName),
      productName,
      category: getStarKCategory(productName),
      status,
      conditions: 'Approved without KFP label under listed conditions',
      notes: fullNotes || null,
      org: 'Star-K',
      sourceSlug: 'star-k',
      sourceTitle: 'Star-K Approved Without KFP Label',
      pageNumber: null,
      isNonFood: isStarKNonFood(productName),
      isKitniyot: false,
      askRabbi: false,
    });

    currentProduct = '';
    currentNotes = [];
  }

  for (const line of lines) {
    if (SKIP_PATTERNS.some(p => p.test(line))) continue;

    // Bullet sub-items (like "• Alcohol, Benzyl")
    if (line.startsWith('•')) {
      const subItem = line.replace(/^•\s*/, '').trim();
      if (subItem && currentProduct) {
        // Create a sub-item
        const parentProduct = currentProduct.replace(/ - .*$/, '');
        const productName = `${parentProduct} - ${subItem}`;
        if (productName.length < 120) {
          items.push({
            id: makeId('Star-K', 'no-kfp', getStarKCategory(parentProduct), productName),
            productName,
            category: getStarKCategory(parentProduct),
            status: 'approved',
            conditions: 'Approved without KFP label (for external use)',
            notes: null,
            org: 'Star-K',
            sourceSlug: 'star-k',
            sourceTitle: 'Star-K Approved Without KFP Label',
            pageNumber: null,
            isNonFood: true,
            isKitniyot: false,
            askRabbi: false,
          });
        }
      }
      continue;
    }

    // Check if this is a new product entry (starts with capital, contains " - " or is a short noun phrase)
    // Product entries start with capital letter and product name
    // Note continuation lines start with lowercase or are clearly descriptive
    const isNewEntry = /^[A-Z][a-zA-Z\s\/&\-()]+( - |$)/.test(line) &&
      !line.startsWith('The ') && !line.startsWith('All ') && !line.startsWith('Any ') &&
      !line.startsWith('This ') && !line.startsWith('However') && !line.startsWith('If ') &&
      !line.startsWith('No ') && !line.startsWith('For ') && !line.startsWith('Since ') &&
      !line.startsWith('Many ') && !line.startsWith('Purchase ') && !line.startsWith('See ') &&
      !line.startsWith('Consumers ') && !line.startsWith('Contact ') &&
      !line.startsWith('When ') && !line.startsWith('Above ') && !line.startsWith('Note ') &&
      line.length < 100;

    if (isNewEntry && currentProduct) {
      flushProduct();
    }

    if (isNewEntry) {
      currentProduct = line;
    } else if (currentProduct) {
      currentNotes.push(line);
    }
  }

  flushProduct();
  return items;
}

function getStarKCategory(product: string): string {
  const lower = product.toLowerCase();
  if (lower.includes('air freshener') || lower.includes('ammonia') || lower.includes('bleach') ||
      lower.includes('cleaner') || lower.includes('detergent') || lower.includes('fabric') ||
      lower.includes('floor') || lower.includes('oven cleaner') || lower.includes('scouring')) return 'Cleaning Products';
  if (lower.includes('alcohol') || lower.includes('baking soda') || lower.includes('charcoal') ||
      lower.includes('cocoa') || lower.includes('eggs') || lower.includes('flaxseed') ||
      lower.includes('frozen fruit') || lower.includes('fruit') || lower.includes('hemp') ||
      lower.includes('milk') || lower.includes('mineral') || lower.includes('nuts') ||
      lower.includes('oil') || lower.includes('salt') || lower.includes('sugar') ||
      lower.includes('water')) return 'Food & Pantry';
  if (lower.includes('baby') || lower.includes('contact lens') || lower.includes('dental') ||
      lower.includes('eyedrop') || lower.includes('hydrogen peroxide') ||
      lower.includes('mineral oil') || lower.includes('nail polish')) return 'Health & Beauty';
  if (lower.includes('paper') || lower.includes('aluminum foil') || lower.includes('bag') ||
      lower.includes('cup') || lower.includes('cutlery') || lower.includes('crockpot') ||
      lower.includes('parchment') || lower.includes('plastic')) return 'Paper & Plastic';
  if (lower.includes('gloves') || lower.includes('insect') || lower.includes('ice') ||
      lower.includes('paint')) return 'Household';
  return 'General';
}

function isStarKNonFood(product: string): boolean {
  const lower = product.toLowerCase();
  return lower.includes('air freshener') || lower.includes('ammonia') || lower.includes('bleach') ||
    lower.includes('cleaner') || lower.includes('detergent') || lower.includes('alcohol') ||
    lower.includes('foil') || lower.includes('paper') || lower.includes('plastic') ||
    lower.includes('gloves') || lower.includes('contact lens') || lower.includes('nail polish') ||
    lower.includes('eyedrop') || lower.includes('hydrogen peroxide');
}

// ============================================================
// COR PASSOVER 2026 PARSER
// ============================================================
// Format: "ProductNameStatus" concatenated on one line, e.g.
//   "Baking SodaNo certification required (year-round including Passover)"
//   "BuckwheatKitniyot * (see note above)"
// ALL-CAPS lines are parent section headers; sub-items start with "•"
// Non-edible section follows edible products on a later page.

function parseCORPassover2026(text: string): RawItem[] {
  // Find product guide start — appears after the "Establishments & Services" page
  const listStart = text.indexOf('passover \nProduct Guide\n');
  if (listStart === -1) {
    console.log('  ⚠️  Could not find COR Passover 2026 product guide section');
    return [];
  }

  // Find the end of the non-edible section (kitniyot essay begins after it)
  const listEnd = (() => {
    for (const marker of [
      '\nKASHRUTH COUNCIL OF CANADA | WWW.COR.CA\n22\n',
      '\nOrigins\nThe earliest literature',
      '\nKitniyot\n',
    ]) {
      const idx = text.indexOf(marker, listStart + 1000);
      if (idx > listStart) return idx;
    }
    return text.length;
  })();

  const guideText = text.substring(listStart, listEnd);
  const lines = guideText.split('\n').map(l => l.trim());

  // Status fragments found at the end of concatenated product lines.
  // Each entry: [searchString, status, displayNotes]
  // Order: most specific first to avoid partial matches.
  type StatusDef = [string, RawItem['status'], string | null];
  const STATUS_DEFS: StatusDef[] = [
    ['Certified (year-round including Passover)', 'approved', 'Year-round COR certified, Passover included'],
    ['Certified by the OU is acceptable without Passover certification', 'approved', 'OU-certified, no separate Passover cert needed'],
    ['Acceptable as-is for Passover', 'approved', null],
    ['Kosher for Passover year-round even without Passover certification', 'approved', 'Kosher for Passover year-round'],
    ['Kosher for Passover year-round', 'approved', 'Kosher for Passover year-round'],
    ['No Passover certification required', 'approved', null],
    ['No passover certification required', 'approved', null],
    ['No certification required (year-round including Passover)', 'approved', null],
    ['No Passover certification required', 'approved', null],
    ['No certification required', 'approved', null],
    ['No Passover Certification Required', 'approved', null],
    ['Preferable with Passover certification', 'conditional', 'Preferable with Passover certification; if unavailable, buy before Passover'],
    ['Requires Passover certification', 'conditional', 'Requires Passover certification'],
    ['Kitniyot and may contain chametz', 'not_approved', 'Kitniyot and may contain chametz'],
    ['kitniyot and may contain chametz', 'not_approved', 'Kitniyot and may contain chametz'],
    ['May contain Chametz', 'not_approved', 'May contain chametz'],
    ['may contain Chametz', 'not_approved', 'May contain chametz'],
    ['Chametz', 'not_approved', 'Chametz — not acceptable for Passover'],
    ['Should not have chametz-derived alcohol', 'ask_rabbi', 'Should not contain chametz-derived alcohol'],
    ['Should be chametz-free', 'ask_rabbi', 'Should be chametz-free'],
    ['There are differing opinions', 'ask_rabbi', 'Differing halachic opinions — consult your rabbi'],
    ['differing opinions', 'ask_rabbi', 'Differing halachic opinions — consult your rabbi'],
    ['Ask your rabbi', 'ask_rabbi', 'Ask your rabbi'],
    ['Kitniyot *', 'kitniyot', 'Kitniyot (see COR guidelines)'],
    ['kitniyot *', 'kitniyot', 'Kitniyot (see COR guidelines)'],
  ];

  const NOISE_PATTERNS = [
    /^KASHRUTH COUNCIL OF CANADA/,
    /^2026-5786 PASSOVER GUIDE/,
    /^halachic(\s|$)/,
    /^COR$/,
    /^NER$/,
    /^P$/,
    /^REQUIRES(\s|$)/,
    /^NO PASSOVER(\s|$)/,
    /^CERTIFICATION REQUIRED/,
    /^TAKE NOTE!/,
    /^KITNIYOT \*This product/,
    /^passover(\s|$)/i,
    /^Product Guide$/,
    /^Non-Edible/,
    /^products$/,
    /^CHAMETZ$/,
    /^\d+$/,
    /^See (?!Fish|Poultry|Milk|Oil|Soft)/,  // skip cross-refs but not content
    /^see /,
    /^The following baby formula/,
    /^facilities and are acceptable/,
    /^kitniyot and should be prepared/,
    /^Redpath White Sugar and Lantic/,
    /^All varieties of/,
    /^www\.cor\.ca/i,
    /^Note:/,
    /^IMPORTANT/,
  ];

  function splitProductLine(line: string): { name: string; status: RawItem['status']; notes: string | null } | null {
    // Remove leading bullet
    const clean = line.replace(/^[•\-]\s*/, '').trim();
    if (!clean) return null;

    let best: { idx: number; def: StatusDef } | null = null;

    for (const def of STATUS_DEFS) {
      const idx = clean.indexOf(def[0]);
      if (idx > 0 && (!best || idx < best.idx)) {
        best = { idx, def };
      }
    }

    if (!best || best.idx < 1) return null;

    const name = clean.substring(0, best.idx).trim();
    const afterStatus = clean.substring(best.idx + best.def[0].length).trim();
    // Capture any extra text after the status as additional notes
    const extraNotes = afterStatus.length > 3 ? afterStatus : null;
    const baseNotes = best.def[2];
    const notes = [baseNotes, extraNotes].filter(Boolean).join('. ') || null;

    return { name, status: best.def[1], notes };
  }

  function getCORCategory(name: string, isNonEdible: boolean): string {
    if (isNonEdible) return 'Non-Food';
    const l = name.toLowerCase();
    if (l.includes('coffee') || l.includes('tea') || l.includes('juice') ||
        l.includes('soda') || l.includes('seltzer') || l.includes('water') ||
        l.includes('drink') || l.includes('milk') || l.includes('cola') ||
        l.includes('soy milk') || l.includes('rice milk') || l.includes('almond milk')) return 'Beverages';
    if (l.includes('wine') || l.includes('alcohol') || l.includes('vodka') ||
        l.includes('beer') || l.includes('rum') || l.includes('whiskey')) return 'Wines & Liquors';
    if (l.includes('sugar') || l.includes('sweetener') || l.includes('honey') ||
        l.includes('syrup') || l.includes('agave')) return 'Sugar & Sweeteners';
    if (l.includes('oil') && !l.includes('baby oil')) return 'Oils';
    if (l.includes('nut') || l.includes('almond') || l.includes('walnut') ||
        l.includes('pecan') || l.includes('hazelnut') || l.includes('pistachio')) return 'Nuts (Raw)';
    if (l.includes('fruit') || l.includes('apple') || l.includes('orange') ||
        l.includes('grape') || l.includes('berry') || l.includes('lemon') ||
        l.includes('lime') || l.includes('pineapple') || l.includes('prune') ||
        l.includes('raisin') || l.includes('date')) return 'Fruits & Vegetables';
    if (l.includes('vegetable') || l.includes('carrot') || l.includes('mushroom') ||
        l.includes('garlic') || l.includes('salad') || l.includes('potato') ||
        l.includes('onion') || l.includes('tomato') || l.includes('cucumber')) return 'Fruits & Vegetables';
    if (l.includes('kitniyot') || l.includes('corn') || l.includes('rice') ||
        l.includes('beans') || l.includes('pea') || l.includes('lentil') ||
        l.includes('chickpea') || l.includes('soybean') || l.includes('tofu') ||
        l.includes('sesame') || l.includes('sunflower') || l.includes('mustard') ||
        l.includes('buckwheat') || l.includes('kasha') || l.includes('popcorn') ||
        l.includes('edamame') || l.includes('quinoa') || l.includes('peanut') ||
        l.includes('canola') || l.includes('poppy') || l.includes('wild rice')) return 'Kitniyot Products';
    if (l.includes('meat') || l.includes('chicken') || l.includes('turkey') ||
        l.includes('poultry') || l.includes('beef') || l.includes('veal') ||
        l.includes('lamb')) return 'Meat & Poultry';
    if (l.includes('fish') || l.includes('salmon') || l.includes('tuna') ||
        l.includes('trout') || l.includes('herring')) return 'Fish Products';
    if (l.includes('cheese') || l.includes('butter') || l.includes('yogurt') ||
        l.includes('cream') || l.includes('dairy') || l.includes('lactaid')) return 'Dairy';
    if (l.includes('egg')) return 'Egg Products';
    if (l.includes('salt')) return 'Salt';
    if (l.includes('spice') || l.includes('pepper') || l.includes('cinnamon') ||
        l.includes('vanilla')) return 'Spices & Seasonings';
    if (l.includes('vinegar') || l.includes('ketchup') || l.includes('mustard') ||
        l.includes('mayonnaise') || l.includes('pickle') || l.includes('jam') ||
        l.includes('jelly')) return 'Condiments';
    if (l.includes('matzah') || l.includes('matzo') || l.includes('baking') ||
        l.includes('flour') || l.includes('cocoa') || l.includes('chocolate')) return 'Cooking & Baking';
    if (l.includes('medicine') || l.includes('vitamin') || l.includes('supplement')) return 'Medicine';
    if (l.includes('ice cream') || l.includes('frozen') || l.includes('sherbert')) return 'Ice Cream & Frozen Novelties';
    if (l.includes('baby food') || l.includes('baby formula') || l.includes('enfamil') ||
        l.includes('similac')) return 'Breakfast Foods';
    if (l.includes('gum') || l.includes('candy') || l.includes('dessert') ||
        l.includes('pudding')) return 'Candy & Chocolate';
    if (l.includes('potato chips') || l.includes('snack')) return 'Snacks & Desserts';
    return 'Food & Pantry';
  }

  const items: RawItem[] = [];
  let currentParent = '';
  let inNonEdible = false;

  for (const line of lines) {
    if (!line) continue;
    if (NOISE_PATTERNS.some(p => p.test(line))) continue;

    // Detect transition to non-edible section
    if (/^Alcohol \(Isopropyl\)No/.test(line) ||
        (/^Alcohol/.test(line) && line.includes('No certification required') && !inNonEdible && items.length > 20)) {
      inNonEdible = true;
    }

    // Section label line for non-edible
    if (line === 'Non-Edible' || line === 'products') continue;

    const isBullet = line.startsWith('•') || line.startsWith('-');
    const parsed = splitProductLine(line);

    if (!parsed) {
      // Might be an ALL-CAPS parent header
      if (isUpperCaseLine(line) && line.length >= 2 && line.length <= 60 && !line.includes('|')) {
        currentParent = titleCase(line);
      }
      continue;
    }

    let { name, status, notes } = parsed;

    // Attach parent name for sub-items
    if (isBullet && currentParent) {
      name = `${currentParent} - ${name}`;
    }

    // Skip if too short, too long, or a cross-reference
    if (!name || name.length < 3 || name.length > 120) continue;
    if (/^see /i.test(name)) continue;

    // Clean up name
    name = name.replace(/\s+/g, ' ').trim();

    const category = getCORCategory(name, inNonEdible);
    const isKitniyotStatus = status === 'kitniyot';
    const isNonFoodFlag = inNonEdible || ['Non-Food', 'Household'].includes(category);

    items.push({
      id: makeId('COR', 'passover-guide-2026', category, name),
      productName: name,
      category,
      status,
      conditions: notes,
      notes,
      org: 'COR',
      sourceSlug: 'cor-passover-2026',
      sourceTitle: 'COR Passover Guide 5786',
      pageNumber: null,
      isNonFood: isNonFoodFlag,
      isKitniyot: isKitniyotStatus,
      askRabbi: status === 'ask_rabbi',
    });

    // Clear parent after a top-level (non-bullet) item
    if (!isBullet) currentParent = '';
  }

  return items;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('🔍 Extracting Pesach product data from source documents...\n');

  const allItems: RawItem[] = [];
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse');

  // 1. OU Year-Round
  try {
    const p = path.join(__dirname, '..', 'public', 'pdfs', 'OU-yearround.pdf');
    if (fs.existsSync(p)) {
      const data = await pdfParse(fs.readFileSync(p));
      const items = parseOUYearRound(data.text);
      allItems.push(...items);
      console.log(`✅ OU Year-Round: ${items.length} items`);
    } else {
      console.log('⚠️  OU-yearround.pdf not found');
    }
  } catch (e) {
    console.error('❌ Error parsing OU Year-Round:', e);
  }

  // 2. OU Non-Food (hardcoded)
  const nonFoodItems = parseOUNonFood('');
  allItems.push(...nonFoodItems);
  console.log(`✅ OU Non-Food: ${nonFoodItems.length} items`);

  // 3. OU Specifics (main certified product list)
  try {
    const p = path.join(__dirname, '..', 'public', 'pdfs', 'OU-specifics.pdf');
    if (fs.existsSync(p)) {
      const data = await pdfParse(fs.readFileSync(p));
      const items = parseOUSpecifics(data.text);
      allItems.push(...items);
      console.log(`✅ OU Specifics: ${items.length} items`);
    } else {
      console.log('⚠️  OU-specifics.pdf not found');
    }
  } catch (e) {
    console.error('❌ Error parsing OU Specifics:', e);
  }

  // 4. OU Kitniyos
  try {
    const p = path.join(__dirname, '..', 'public', 'pdfs', 'OU-kitniyos.pdf');
    if (fs.existsSync(p)) {
      const data = await pdfParse(fs.readFileSync(p));
      const items = parseOUKitniyos(data.text);
      allItems.push(...items);
      console.log(`✅ OU Kitniyot: ${items.length} items`);
    } else {
      console.log('⚠️  OU-kitniyos.pdf not found');
    }
  } catch (e) {
    console.error('❌ Error parsing OU Kitniyos:', e);
  }

  // 5. CRC
  try {
    const p = path.join(__dirname, '..', 'public', 'pdfs', 'crc.pdf');
    if (fs.existsSync(p)) {
      const data = await pdfParse(fs.readFileSync(p));
      const items = parseCRC(data.text);
      allItems.push(...items);
      console.log(`✅ CRC: ${items.length} items`);
    } else {
      console.log('⚠️  crc.pdf not found');
    }
  } catch (e) {
    console.error('❌ Error parsing CRC:', e);
  }

  // 6. Star-K
  try {
    const p = path.join(__dirname, '..', 'public', 'pdfs', 'star-k.pdf');
    if (fs.existsSync(p)) {
      const data = await pdfParse(fs.readFileSync(p));
      const items = parseStarK(data.text);
      allItems.push(...items);
      console.log(`✅ Star-K: ${items.length} items`);
    } else {
      console.log('⚠️  star-k.pdf not found');
    }
  } catch (e) {
    console.error('❌ Error parsing Star-K:', e);
  }

  // 7. COR Passover Guide 2026
  try {
    const p = path.join(__dirname, '..', 'public', 'pdfs', 'COR-Passover-2026_final.pdf');
    if (fs.existsSync(p)) {
      const data = await pdfParse(fs.readFileSync(p));
      const items = parseCORPassover2026(data.text);
      allItems.push(...items);
      console.log(`✅ COR Passover 2026: ${items.length} items`);
    } else {
      console.log('⚠️  COR-Passover-2026_final.pdf not found');
    }
  } catch (e) {
    console.error('❌ Error parsing COR Passover 2026:', e);
  }

  // 8. COR Costco (image — OCR skipped, placeholder)
  console.log('ℹ️  COR Costco image: OCR not implemented (add tesseract.js to enable)');

  // De-duplicate by ID
  const seen = new Set<string>();
  const deduped = allItems.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  // Write output
  const outputPath = path.join(__dirname, '..', 'src', 'data', 'items.json');
  fs.writeFileSync(outputPath, JSON.stringify(deduped, null, 2));

  console.log(`\n📦 Written ${deduped.length} total items to ${outputPath}`);
  console.log(`   (${allItems.length - deduped.length} duplicates removed)`);

  // Summary by org
  const orgCounts = deduped.reduce((acc, item) => {
    acc[item.org] = (acc[item.org] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log('\n📊 By organization:');
  for (const [org, count] of Object.entries(orgCounts)) {
    console.log(`   ${org}: ${count}`);
  }

  const statusCounts = deduped.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log('\n📊 By status:');
  for (const [status, count] of Object.entries(statusCounts)) {
    console.log(`   ${status}: ${count}`);
  }
}

main().catch(console.error);
