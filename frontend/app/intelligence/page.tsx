'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import StockChart from '../../components/StockChart';
import DetailModal from '../../components/DetailModal';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://portai-xsw3.onrender.com';

interface Analysis {
  summary: string;
  sentiment: string;
  key_insights: string[];
  risks: string[];
  recommendations: string[];
  data_sources?: string[];
  portfolio_score?: number;
}

interface NewsArticle {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  description: string;
}

interface TrendingStock {
  symbol: string;
  price: number;
  change: number;
  change_pct: number;
}

const SUGGESTED_QUERIES = [
  { label: '📈 Nifty Outlook', query: 'What is the short-term outlook for Nifty 50 based on current market conditions?' },
  { label: '🏦 Banking Sector', query: 'Analyze the Indian banking sector. Which bank stocks are worth buying today?' },
  { label: '💡 IT Sector', query: 'How is the IT sector performing? Give recommendations for TCS, Infosys, and Wipro.' },
  { label: '🛢 Energy Stocks', query: 'What is the outlook for energy and oil stocks like ONGC and Reliance Industries?' },
  { label: '💊 Pharma Pick', query: 'Which pharma stocks should I consider buying for long-term? Analyze Sun Pharma and Dr Reddy.' },
  { label: '📊 Mid-Cap Gems', query: 'Give me 3 high-potential mid-cap Indian stocks to watch right now and explain why.' },
  { label: '🌍 Global Impact', query: 'How are US Federal Reserve decisions and global macro trends impacting Indian equities?' },
  { label: '💰 Dividend Focus', query: 'Which Nifty 50 stocks offer the best dividend yield and are financially stable?' },
];

export default function IntelligencePage() {
  const [query, setQuery] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apisUsed, setApisUsed] = useState<string[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [trendingStocks, setTrendingStocks] = useState<TrendingStock[]>([]);
  const [history, setHistory] = useState<{ query: string; analysis: Analysis }[]>([]);
  const [activeTab, setActiveTab] = useState<'analyst' | 'news' | 'trending'>('analyst');
  const [marketHistory, setMarketHistory] = useState<Record<string, any[]>>({});
  const [analysisSymbol, setAnalysisSymbol] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'stock' | 'news'>('stock');
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    fetchNews();
    fetchTrendingStocks();

    // Load cached history
    const cached = sessionStorage.getItem('intelligence_history');
    if (cached) {
      try { setHistory(JSON.parse(cached)); } catch(e) {}
    }

    // Load cached analysis if redirected from portfolios
    const cachedAnalysis = sessionStorage.getItem('cached_analysis');
    if (cachedAnalysis) {
      try {
        const parsed = JSON.parse(cachedAnalysis);
        setAnalysis(parsed.analysis);
        if (parsed.apis_used) setApisUsed(parsed.apis_used);
        sessionStorage.removeItem('cached_analysis');
      } catch (e) {}
    }
  }, []);

  const fetchNews = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/news`);
      const d = await r.json();
      setNews(d.articles || d || []);
    } catch (e) {}
  };

  const fetchTrendingStocks = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/trending`);
      const d = await r.json();
      const stocks = Array.isArray(d) ? d : d.stocks || [];
      setTrendingStocks(stocks);
      // Fetch history for top 6 trending stocks
      stocks.slice(0, 6).forEach((s: any) => fetchHistory(s.symbol));
    } catch (e) {}
  };

  const fetchHistory = async (symbol: string) => {
    try {
      const r = await fetch(`${API_BASE}/api/history/${encodeURIComponent(symbol)}?period=1mo`);
      const d = await r.json();
      if (d.history) {
        setMarketHistory(prev => ({ ...prev, [symbol]: d.history }));
      }
    } catch (err) {}
  };

  const runAnalysis = async (q?: string) => {
    const finalQuery = q || query;
    if (!finalQuery.trim()) return;
    if (q) setQuery(q);
    setLoading(true); setError(''); setAnalysis(null); setApisUsed([]); setAnalysisSymbol(null);
    try {
      // Try to extract symbol from query (e.g. "Analyze TCS" -> "TCS")
      const symbolMatch = finalQuery.match(/\b[A-Z]{2,10}\b/);
      const symbol = symbolMatch ? symbolMatch[0] : null;
      if (symbol) {
        setAnalysisSymbol(symbol);
        fetchHistory(symbol);
      }

      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: finalQuery, context: '' }),
      });
      const data = await res.json();
      setAnalysis(data.analysis);
      setApisUsed(data.apis_used || []);

      // Save to session history
      if (data.analysis) {
        const newEntry = { query: finalQuery, analysis: data.analysis };
        const updated = [newEntry, ...history].slice(0, 10);
        setHistory(updated);
        sessionStorage.setItem('intelligence_history', JSON.stringify(updated));
      }
    } catch {
      setError('The AI engine is syncing. Please refresh in 10 seconds.');
    } finally { setLoading(false); }
  };

  const openStockModal = (sym: string, currentData: any = {}) => {
    setSelectedItem({ ...currentData, symbol: sym });
    setModalType('stock');
    setModalOpen(true);
    if (!marketHistory[sym]) fetchHistory(sym);
  };

  const openNewsModal = (article: NewsArticle) => {
    setSelectedItem(article);
    setModalType('news');
    setModalOpen(true);
  };

  const sentimentColor = (s: string) => s === 'Bullish' ? 'text-emerald-400' : s === 'Bearish' ? 'text-red-400' : 'text-blue-400';
  const sentimentBg = (s: string) => s === 'Bullish' ? 'bg-emerald-500/10 border-emerald-500/20' : s === 'Bearish' ? 'bg-red-500/10 border-red-500/20' : 'bg-blue-500/10 border-blue-500/20';

  return (
    <main className="min-h-screen w-full relative z-10">
      {/* Page Header */}
      <div className="pt-24 pb-8 border-b border-white/5 bg-black/30">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] tracking-wide text-blue-400 mb-4">
              <iconify-icon icon="solar:magic-stick-3-linear"></iconify-icon>
              INTELLIGENCE HUB
            </div>
            <h1 className="text-3xl font-medium tracking-tight text-white">AI Financial Intelligence</h1>
            <p className="text-white/50 text-sm mt-1">Hedge-fund quality analysis. Powered by live Indian market data.</p>
          </div>
          <Link href="/portfolios" className="hidden md:flex items-center gap-2 text-xs text-white/40 hover:text-white transition-colors border border-white/10 px-4 py-2 rounded-xl hover:bg-white/5">
            <iconify-icon icon="solar:wallet-2-linear"></iconify-icon> Manage Portfolios
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── Left: AI Analyst ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
              {(['analyst', 'news', 'trending'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-xs font-medium capitalize transition-all ${activeTab === tab ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}>
                  {tab === 'analyst' ? '🤖 AI Analyst' : tab === 'news' ? '📰 News Feed' : '🔥 Trending'}
                </button>
              ))}
            </div>

            {/* Tab: AI Analyst */}
            {activeTab === 'analyst' && (
              <div className="space-y-6">
                {/* Query Input */}
                <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 blur-3xl rounded-full pointer-events-none"></div>
                  <h2 className="text-xl font-medium tracking-tight text-white mb-1 relative z-10">Ask the AI Analyst</h2>
                  <p className="text-white/40 text-sm mb-4 relative z-10">Get institutional-grade insights on any Indian stock or market theme.</p>

                  <textarea value={query} onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) runAnalysis(); }}
                    rows={3} placeholder="e.g. Should I buy HDFC Bank at current levels? Analyze risk-reward..."
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 transition-colors resize-none relative z-10 mb-4"
                  />

                  <div className="flex gap-3 relative z-10">
                    <button onClick={() => runAnalysis()} disabled={loading || !query.trim()}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                          Analyzing...
                        </span>
                      ) : (<><iconify-icon icon="solar:magic-stick-3-linear"></iconify-icon> Get AI Analysis</>)}
                    </button>
                    {analysis && (
                      <button onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/10 text-white/50 text-sm hover:bg-white/5 transition-colors">
                        <iconify-icon icon="solar:printer-linear"></iconify-icon> Print
                      </button>
                    )}
                  </div>
                  {error && <div className="mt-3 text-xs text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20">{error}</div>}
                </div>

                {/* Quick Suggestions */}
                {!analysis && !loading && (
                  <div>
                    <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-3">Suggested Analyses</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {SUGGESTED_QUERIES.map((s) => (
                        <button key={s.label} onClick={() => runAnalysis(s.query)}
                          className="p-3 rounded-xl bg-white/5 border border-white/10 text-left hover:bg-white/10 hover:border-white/20 transition-all group">
                          <div className="text-xs text-white/70 font-medium group-hover:text-white transition-colors">{s.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Analysis Result */}
                {analysis && (
                  <div className="space-y-4 fade-up">
                    {/* Data sources */}
                    {apisUsed.length > 0 && (
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-[10px] text-white/30 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span> Aggregated Via
                        </span>
                        {apisUsed.map(api => (
                          <span key={api} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50">{api}</span>
                        ))}
                      </div>
                    )}

                    {/* Summary Card */}
                    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-white">AI Analysis Summary</h3>
                        <span className={`px-3 py-1 rounded-full text-[11px] font-medium border ${sentimentBg(analysis.sentiment)} ${sentimentColor(analysis.sentiment)}`}>
                          {analysis.sentiment} Signal
                        </span>
                      </div>
                      {analysis.portfolio_score !== undefined && (
                        <div className="flex items-center gap-3 mb-4">
                          <div className="text-xs text-white/40">Portfolio Score</div>
                          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all" style={{width: `${analysis.portfolio_score}%`}}></div>
                          </div>
                          <div className="text-xs font-semibold text-white">{analysis.portfolio_score}/100</div>
                        </div>
                      )}
                      
                      {analysisSymbol && marketHistory[analysisSymbol] && (
                        <div className="mb-6 p-4 rounded-xl bg-black/40 border border-white/5">
                           <div className="flex items-center justify-between mb-3">
                              <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Technical Chart: {analysisSymbol}</span>
                              <span className="text-[10px] text-blue-400 font-medium">1 Month Trend</span>
                           </div>
                           <div className="h-32 w-full">
                              <StockChart data={marketHistory[analysisSymbol]} height={128} color="#3b82f6" />
                           </div>
                        </div>
                      )}

                      <p className="text-sm text-white/80 leading-relaxed">{analysis.summary}</p>
                    </div>

                    {/* Insights + Risks */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="glass-panel rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                            <iconify-icon icon="solar:lightbulb-linear" width="18"></iconify-icon>
                          </div>
                          <h3 className="text-sm font-medium text-white">Key Insights</h3>
                        </div>
                        <ul className="space-y-2">
                          {analysis.key_insights?.map((ins, i) => (
                            <li key={i} className="flex gap-2 text-xs text-white/60 leading-relaxed">
                              <iconify-icon icon="solar:check-circle-linear" className="text-emerald-400 flex-shrink-0 mt-0.5"></iconify-icon>
                              {ins}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="glass-panel rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                            <iconify-icon icon="solar:danger-triangle-linear" width="18"></iconify-icon>
                          </div>
                          <h3 className="text-sm font-medium text-white">Risk Factors</h3>
                        </div>
                        <ul className="space-y-2">
                          {analysis.risks?.map((r, i) => (
                            <li key={i} className="flex gap-2 text-xs text-white/60 leading-relaxed">
                              <iconify-icon icon="solar:close-circle-linear" className="text-red-400 flex-shrink-0 mt-0.5"></iconify-icon>
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div className="glass-panel rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                          <iconify-icon icon="solar:target-linear" width="18"></iconify-icon>
                        </div>
                        <h3 className="text-sm font-medium text-white">Recommended Actions</h3>
                      </div>
                      <div className="space-y-2">
                        {analysis.recommendations?.map((rec, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-black/40 border border-white/5">
                            <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0">{i+1}</div>
                            <div className="text-xs text-white/70">{rec}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* New Query */}
                    <button onClick={() => { setAnalysis(null); setQuery(''); }}
                      className="w-full py-2.5 rounded-xl border border-white/10 text-white/40 text-xs hover:text-white hover:bg-white/5 transition-all">
                      ↺ Ask Another Question
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab: News Feed */}
            {activeTab === 'news' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-white">Latest Financial News</h2>
                  <button onClick={fetchNews} className="text-[10px] px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all">
                    ↻ Refresh
                  </button>
                </div>
                <div className="space-y-3">
                  {news.length > 0 ? news.map((a, i) => (
                    <button 
                      key={i} 
                      onClick={() => openNewsModal(a)}
                      className="w-full text-left flex gap-4 p-4 glass-panel rounded-xl hover:bg-white/[0.04] transition-all group border border-transparent hover:border-white/10 cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium">{a.source}</span>
                          {a.publishedAt && <span className="text-[9px] text-white/30">{new Date(a.publishedAt).toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit'})}</span>}
                        </div>
                        <h3 className="text-sm text-white font-medium leading-snug group-hover:text-blue-400 transition-colors mb-1">{a.title}</h3>
                        {a.description && <p className="text-[11px] text-white/40 leading-relaxed line-clamp-2">{a.description}</p>}
                      </div>
                      <iconify-icon icon="solar:eye-linear" className="text-white/20 group-hover:text-blue-400 transition-colors flex-shrink-0 mt-1"></iconify-icon>
                    </button>
                  )) : Array.from({length: 6}).map((_, i) => (
                    <div key={i} className="p-4 glass-panel rounded-xl animate-pulse">
                      <div className="h-3 w-20 bg-white/5 rounded mb-3"></div>
                      <div className="h-4 w-full bg-white/5 rounded mb-2"></div>
                      <div className="h-3 w-3/4 bg-white/5 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Trending */}
            {activeTab === 'trending' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-white">Trending NSE Stocks</h2>
                  <button onClick={fetchTrendingStocks} className="text-[10px] px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all">
                    ↻ Refresh
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trendingStocks.length > 0 ? trendingStocks.map((stock) => (
                    <button key={stock.symbol} onClick={() => openStockModal(stock.symbol, stock)}
                      className="glass-panel rounded-xl p-5 text-left hover:bg-white/[0.04] transition-all cursor-pointer group border border-white/5 hover:border-blue-500/20">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="text-xs font-semibold text-white tracking-tight">{stock.symbol}</span>
                          <div className="text-lg font-medium text-white">₹{stock.price?.toLocaleString('en-IN')}</div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold ${stock.change_pct >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {stock.change_pct >= 0 ? '+' : ''}{stock.change_pct}%
                        </span>
                      </div>

                      {/* Miniature Chart in Intelligence Hub */}
                      <div className="h-10 w-full mb-3 opacity-60 group-hover:opacity-100 transition-opacity">
                         {marketHistory[stock.symbol] ? (
                            <StockChart 
                              data={marketHistory[stock.symbol]} 
                              color={stock.change_pct >= 0 ? '#10b981' : '#f43f5e'} 
                              height={40} 
                            />
                         ) : (
                           <div className="h-full w-full flex items-end gap-1 px-1">
                              {[...Array(12)].map((_, i) => (
                                <div key={i} className="flex-1 bg-white/5 rounded-t-sm" style={{ height: `${20 + Math.random() * 80}%` }}></div>
                              ))}
                           </div>
                         )}
                      </div>

                      <div className="flex items-center justify-between">
                         <div className="text-[10px] text-white/30 group-hover:text-blue-400 transition-colors flex items-center gap-1">
                           <iconify-icon icon="solar:chart-2-linear"></iconify-icon>
                           Full Chart →
                         </div>
                         <button 
                           onClick={(e) => { e.stopPropagation(); setActiveTab('analyst'); runAnalysis(`Analyze ${stock.symbol} stock. Should I buy it today?`); }} 
                           className="px-2 py-1 rounded bg-blue-600/20 text-blue-400 text-[10px] font-bold hover:bg-blue-600 hover:text-white transition-all"
                         >
                           AI Analyst
                         </button>
                      </div>
                    </button>
                  )) : Array.from({length: 6}).map((_, i) => (
                    <div key={i} className="glass-panel rounded-xl p-4 animate-pulse">
                      <div className="h-3 w-16 bg-white/5 rounded mb-3"></div>
                      <div className="h-5 w-20 bg-white/5 rounded mb-2"></div>
                      <div className="h-3 w-12 bg-white/5 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right Sidebar ── */}
          <div className="space-y-5">

            {/* Analysis History */}
            {history.length > 0 && (
              <div className="glass-panel rounded-2xl p-5">
                <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                  <iconify-icon icon="solar:clock-circle-linear" className="text-white/30"></iconify-icon>
                  Recent Analyses
                </h3>
                <div className="space-y-2">
                  {history.slice(0, 5).map((item, i) => (
                    <button key={i} onClick={() => { setQuery(item.query); setAnalysis(item.analysis); setActiveTab('analyst'); }}
                      className="w-full text-left p-3 rounded-xl bg-black/40 border border-white/5 hover:border-white/15 transition-all group">
                      <div className="text-xs text-white/70 line-clamp-2 group-hover:text-white transition-colors">{item.query}</div>
                      <div className={`text-[10px] mt-1 font-medium ${item.analysis.sentiment === 'Bullish' ? 'text-emerald-400' : item.analysis.sentiment === 'Bearish' ? 'text-red-400' : 'text-blue-400'}`}>
                        {item.analysis.sentiment} Signal
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Suggestions Sidebar */}
            <div className="glass-panel rounded-2xl p-5">
              <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                <iconify-icon icon="solar:layers-minimalistic-linear" className="text-white/30"></iconify-icon>
                Quick Analyses
              </h3>
              <div className="space-y-2">
                {SUGGESTED_QUERIES.map((s) => (
                  <button key={s.label} onClick={() => { setActiveTab('analyst'); runAnalysis(s.query); }}
                    className="w-full text-left p-3 rounded-xl bg-black/40 border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group">
                    <div className="text-xs text-white/60 group-hover:text-white transition-colors">{s.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Live News Snapshot (Sidebar) */}
            {news.length > 0 && (
              <div className="glass-panel rounded-2xl p-5">
                <h3 className="text-sm font-medium text-white mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <iconify-icon icon="solar:document-text-linear" className="text-white/30"></iconify-icon> Top News
                  </span>
                  <button onClick={() => setActiveTab('news')} className="text-[10px] text-blue-400 hover:text-blue-300">See all →</button>
                </h3>
                <div className="space-y-3">
                  {news.slice(0, 4).map((a, i) => (
                    <button key={i} onClick={() => openNewsModal(a)}
                      className="w-full text-left group block">
                      <div className="text-xs text-white/70 leading-snug group-hover:text-blue-400 transition-colors line-clamp-2">{a.title}</div>
                      <div className="text-[9px] text-white/30 mt-1">{a.source}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <DetailModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        type={modalType} 
        data={selectedItem} 
        history={selectedItem ? marketHistory[selectedItem.symbol] : undefined}
      />
    </main>
  );
}
