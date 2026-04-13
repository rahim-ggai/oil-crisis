'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/ModulePanel';

// ============================================================
// Types
// ============================================================

interface Article {
  title: string;
  url: string;
  source: string;
  date: string;
  image: string;
  language: string;
  country: string;
  topic: string;
}

interface TopicCount {
  topic: string;
  count: number;
}

interface CrisisFeedResponse {
  articles: Article[];
  topics: TopicCount[];
  fetchedAt: string;
}

// ============================================================
// Constants
// ============================================================

const TOPICS = ['Fuel Supply', 'Hormuz', 'Prices', 'Iran', 'Power Grid'] as const;
type Topic = (typeof TOPICS)[number];

const TOPIC_BADGE_COLORS: Record<Topic, string> = {
  'Fuel Supply': 'bg-navy/10 text-navy',
  Hormuz: 'bg-red-muted/10 text-red-muted',
  Prices: 'bg-ochre/10 text-ochre',
  Iran: 'bg-[#e67e22]/10 text-[#e67e22]',
  'Power Grid': 'bg-accent-blue/10 text-accent-blue',
};

const AUTO_REFRESH_MS = 5 * 60 * 1000;

// ============================================================
// Chokepoint data
// ============================================================

interface Chokepoint {
  name: string;
  status: 'Disrupted' | 'Operational' | 'Degraded' | 'Open';
  transits: string;
  impact: string;
}

const CHOKEPOINTS: Chokepoint[] = [
  {
    name: 'Strait of Hormuz',
    status: 'Disrupted',
    transits: '~5 ships/day (was 130)',
    impact: 'Critical — 70% of Pakistan\'s oil transits here',
  },
  {
    name: 'Suez Canal',
    status: 'Operational',
    transits: '~50 ships/day',
    impact: 'Alternative Red Sea route for Saudi crude',
  },
  {
    name: 'Bab el-Mandeb',
    status: 'Degraded',
    transits: '~30 ships/day',
    impact: 'Houthi disruptions affect Red Sea routing',
  },
  {
    name: 'Strait of Malacca',
    status: 'Open',
    transits: '~90 ships/day',
    impact: 'Unaffected — key for Malaysian/SE Asian crude',
  },
];

const STATUS_COLORS: Record<Chokepoint['status'], string> = {
  Disrupted: 'bg-red-muted/15 text-red-muted',
  Operational: 'bg-green-muted/15 text-green-muted',
  Degraded: 'bg-ochre/15 text-ochre',
  Open: 'bg-green-muted/15 text-green-muted',
};

// ============================================================
// Helpers
// ============================================================

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  // GDELT seendate format: "20260413T120000Z" or ISO string
  let d: Date;
  if (dateStr.includes('T') && !dateStr.includes('-')) {
    // Format: 20260413T120000Z
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    const hour = dateStr.slice(9, 11);
    const min = dateStr.slice(11, 13);
    const sec = dateStr.slice(13, 15);
    d = new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}Z`);
  } else {
    d = new Date(dateStr);
  }
  if (isNaN(d.getTime())) return '';

  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return `${Math.floor(diffDay / 30)}mo ago`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
}

// ============================================================
// Sub-components
// ============================================================

function TopicBadge({ topic }: { topic: string }) {
  const colors = TOPIC_BADGE_COLORS[topic as Topic] ?? 'bg-slate/10 text-slate';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${colors}`}>
      {topic}
    </span>
  );
}

function StatusBadge({ status }: { status: Chokepoint['status'] }) {
  const colors = STATUS_COLORS[status];
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${colors}`}>
      {status}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse space-y-2 p-3 border border-border rounded-lg">
      <div className="h-4 bg-border rounded w-3/4" />
      <div className="h-3 bg-border rounded w-1/3" />
      <div className="h-3 bg-border rounded w-1/4" />
    </div>
  );
}

function ArticleCard({ article }: { article: Article }) {
  return (
    <div className="p-3 border border-border rounded-lg hover:bg-card-hover transition-colors">
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-navy hover:text-accent-blue transition-colors leading-snug block"
      >
        {article.title}
      </a>
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        <span className="text-[10px] text-slate">{article.source}</span>
        <span className="text-[10px] text-slate-light font-mono">{timeAgo(article.date)}</span>
        <TopicBadge topic={article.topic} />
      </div>
    </div>
  );
}

function ChokepointCard({ cp }: { cp: Chokepoint }) {
  return (
    <Card>
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-semibold text-navy">{cp.name}</h4>
        <StatusBadge status={cp.status} />
      </div>
      <p className="text-xs font-mono text-foreground mb-1">{cp.transits}</p>
      <p className="text-xs text-slate">{cp.impact}</p>
    </Card>
  );
}

// ============================================================
// Main component
// ============================================================

export function GlobalMonitorPanel() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [topics, setTopics] = useState<TopicCount[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<string>('All');

  const fetchFeeds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/crisis-feeds?type=all');
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      const data: CrisisFeedResponse = await res.json();
      setArticles(data.articles);
      setTopics(data.topics);
      setFetchedAt(data.fetchedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + auto-refresh
  useEffect(() => {
    fetchFeeds();
    const interval = setInterval(fetchFeeds, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchFeeds]);

  const filteredArticles =
    activeTopic === 'All' ? articles : articles.filter((a) => a.topic === activeTopic);

  const topicCountMap = topics.reduce<Record<string, number>>((acc, t) => {
    acc[t.topic] = t.count;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div>
        <h2 className="text-xl font-semibold text-navy">Global Crisis Monitor</h2>
        <p className="text-sm text-slate mt-1">
          Real-time intelligence from GDELT, curated for the Pakistan energy crisis
        </p>
        {topics.length > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {topics.map((t) => (
              <span
                key={t.topic}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  TOPIC_BADGE_COLORS[t.topic as Topic] ?? 'bg-slate/10 text-slate'
                }`}
              >
                {t.topic}
                <span className="font-mono">{t.count}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ---- Two-column layout ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ---- Left column: Live News Feed (60% = 3/5) ---- */}
        <div className="lg:col-span-3">
          <Card title="Live News Feed">
            {/* Topic filters */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <button
                onClick={() => setActiveTopic('All')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeTopic === 'All'
                    ? 'bg-navy text-white'
                    : 'bg-input-bg text-slate hover:text-navy'
                }`}
              >
                All
              </button>
              {TOPICS.map((topic) => (
                <button
                  key={topic}
                  onClick={() => setActiveTopic(topic)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    activeTopic === topic
                      ? 'bg-navy text-white'
                      : 'bg-input-bg text-slate hover:text-navy'
                  }`}
                >
                  {topic}
                  {topicCountMap[topic] != null && (
                    <span className="ml-1 font-mono text-[10px] opacity-70">
                      {topicCountMap[topic]}
                    </span>
                  )}
                </button>
              ))}
              <button
                onClick={fetchFeeds}
                disabled={loading}
                className="ml-auto px-3 py-1 rounded-full text-xs font-medium bg-input-bg text-slate hover:text-navy transition-colors disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {/* Error state */}
            {error && (
              <div className="text-sm text-red-muted bg-red-muted/10 rounded-lg p-3 mb-4">
                {error}
              </div>
            )}

            {/* Article list */}
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto space-y-2 pr-1">
              {loading && articles.length === 0
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                : filteredArticles.length === 0
                  ? (
                    <p className="text-sm text-slate py-8 text-center">
                      No articles found{activeTopic !== 'All' ? ` for ${activeTopic}` : ''}.
                    </p>
                  )
                  : filteredArticles.map((article, i) => (
                      <ArticleCard key={`${article.url}-${i}`} article={article} />
                    ))}
            </div>

            {/* Last updated */}
            {fetchedAt && (
              <p className="text-[10px] text-slate-light font-mono mt-3 pt-2 border-t border-border">
                Last updated: {formatTime(fetchedAt)}
              </p>
            )}
          </Card>
        </div>

        {/* ---- Right column: Strategic Chokepoint Status (40% = 2/5) ---- */}
        <div className="lg:col-span-2">
          <Card title="Strategic Chokepoint Status">
            <div className="space-y-3">
              {CHOKEPOINTS.map((cp) => (
                <ChokepointCard key={cp.name} cp={cp} />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
