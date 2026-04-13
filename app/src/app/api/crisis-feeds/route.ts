import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// GDELT Pakistan Energy Crisis Intelligence
// ============================================================

interface GdeltArticle {
  url: string;
  title: string;
  seendate: string;
  socialimage: string;
  domain: string;
  language: string;
  sourcecountry: string;
}

const GDELT_QUERIES = [
  { topic: 'Fuel Supply', query: 'pakistan+oil+fuel+supply+crisis' },
  { topic: 'Hormuz', query: 'strait+hormuz+oil+shipping+iran' },
  { topic: 'Prices', query: 'pakistan+petrol+diesel+price+energy' },
  { topic: 'Iran', query: 'iran+pakistan+oil+corridor+sanctions' },
  { topic: 'Power Grid', query: 'pakistan+electricity+load+shedding+power' },
];

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type') ?? 'all';

  try {
    if (type === 'gdelt' || type === 'all') {
      // Fetch GDELT articles for each topic in parallel
      const results = await Promise.allSettled(
        GDELT_QUERIES.map(async ({ topic, query }) => {
          const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=10&format=json&sort=datedesc`;
          const res = await fetch(url, { next: { revalidate: 300 } });
          if (!res.ok) return { topic, articles: [] };
          const data = await res.json();
          const articles = (data.articles || []).map((a: GdeltArticle) => ({
            title: a.title,
            url: a.url,
            source: a.domain,
            date: a.seendate,
            image: a.socialimage,
            language: a.language,
            country: a.sourcecountry,
            topic,
          }));
          return { topic, articles };
        })
      );

      const feeds = results
        .filter((r): r is PromiseFulfilledResult<{ topic: string; articles: Array<{ title: string; url: string; source: string; date: string; image: string; language: string; country: string; topic: string }> }> => r.status === 'fulfilled')
        .map((r) => r.value);

      // Flatten, deduplicate by URL, sort by date
      const allArticles = feeds.flatMap((f) => f.articles);
      const seen = new Set<string>();
      const unique = allArticles.filter((a) => {
        if (seen.has(a.url)) return false;
        seen.add(a.url);
        return true;
      });
      unique.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      // Only English articles
      const english = unique.filter((a) => a.language === 'English' || !a.language);

      return NextResponse.json({
        articles: english.slice(0, 50),
        topics: feeds.map((f) => ({ topic: f.topic, count: f.articles.length })),
        fetchedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
