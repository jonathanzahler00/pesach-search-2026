# Pesach Product Search — Product Requirements Document

## Overview

A web application that lets users search across multiple kosher-for-Passover guides (PDFs and images from major kashrus organizations) to instantly determine whether a product is approved for Pesach use, which organization certifies it, and whether it involves kitniyot or requires rabbinical consultation.

**Live URL:** Deployed on Vercel, accessible from anywhere.

## Source Documents

All source files live in Google Drive folder "Pesach 2026":

| File | Org | Type | Content |
|------|-----|------|---------|
| `crc.pdf` | CRC (Chicago Rabbinical Council) | PDF | Full Passover guide |
| `OU.pdf` | OU (Orthodox Union) | PDF | Main Passover guide |
| `OU-kitniyos.pdf` | OU | PDF | Kitniyot-specific guide |
| `OU-nonfood.pdf` | OU | PDF | Non-food items (1 page) |
| `OU-specifics.pdf` | OU | PDF | Specific product listings |
| `OU-yearround.pdf` | OU | PDF (12 pages) | Year-round certified products OK for Pesach |
| `star-k.pdf` | Star-K | PDF | Full Passover guide |
| `COR_Costco.png` | COR (Kashruth Council of Canada) | Image | Costco-specific product list |

### Document Structure Patterns (from analysis)

**OU-yearround.pdf** (12 pages):
- Index page with categories and page numbers
- Then brand-by-brand listings under each category
- Categories: Avocado Oil, Baking Soda, Beverages, Cleaners & Detergents, Cocoa Powder, Coconut Oil, Coffee, Dish Detergents, Egg Products, Fish Raw, Fruits & Vegetables Raw, Juices, Meat & Poultry, Nuts, Olive Oil, Paper/Plastic/Wraps, Personal Hygiene, Raisins, Salt, Sugar, Tea Bags, Water
- Format: CATEGORY HEADING → BRAND NAME (one per line)
- Some have sub-conditions like "Virgin Only", "Unflavored Not Decaffeinated"

**OU-nonfood.pdf** (1 page):
- Simple list of non-food items that don't need Pesach certification
- Special sections: Oral Hygiene (consult rabbi), Guidelines for Medicines (detailed halachic framework)
- Medicine guidelines are nuanced — multiple categories based on danger level

**Other PDFs** (you'll need to extract and analyze):
- CRC typically uses tabular format with product categories
- Star-K uses similar category → brand listings
- OU main guide has product-specific pages with detailed info

## Data Model

### Core Schema (Supabase)

```sql
-- Source documents
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,        -- e.g., 'ou-yearround', 'crc', 'star-k'
  org TEXT NOT NULL,                -- 'OU', 'CRC', 'Star-K', 'COR'
  org_full TEXT NOT NULL,           -- 'Orthodox Union', etc.
  title TEXT NOT NULL,              -- 'Year-Round Products', 'Main Guide', etc.
  file_name TEXT NOT NULL,          -- Original filename
  file_type TEXT NOT NULL,          -- 'pdf' or 'image'
  page_count INTEGER,
  drive_file_id TEXT,               -- Google Drive file ID for linking
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Product/item entries
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id),
  product_name TEXT NOT NULL,       -- Searchable product/brand name
  category TEXT,                    -- e.g., 'Coffee', 'Cleaners', 'Non-Food'
  status TEXT NOT NULL CHECK (status IN ('approved', 'kitniyot', 'ask_rabbi', 'not_approved', 'conditional')),
  conditions TEXT,                  -- e.g., 'Virgin Only', 'Unflavored Not Decaffeinated'
  notes TEXT,                       -- Additional context
  page_number INTEGER,              -- Source page for linking
  org TEXT NOT NULL,                -- Denormalized for fast search
  is_non_food BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Full-text search index
CREATE INDEX idx_items_search ON items USING gin(to_tsvector('english', product_name || ' ' || COALESCE(category, '') || ' ' || COALESCE(notes, '')));
CREATE INDEX idx_items_org ON items(org);
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_items_category ON items(category);

-- For PDF storage (to serve in the viewer)
CREATE TABLE pdf_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id),
  file_data BYTEA,                 -- Or use Supabase Storage
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL
);
```

### Alternative: Static JSON (Simpler, Recommended for V1)

Instead of Supabase, store extracted data as JSON in the repo:

```
src/data/
  sources.json          -- Source document metadata
  items.json            -- All products (the main search corpus)
  ou-yearround.json     -- Per-source extractions
  ou-nonfood.json
  ou-specifics.json
  ou-kitniyos.json
  ou-main.json
  crc.json
  star-k.json
  cor-costco.json
```

This is simpler, faster to build, and works great for a read-only search app. You can always migrate to Supabase later if you want user accounts, favorites, etc.

## Features

### 1. Product Search (Primary)

**Search bar** at top of page. User types a product or brand name.

Results show:
- **Product name** (bold)
- **Status badge:**
  - ✅ `Kosher for Pesach` (green)
  - 🟡 `Kitniyot` (yellow) — with note "Ashkenazi communities traditionally avoid"
  - ⚠️ `Ask Your Rabbi` (orange)
  - 🔵 `Conditional` (blue) — with conditions shown
  - 🚫 `Not Approved` (red) — if explicitly called out
- **Organization badge:** OU / CRC / Star-K / COR with org logo/color
- **Category** (e.g., Coffee, Cleaners, Non-Food)
- **Conditions** if any (e.g., "Virgin Only", "Unflavored, Not Decaffeinated")
- **Source link:** "View in OU Year-Round Guide, p.62" — clickable, opens PDF viewer to that page

**Search behavior:**
- Fuzzy matching (handle typos)
- Search across product name, category, and notes
- Results grouped by product, showing all orgs that list it
- If multiple orgs have different rulings, show a ⚡ conflict indicator

### 2. Document Browser

Tab or sidebar to browse each source document standalone:
- PDF viewer (react-pdf or PDF.js) for PDFs
- Image viewer for the COR Costco PNG
- Full-page viewer with zoom, page navigation
- Each document card shows: org logo, title, page count

### 3. Browse by Category

Grid/list of categories (Coffee, Nuts, Cleaners, Medicine, etc.)
Click a category to see all products in it across all orgs.

### 4. Browse by Organization

Filter to see only OU / CRC / Star-K / COR listings.

### 5. Conflict Detection (Bonus)

When a product appears in multiple sources with different statuses, highlight it:
- "OU says ✅ Approved | CRC says ⚠️ Ask Rabbi"

### 6. Special Sections

- **Medicine Guidelines** — dedicated section pulling from OU-nonfood medicine rules
- **Kitniyot Guide** — dedicated section from OU-kitniyos
- **Non-Food Items** — dedicated section from OU-nonfood

## Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Framework | Next.js 14+ (App Router) | Vercel-native, SSR/SSG |
| Styling | Tailwind CSS | Fast, utility-first |
| Search | Fuse.js (client-side fuzzy) | No server needed, instant |
| PDF Viewer | @react-pdf-viewer/core | Full-featured PDF viewing |
| Data | Static JSON files | Simple, fast, no DB needed for V1 |
| Deployment | Vercel | One-click from GitHub |
| PDF Storage | Vercel Blob or public/ folder | Serve PDFs for the viewer |

## File Structure

```
pesach-search/
├── public/
│   └── pdfs/                    # PDF files served statically
│       ├── crc.pdf
│       ├── OU.pdf
│       ├── OU-kitniyos.pdf
│       ├── OU-nonfood.pdf
│       ├── OU-specifics.pdf
│       ├── OU-yearround.pdf
│       ├── star-k.pdf
│       └── COR_Costco.png
├── scripts/
│   └── extract-data.ts          # One-time script to parse PDFs → JSON
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout with nav
│   │   ├── page.tsx             # Home — search page
│   │   ├── documents/
│   │   │   └── page.tsx         # Document browser
│   │   ├── documents/[slug]/
│   │   │   └── page.tsx         # Single doc PDF viewer
│   │   ├── categories/
│   │   │   └── page.tsx         # Browse by category
│   │   └── medicine/
│   │       └── page.tsx         # Medicine guidelines
│   ├── components/
│   │   ├── SearchBar.tsx
│   │   ├── SearchResults.tsx
│   │   ├── ProductCard.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── OrgBadge.tsx
│   │   ├── PdfViewer.tsx
│   │   ├── CategoryGrid.tsx
│   │   ├── DocumentCard.tsx
│   │   └── ConflictAlert.tsx
│   ├── lib/
│   │   ├── search.ts            # Fuse.js search logic
│   │   ├── types.ts             # TypeScript interfaces
│   │   └── constants.ts         # Org colors, status configs
│   └── data/
│       ├── sources.json
│       └── items.json           # THE main data file
├── tailwind.config.ts
├── next.config.js
├── package.json
└── tsconfig.json
```

## UI/UX Design Direction

### Visual Identity
- **Vibe:** Clean, trustworthy, authoritative — like a well-designed kashrus reference
- **Colors:**
  - Primary: Deep navy (#1a2744)
  - Accent: Gold/warm (#c9a84c) — evokes Pesach seder plate
  - Status green: #22c55e
  - Status yellow: #eab308
  - Status orange: #f97316
  - Status red: #ef4444
  - Background: Warm off-white (#faf8f5)
- **Typography:**
  - Headings: Playfair Display (elegant, authoritative)
  - Body: DM Sans (clean, readable)
- **Layout:** Single-column search-first, with tabbed navigation for Documents / Categories / Orgs

### Mobile-First
This will be used heavily on phones during Pesach shopping. Search bar must be prominent, results must be scannable, and the PDF viewer must work on mobile.

## Cursor Build Instructions

### Phase 1: Project Setup
```
Create a new Next.js 14 project with App Router, Tailwind CSS, and TypeScript.
Install: fuse.js, @react-pdf-viewer/core, @react-pdf-viewer/default-layout, pdfjs-dist
Set up the file structure as shown above.
```

### Phase 2: Data Layer
```
Create src/lib/types.ts with interfaces for Source, Item, SearchResult.
Create src/data/sources.json with the 8 source documents.
Create src/data/items.json — this is where the extracted product data goes.
Build the Fuse.js search index in src/lib/search.ts.
```

### Phase 3: Core UI
```
Build the search page (app/page.tsx) with SearchBar and SearchResults.
Build ProductCard with StatusBadge and OrgBadge components.
Each result links to the source document page.
```

### Phase 4: Document Viewer
```
Build the document browser (app/documents/page.tsx) showing all 8 docs.
Build the PDF viewer page (app/documents/[slug]/page.tsx).
Support opening to a specific page via query param: ?page=62
For the PNG (COR_Costco), show an image viewer with zoom.
```

### Phase 5: Categories & Special Sections
```
Build the category browse page.
Build the medicine guidelines page (structured from OU-nonfood data).
Build kitniyot-focused view.
```

### Phase 6: Polish
```
Add conflict detection across orgs.
Mobile optimization.
SEO meta tags.
Loading states and error handling.
```

## Data Extraction Guide

### For Cursor (or manual extraction):

Each PDF needs to be parsed into items.json entries. Here's the format:

```json
{
  "id": "ou-yr-coffee-folgers",
  "product_name": "Folgers",
  "category": "Coffee",
  "status": "approved",
  "conditions": "Ground or Whole Bean, Unflavored, Not Decaffeinated",
  "notes": "Year-round certified, no special Pesach certification needed",
  "org": "OU",
  "source_slug": "ou-yearround",
  "source_title": "OU Year-Round Products",
  "page_number": 62,
  "is_non_food": false,
  "is_kitniyot": false,
  "ask_rabbi": false
}
```

### Extraction approach per document:

**OU-yearround.pdf:**
- Parse category headings (ALL CAPS)
- Under each category, each line is a brand name
- Inherit the category's conditions (e.g., under "COFFEE GROUND & WHOLE BEAN Unflavored Not Decaffeinated", every brand gets those conditions)
- Status: all "approved"

**OU-nonfood.pdf:**
- Simple list → status: "approved" with is_non_food: true
- Oral Hygiene section → status: "ask_rabbi"
- Medicine section → category: "Medicine", status: "conditional", notes: full guideline text

**OU-kitniyos.pdf:**
- All items → is_kitniyot: true
- Status: "kitniyot"

**OU-specifics.pdf, OU.pdf:**
- Need to analyze structure (probably product → brand → status format)
- May have page-by-page category sections

**crc.pdf:**
- CRC typically does product category tables
- Look for: product name, brand, status, special notes

**star-k.pdf:**
- Similar to CRC — category-based listings
- May have a different status vocabulary (check for their specific terms)

**COR_Costco.png:**
- OCR needed (Tesseract or manual transcription)
- Likely a grid/table of Costco products with Pesach status

## Deployment

1. Push to GitHub
2. Connect to Vercel
3. Deploy (zero config for Next.js)
4. Custom domain optional

## Future Enhancements (V2+)

- **User accounts** — save favorites, shopping list
- **AI search** — "Can I use this brand of ketchup?" → Claude API semantic search
- **Year selector** — add 2027 guides when available
- **Community notes** — users can flag updates or corrections
- **Share links** — deep link to a specific product ruling
- **PWA** — installable on phone for offline use during shopping
- **Barcode scanner** — scan a product, look it up instantly
