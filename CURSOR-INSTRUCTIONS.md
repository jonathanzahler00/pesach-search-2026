# Cursor Build Instructions — Pesach Product Search

## What You Have

This project is **mostly built**. The following are complete and ready:
- Full PRD (`docs/PRD.md`)
- TypeScript types with status/org display configs (`src/lib/types.ts`)
- Source document metadata (`src/data/sources.json`)
- Fuse.js search library (`src/lib/search.ts`)
- Data extraction script with OU parsers (`scripts/extract-data.ts`)
- **313 real items** from OU Year-Round + OU Non-Food (`src/data/items.json`)
- All Next.js pages: Home/Search, Documents, Document Viewer, Categories, Medicine
- Root layout with navigation
- Tailwind config with custom Pesach-themed colors
- Package.json with all dependencies

## What You Need To Do

### Step 1: Install and run

```bash
npm install
npm run dev
```

Verify the app loads at localhost:3000 with working search across 313 items.

### Step 2: Add your PDF files

Copy all 8 files into `public/pdfs/`:
```
public/pdfs/
  crc.pdf
  OU.pdf
  OU-kitniyos.pdf
  OU-nonfood.pdf
  OU-specifics.pdf
  OU-yearround.pdf
  star-k.pdf
  COR_Costco.png
```

### Step 3: Extract data from remaining PDFs

This is the main work. Open `scripts/extract-data.ts` and implement the parsers for:

1. **OU.pdf** (main guide) — the biggest one
   - Extract text with `pdf-parse`
   - Look for product category pages
   - Each product gets: brand name, category, status (approved/kitniyot/ask_rabbi)
   - Important: Some products are marked with "P" for Pesach, "D" for dairy, etc.

2. **OU-kitniyos.pdf**
   - All items: `status: 'kitniyot'`, `isKitniyot: true`
   - Parse category → brand listings

3. **OU-specifics.pdf**
   - Similar to year-round: category → brand → specific product variants

4. **crc.pdf**
   - CRC format is typically tabular
   - `org: 'CRC'`
   - Map their status terms to our enum

5. **star-k.pdf**
   - Similar to OU format
   - `org: 'Star-K'`

6. **COR_Costco.png**
   - Use `tesseract.js` for OCR
   - `org: 'COR'`
   - Costco product names with status

**Pattern to follow** (from the working OU parsers):
```typescript
{
  id: "ou-yearround-coffee-folgers",  // org-source-category-product
  productName: "Folgers",
  category: "Coffee (Ground/Whole Bean)",
  status: "approved",
  conditions: "Unflavored, Not Decaffeinated",
  notes: "Year-round certified",
  org: "OU",
  sourceSlug: "ou-yearround",
  sourceTitle: "OU Year-Round Products",
  pageNumber: 62,
  isNonFood: false,
  isKitniyot: false,
  askRabbi: false
}
```

After implementing each parser, run:
```bash
npx tsx scripts/extract-data.ts
```
This regenerates `src/data/items.json`.

### Step 4: PDF Viewer upgrade (optional)

The document viewer currently uses an iframe. To upgrade to the full react-pdf-viewer:

In `src/app/documents/[slug]/page.tsx`, replace the iframe with:

```tsx
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

// Inside the component:
const defaultLayoutPluginInstance = defaultLayoutPlugin();

<Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
  <Viewer
    fileUrl={fileUrl}
    plugins={[defaultLayoutPluginInstance]}
    initialPage={initialPage - 1}
  />
</Worker>
```

### Step 5: Deploy to Vercel

```bash
# Push to GitHub
git init
git add .
git commit -m "Pesach Product Search v1"
git remote add origin <your-repo-url>
git push -u origin main

# Then go to vercel.com → New Project → Import from GitHub
# Zero config needed for Next.js
```

### Step 6: Polish (optional improvements)

These are nice-to-haves you can add:

1. **Conflict detection** — `findConflicts()` in search.ts is already built. Add a `/conflicts` page showing products with different statuses across orgs.

2. **Mobile hamburger menu** — The nav links in layout.tsx could use a mobile dropdown.

3. **Search keyboard shortcut** — Press `/` to focus the search bar.

4. **Share links** — `/search?q=folgers` deep links.

5. **Favorites** — localStorage-based saved items list.

6. **PWA** — Add a `manifest.json` and service worker for offline use during Pesach shopping.

## File Reference

```
pesach-search/
├── docs/
│   └── PRD.md                    ← Full product spec
├── public/
│   └── pdfs/                     ← PUT YOUR PDFs HERE
├── scripts/
│   └── extract-data.ts           ← PDF → JSON extraction (implement remaining parsers)
├── src/
│   ├── app/
│   │   ├── globals.css           ← Custom styles + font imports
│   │   ├── layout.tsx            ← Root layout with nav
│   │   ├── page.tsx              ← Home / Search page
│   │   ├── categories/page.tsx   ← Browse by category
│   │   ├── documents/page.tsx    ← Document browser
│   │   ├── documents/[slug]/page.tsx  ← Single doc viewer
│   │   └── medicine/page.tsx     ← Medicine guidelines
│   ├── data/
│   │   ├── items.json            ← 313 items (grows as you add parsers)
│   │   └── sources.json          ← 8 source document metadata
│   └── lib/
│       ├── search.ts             ← Fuse.js search + utilities
│       └── types.ts              ← All TypeScript types + display configs
├── next.config.js
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Key Design Decisions

- **Static JSON** over Supabase — simpler, faster, no DB needed for read-only search
- **Fuse.js** for client-side fuzzy search — instant, no API calls
- **iframe PDF viewer** as baseline — upgrade to react-pdf-viewer when ready
- **313 real items** from OU data pre-loaded — app works immediately
- **Playfair Display + DM Sans** typography — authoritative but readable
- **Navy + Gold** color scheme — evokes Pesach seder plate aesthetic
