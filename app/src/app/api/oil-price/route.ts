import { NextRequest, NextResponse } from 'next/server';

const API_BASE = 'https://api.oilpriceapi.com/v1';

function getApiKey(): string | null {
  return process.env.OIL_PRICE_API ?? process.env['oil-price-api'] ?? null;
}

async function fetchOilPrice(endpoint: string, code: string, apiKey: string) {
  const res = await fetch(`${API_BASE}${endpoint}?by_code=${code}`, {
    headers: { Authorization: `Token ${apiKey}` },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

// GET /api/oil-price — latest prices for multiple commodities
export async function GET(request: NextRequest) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: 'OIL_PRICE_API not configured' }, { status: 503 });
  }

  const type = request.nextUrl.searchParams.get('type') ?? 'latest';
  const code = request.nextUrl.searchParams.get('code') ?? 'BRENT_CRUDE_USD';

  try {
    if (type === 'latest') {
      const data = await fetchOilPrice('/prices/latest', code, apiKey);
      return NextResponse.json({
        price: data.data.price,
        formatted: data.data.formatted,
        currency: data.data.currency,
        code: data.data.code,
        source: data.data.source,
        updatedAt: data.data.updated_at,
        change24h: data.data.changes?.['24h'] ?? null,
      });
    }

    if (type === 'history') {
      const data = await fetchOilPrice('/prices/past_month', code, apiKey);
      // Aggregate to daily prices (take last price per day)
      const byDay = new Map<string, number>();
      for (const p of data.data.prices) {
        const day = p.created_at.slice(0, 10);
        byDay.set(day, p.price);
      }
      const history = Array.from(byDay.entries())
        .map(([date, price]) => ({ date, price }))
        .sort((a, b) => a.date.localeCompare(b.date));
      return NextResponse.json({ history, code });
    }

    if (type === 'dashboard') {
      // Fetch multiple commodities relevant to Pakistan crisis
      const codes = [
        'BRENT_CRUDE_USD',
        'WTI_USD',
        'DUBAI_CRUDE_USD',
        'URALS_CRUDE_USD',
        'AZERI_LIGHT_USD',
        'NATURAL_GAS_USD',
        'JKM_LNG_USD',
        'JET_FUEL_USD',
        'NAPHTHA_USD',
        'OPEC_BASKET_USD',
      ];

      const results = await Promise.allSettled(
        codes.map(async (c) => {
          const d = await fetchOilPrice('/prices/latest', c, apiKey);
          return {
            code: c,
            name: d.data.code,
            price: d.data.price,
            formatted: d.data.formatted,
            change24h: d.data.changes?.['24h'] ?? null,
            updatedAt: d.data.updated_at,
          };
        })
      );

      const commodities = results
        .filter((r): r is PromiseFulfilledResult<{ code: string; name: string; price: number; formatted: string; change24h: { amount: number; percent: number } | null; updatedAt: string }> => r.status === 'fulfilled')
        .map((r) => r.value);

      return NextResponse.json({ commodities });
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Oil API error: ${message}` }, { status: 500 });
  }
}
