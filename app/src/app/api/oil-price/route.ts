import { NextResponse } from 'next/server';

export async function GET() {
  // Support both naming conventions
  const apiKey = process.env.OIL_PRICE_API ?? process.env['oil-price-api'];

  if (!apiKey) {
    return NextResponse.json(
      { error: 'OIL_PRICE_API not configured' },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(
      'https://api.oilpriceapi.com/v1/prices/latest?by_code=BRENT_CRUDE_USD',
      {
        headers: { Authorization: `Token ${apiKey}` },
        next: { revalidate: 300 }, // cache for 5 minutes
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Oil Price API returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    return NextResponse.json({
      price: data.data.price,
      formatted: data.data.formatted,
      currency: data.data.currency,
      source: data.data.source,
      updatedAt: data.data.updated_at,
      change24h: data.data.changes?.['24h'] ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to fetch oil price: ${message}` },
      { status: 500 }
    );
  }
}
