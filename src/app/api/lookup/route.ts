import { NextRequest, NextResponse } from 'next/server';

const OFF_BASE = 'https://world.openfoodfacts.org/api/v0/product';

export async function GET(request: NextRequest) {
  const barcode = request.nextUrl.searchParams.get('barcode')?.trim();

  if (!barcode || !/^\d{6,14}$/.test(barcode)) {
    return NextResponse.json({ error: 'Invalid barcode' }, { status: 400 });
  }

  try {
    const res = await fetch(`${OFF_BASE}/${barcode}.json`, {
      headers: { 'User-Agent': 'PesachSearch/1.0 (pesach-search-2026.vercel.app)' },
      next: { revalidate: 86400 }, // cache 24h
    });

    if (!res.ok) {
      return NextResponse.json({ found: false });
    }

    const data = await res.json();

    if (data.status !== 1 || !data.product) {
      return NextResponse.json({ found: false });
    }

    const p = data.product;
    const productName: string =
      p.product_name_en || p.product_name || '';
    const brand: string = p.brands?.split(',')[0]?.trim() || '';

    return NextResponse.json({
      found: true,
      productName,
      brand,
      searchQuery: [brand, productName].filter(Boolean).join(' '),
      imageUrl: p.image_front_small_url || p.image_small_url || null,
    });
  } catch {
    return NextResponse.json({ error: 'Lookup failed' }, { status: 502 });
  }
}
