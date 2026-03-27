// ============================================================
// Pesach Product Search — Core Types
// ============================================================

export type ItemStatus =
  | "approved"      // ✅ Kosher for Pesach
  | "kitniyot"      // 🟡 Kitniyot
  | "ask_rabbi"     // ⚠️ Consult your rabbi
  | "conditional"   // 🔵 Approved with conditions
  | "not_approved"; // 🚫 Not approved

export type OrgCode = "OU" | "CRC" | "Star-K" | "COR";

export interface Source {
  slug: string;           // e.g., "ou-yearround"
  org: OrgCode;
  orgFull: string;        // e.g., "Orthodox Union"
  title: string;          // e.g., "Year-Round Products"
  fileName: string;       // e.g., "OU-yearround.pdf"
  fileType: "pdf" | "image";
  pageCount: number | null;
  description: string;
}

export interface Item {
  id: string;
  productName: string;
  category: string;
  status: ItemStatus;
  conditions: string | null;
  notes: string | null;
  org: OrgCode;
  sourceSlug: string;
  sourceTitle: string;
  pageNumber: number | null;
  isNonFood: boolean;
  isKitniyot: boolean;
  askRabbi: boolean;
}

export interface SearchResult {
  item: Item;
  score: number;            // Fuse.js relevance score (0 = perfect match)
  matchedFields: string[];
}

export interface ConflictGroup {
  productName: string;
  items: Item[];            // Same product, different orgs/statuses
  hasConflict: boolean;
}

export interface CategoryGroup {
  name: string;
  itemCount: number;
  orgs: OrgCode[];
}

// Status display configuration
export const STATUS_CONFIG: Record<ItemStatus, {
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  approved: {
    label: "Kosher for Pesach",
    emoji: "✅",
    color: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  kitniyot: {
    label: "Kitniyot",
    emoji: "🟡",
    color: "text-yellow-700",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
  },
  ask_rabbi: {
    label: "Ask Your Rabbi",
    emoji: "⚠️",
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  conditional: {
    label: "Conditional",
    emoji: "🔵",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  not_approved: {
    label: "Not Approved",
    emoji: "🚫",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
};

// Organization display configuration
export const ORG_CONFIG: Record<OrgCode, {
  full: string;
  color: string;
  bgColor: string;
}> = {
  OU: {
    full: "Orthodox Union",
    color: "text-blue-800",
    bgColor: "bg-blue-100",
  },
  CRC: {
    full: "Chicago Rabbinical Council",
    color: "text-purple-800",
    bgColor: "bg-purple-100",
  },
  "Star-K": {
    full: "Star-K Kosher Certification",
    color: "text-emerald-800",
    bgColor: "bg-emerald-100",
  },
  COR: {
    full: "Kashruth Council of Canada",
    color: "text-rose-800",
    bgColor: "bg-rose-100",
  },
};
