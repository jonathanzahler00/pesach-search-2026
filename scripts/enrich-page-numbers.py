#!/usr/bin/env python3
import json
import re
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parent.parent
PDF_DIR = ROOT / "public" / "pdfs"
ITEMS_PATH = ROOT / "src" / "data" / "items.json"
SOURCES_PATH = ROOT / "src" / "data" / "sources.json"

SOURCE_FILES = {
    "ou-yearround": "OU-yearround.pdf",
    "ou-main": "OU.pdf",
    "ou-kitniyos": "OU-kitniyos.pdf",
    "ou-nonfood": "OU-nonfood.pdf",
    "ou-specifics": "OU-specifics.pdf",
    "crc": "crc.pdf",
    "star-k": "star-k.pdf",
    "cor-passover-2026": "COR-Passover-2026_final.pdf",
}

MANUAL_PAGE_OVERRIDES = {
    "ou-specifics-sugar-oxygen-fruit-spread-no-sugar": 14,
}

STOP_WORDS = {
    "and", "the", "for", "with", "from", "that", "this", "your", "are", "not", "all",
    "raw", "only", "must", "bear", "page", "pages", "see", "guide", "products",
    "approved", "certified", "pesach", "passover", "kosher", "without", "label",
    "under", "listed", "conditions", "fresh", "frozen", "processed",
}


def normalize(text: str) -> str:
    text = text.lower()
    text = text.replace("’", "'").replace("“", '"').replace("”", '"').replace("–", "-").replace("—", "-")
    text = re.sub(r"[^a-z0-9\s-]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def keywords(text: str) -> list[str]:
    parts = [p for p in normalize(text).replace("-", " ").split() if len(p) >= 3 and p not in STOP_WORDS]
    deduped = []
    seen = set()
    for part in parts:
      # keep order stable
        if part not in seen:
            seen.add(part)
            deduped.append(part)
    return deduped


def page_texts(pdf_path: Path) -> list[str]:
    reader = PdfReader(str(pdf_path))
    texts: list[str] = []
    for page in reader.pages:
        try:
            text = page.extract_text() or ""
        except Exception:
            text = ""
        texts.append(normalize(text))
    return texts


def source_candidates(item: dict) -> list[str]:
    product_name = item["productName"]
    candidates = [product_name]

    if " - " in product_name:
        left, right = product_name.split(" - ", 1)
        candidates.extend([left, right, f"{left} {right}"])

    candidates.append(re.sub(r"\([^)]*\)", "", product_name).strip())
    candidates.append(product_name.replace("/", " "))
    candidates.append(product_name.replace("&", " and "))

    notes = item.get("notes") or ""
    if item["sourceSlug"] == "ou-specifics":
        if " - " in product_name:
            brand, detail = product_name.split(" - ", 1)
            candidates.extend([brand, f"{brand} {detail}"])
        if notes:
            first_note = notes.split(",")[0].strip()
            if first_note:
                candidates.append(first_note)
                if " - " in product_name:
                    brand = product_name.split(" - ", 1)[0]
                    candidates.append(f"{brand} {first_note}")

    unique = []
    seen = set()
    for candidate in candidates:
        normalized = normalize(candidate)
        if normalized and normalized not in seen:
            seen.add(normalized)
            unique.append(normalized)
    return unique


def best_page(item: dict, pages: list[str]) -> int | None:
    candidates = source_candidates(item)
    item_keywords = keywords(item["productName"])
    note_keywords = keywords(item.get("notes") or "")[:8]
    category_keywords = keywords(item.get("category") or "")[:4]

    best_idx = None
    best_score = -1
    second_score = -1

    for idx, page in enumerate(pages):
        score = 0
        for candidate in candidates:
            if candidate and candidate in page:
                score = max(score, 100 + min(len(candidate.split()), 6))

        if score < 100:
            item_hits = sum(1 for token in item_keywords if token in page)
            note_hits = sum(1 for token in note_keywords if token in page)
            category_hits = sum(1 for token in category_keywords if token in page)
            score = item_hits * 10 + note_hits * 3 + category_hits * 2

            if item["sourceSlug"] == "ou-specifics" and " - " in item["productName"]:
                brand = keywords(item["productName"].split(" - ", 1)[0])
                detail = keywords(item["productName"].split(" - ", 1)[1])
                if brand and all(token in page for token in brand):
                    score += 20
                if detail and any(token in page for token in detail):
                    score += 10

        if score > best_score:
            second_score = best_score
            best_score = score
            best_idx = idx
        elif score > second_score:
            second_score = score

    if best_idx is None:
        return None

    if best_score >= 100:
        return best_idx + 1

    if best_score >= 24 and best_score >= second_score + 6:
        return best_idx + 1

    return None


def main() -> None:
    items = json.loads(ITEMS_PATH.read_text(encoding="utf-8"))
    sources = json.loads(SOURCES_PATH.read_text(encoding="utf-8"))

    pages_by_source: dict[str, list[str]] = {}
    for slug, filename in SOURCE_FILES.items():
        pdf_path = PDF_DIR / filename
        if pdf_path.exists():
            pages_by_source[slug] = page_texts(pdf_path)

    for source in sources:
        slug = source["slug"]
        if slug in pages_by_source:
            source["pageCount"] = len(pages_by_source[slug])
        elif source.get("fileType") == "image":
            source["pageCount"] = 1

    updated = 0
    unresolved = 0
    for item in items:
        override = MANUAL_PAGE_OVERRIDES.get(item["id"])
        if override is not None:
            item["pageNumber"] = override
            continue
        if item.get("pageNumber") is not None:
            continue
        slug = item["sourceSlug"]
        pages = pages_by_source.get(slug)
        if not pages:
            continue
        page = best_page(item, pages)
        if page is not None:
            item["pageNumber"] = page
            updated += 1
        else:
            unresolved += 1

    ITEMS_PATH.write_text(json.dumps(items, indent=2) + "\n", encoding="utf-8")
    SOURCES_PATH.write_text(json.dumps(sources, indent=2) + "\n", encoding="utf-8")
    print(f"Updated page numbers: {updated}")
    print(f"Unresolved page numbers: {unresolved}")


if __name__ == "__main__":
    main()
