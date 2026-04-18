'use client';

import React, { useState, useEffect, useRef } from 'react';
import createGlobe from 'cobe';
import StockChart from '../components/StockChart';
import DetailModal from '../components/DetailModal';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// ReactBits Components
import ShinyText from '../components/reactbits/ShinyText';
import GradientText from '../components/reactbits/GradientText';
import CountUp from '../components/reactbits/CountUp';
import SpotlightCard from '../components/reactbits/SpotlightCard';
import StarBorder from '../components/reactbits/StarBorder';
import Particles from '../components/reactbits/Particles';
import LogoLoop from '../components/reactbits/LogoLoop/LogoLoop';
import TargetCursor from '../components/reactbits/TargetCursor/TargetCursor';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://portai-xsw3.onrender.com';

interface Analysis {
  summary: string;
  sentiment: string;
  key_insights: string[];
  risks: string[];
  recommendations: string[];
  data_sources: string[];
}

interface MarketIndex { price: number; change: number; change_pct: number; }
interface NewsArticle { title: string; source: string; url: string; publishedAt: string; description: string; }
interface TrendingStock { symbol: string; price: number; change: number; change_pct: number; }

function AnimatedGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    let phi = 0;
    let width = 0;
    const onResize = () => {
      if (canvasRef.current) {
        width = canvasRef.current.offsetWidth;
      }
    }
    window.addEventListener('resize', onResize)
    onResize()

    if(!canvasRef.current) return;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.3,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 8000, // Optimized for performance
      mapBrightness: 6,
      baseColor: [0.3, 0.3, 0.3], 
      markerColor: [0.4, 0.6, 1], 
      glowColor: [0.1, 0.1, 0.2], 
      opacity: 0.8,
      markers: [
        { location: [20.5937, 78.9629], size: 0.1 }, // India
        { location: [37.7595, -122.4367], size: 0.06 }, // SF
        { location: [51.5074, -0.1278], size: 0.05 }, // London
        { location: [35.6762, 139.6503], size: 0.06 }, // Tokyo
        { location: [40.7128, -74.006], size: 0.04 }, // NY
      ],
      onRender: (state) => {
        state.phi = phi
        phi += 0.003
        // Handle resize within the render loop only if needed
        if (canvasRef.current && canvasRef.current.offsetWidth !== state.width / 2) {
          const newWidth = canvasRef.current.offsetWidth;
          state.width = newWidth * 2;
          state.height = newWidth * 2;
        }
      },
    });

    return () => {
      window.removeEventListener('resize', onResize);
      globe.destroy();
    }
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', aspectRatio: 1 }} className="transition-opacity duration-1000 opacity-90 relative z-10" />;
}

export default function Dashboard() {
  const [query, setQuery] = useState('');
  const router = useRouter();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [market, setMarket] = useState<Record<string, MarketIndex>>({});
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [trendingStocks, setTrendingStocks] = useState<TrendingStock[]>([]);
  const [apisUsed, setApisUsed] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [marketTime, setMarketTime] = useState('');
  const [brokerToken, setBrokerToken] = useState<string | null>(null);
  const [brokerHoldings, setBrokerHoldings] = useState<any[]>([]);
  const [marketHistory, setMarketHistory] = useState<Record<string, any[]>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'stock' | 'news'>('stock');
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    // Check for broker integration
    const token = localStorage.getItem('upstox_access_token');
    if (token) {
      setBrokerToken(token);
      fetchBrokerHoldings(token);
    }
    
    // Check for cached analysis from /portfolios page upload
    const cachedAnalysis = sessionStorage.getItem('cached_analysis');
    if (cachedAnalysis) {
      try {
        const parsed = JSON.parse(cachedAnalysis);
        setAnalysis(parsed.analysis);
        if (parsed.market) setMarket(parsed.market);
        if (parsed.apis_used) setApisUsed(parsed.apis_used);
        sessionStorage.removeItem('cached_analysis');
      } catch (e) {
        console.error("Failed to parse cached analysis", e);
      }
    }

    // Check for prefill from sectors page
    const prefill = sessionStorage.getItem('intelligence_prefill');
    if (prefill) {
      setQuery(prefill);
      sessionStorage.removeItem('intelligence_prefill');
    }

    fetchMarket();
    fetchNews();
    fetchTrendingStocks();
    fetchHistory('NIFTY 50');
    fetchHistory('SENSEX');
    
    // Auto-refresh market every 30 seconds, news every 2 minutes
    const interval = setInterval(() => {
      fetchMarket();
      fetchTrendingStocks();
    }, 30000);
    const newsInterval = setInterval(fetchNews, 120000);
    return () => {
      clearInterval(interval);
      clearInterval(newsInterval);
    };
  }, []);

  const fetchBrokerHoldings = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/broker/holdings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: token, broker: 'upstox' })
      });
      const data = await res.json();
      if (data.holdings) setBrokerHoldings(data.holdings);
    } catch (e) { console.error('Failed to fetch broker holdings', e); }
  };

  const fetchMarket = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/market`);
      const d = await r.json();
      setMarket(d.indices || {});
      setMarketTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) { console.error('Failed to fetch market data:', err); }
  };
  const fetchNews = async () => {
    try { const r = await fetch(`${API_BASE}/api/news`); const d = await r.json(); setNews(d.articles || []); } catch (err) { console.error('Failed to fetch news:', err); }
  };
  const fetchTrendingStocks = async () => {
    try { const r = await fetch(`${API_BASE}/api/trending-stocks`); const d = await r.json(); setTrendingStocks(d.stocks || []); } catch (err) { console.error('Failed to fetch trending stocks:', err); }
  };

  const fetchHistory = async (symbol: string) => {
    try {
      const r = await fetch(`${API_BASE}/api/history/${encodeURIComponent(symbol)}?period=1mo`);
      const d = await r.json();
      if (d.history) {
        setMarketHistory(prev => ({ ...prev, [symbol]: d.history }));
      }
    } catch (err) { console.error(`Failed to fetch history for ${symbol}:`, err); }
  };

  const runAnalysis = async () => {
    if (!query.trim()) return;
    setLoading(true); setError(''); setAnalysis(null); setApisUsed([]);
    
    let ctx = '';
    if (brokerHoldings.length > 0) {
      ctx = `User Strategy/Portfolio Holdings from Upstox Broker Integration:\n${JSON.stringify(brokerHoldings, null, 2)}`;
    }

    try {
      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, context: ctx }),
      });
      const data = await res.json();
      setAnalysis(data.analysis);
      setMarket(data.market || market);
      setApisUsed(data.apis_used || []);
    } catch {
      setError('The AI engine is syncing. Please refresh in 10 seconds.');
    } finally { setLoading(false); }
  };

  const openStockModal = (sym: string, currentData: any) => {
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
    <main className="w-full h-full relative z-10">
      <TargetCursor 
        spinDuration={2}
        hideDefaultCursor={true}
        parallaxOn={true}
        targetSelector=".cursor-target"
      />

      {/* Hero Section with Globe + Particles Background */}
      <section className="overflow-hidden pt-32 pb-20 relative border-b border-white/5 bg-black/50">
          {/* Particles Background */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
            <Particles
              particleCount={120}
              particleSpread={15}
              speed={0.08}
              particleColors={['#4f8fff', '#a78bfa', '#34d399', '#60a5fa']}
              alphaParticles={true}
              particleBaseSize={80}
              sizeRandomness={0.8}
              cameraDistance={25}
              className="w-full h-full"
            />
          </div>

          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center relative z-10">
              
              {/* Hero Content */}
              <div className="z-10 relative">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] tracking-wide mb-6">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                      <ShinyText text="SMART AI-POWERED INSIGHTS" speed={3} color="#60a5fa" shineColor="#ffffff" className="text-[10px] tracking-wide font-medium" />
                  </div>
                  <h1 className="text-5xl md:text-7xl font-medium tracking-tighter leading-[1.1] mb-6">
                      Your personal <br/>
                      <GradientText colors={['#4f8fff', '#a78bfa', '#34d399', '#4f8fff']} animationSpeed={5} className="inline-flex text-5xl md:text-7xl font-medium tracking-tighter">
                        AI financial analyst.
                      </GradientText>
                  </h1>
                  <p className="text-white/60 text-lg md:text-xl font-light mb-8 max-w-md leading-relaxed">
                      Understand the Indian stock market with ease. Get clear, real-time insights, breaking news, and simple AI-powered analysis for your portfolio.
                  </p>
                  
                  {/* Live Status Indicator */}
                  <div className="flex items-center gap-4 mb-8">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span className="text-[11px] text-emerald-400 font-medium">All Systems Operational</span>
                      </div>
                      <div className="text-xs text-white/40">
                          <ShinyText text="5+ Live Data Sources" speed={4} color="#9ca3af" shineColor="#e5e7eb" className="text-xs" />
                      </div>
                  </div>
              </div>

              {/* 3D Globe Visualization */}
              <div className="relative h-[400px] w-full flex items-center justify-center">
                  <SpotlightCard className="relative w-full aspect-square max-w-md rounded-3xl shadow-2xl flex items-center justify-center glass-panel" spotlightColor="rgba(79, 143, 255, 0.15)">
                      <AnimatedGlobe />
                      
                      {/* Floating UI on Globe */}
                      <div className="absolute top-6 left-6 z-20 pointer-events-none">
                          <div className="flex items-center gap-2 mb-1">
                              <iconify-icon icon="solar:globe-linear" className="text-blue-400"></iconify-icon>
                              <span className="text-xs font-medium text-white tracking-wide">GLOBAL NETWORK</span>
                          </div>
                          <div className="text-[10px] text-white/50">AI models and data aggregated globally</div>
                      </div>

                      <div className="absolute bottom-6 left-6 right-6 z-20 pointer-events-none">
                          <div className="bg-black/60 backdrop-blur-md rounded-xl p-3 border border-white/10 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                      <iconify-icon icon="solar:chart-2-linear"></iconify-icon>
                                  </div>
                                  <div>
                                      <div className="text-xs text-white">NIFTY 50</div>
                                      <div className="text-[10px] text-white/50">Analyst Model Executing...</div>
                                  </div>
                              </div>
                              <span className="text-xs text-emerald-400 font-medium">+ LIVE</span>
                          </div>
                      </div>
                  </SpotlightCard>
                  
                  {/* Background Glow */}
                  <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none"></div>
              </div>
          </div>
      </section>

      {/* ── Trending Indices (Live) ─────────────────── */}
      <section id="markets" className="border-b border-white/5 bg-white/[0.02]">
          <div className="max-w-7xl mx-auto px-6 py-8">
              <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                          <iconify-icon icon="solar:graph-up-linear" width="22"></iconify-icon>
                      </div>
                      <div>
                          <h2 className="text-lg font-medium text-white tracking-tight">Live Market Indices</h2>
                          <p className="text-[10px] text-white/40">Auto-refreshes every 30s</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                      <span className="text-emerald-400 text-xs font-medium flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Live • {marketTime || '--:--:--'}
                      </span>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(market).length > 0 ? Object.entries(market).map(([name, data]) => (
                      <SpotlightCard
                        key={name}
                        className="rounded-xl glass-panel border border-white/5 hover:border-white/10 cursor-pointer"
                        spotlightColor={data.change_pct >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)'}
                      >
                      <button 
                        onClick={() => openStockModal(name, data)}
                        className="text-left p-5 hover:bg-white/[0.04] transition-all group w-full"
                      >
                          <div className="flex justify-between items-start mb-4 text-left">
                            <div>
                                <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1 font-medium">{name}</div>
                                <div className="text-xl font-medium text-white tracking-tight">₹{data.price?.toLocaleString('en-IN')}</div>
                            </div>
                            <div className={`text-[10px] font-bold px-2 py-0.5 rounded ${data.change_pct >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                              {data.change_pct >= 0 ? '+' : ''}{data.change_pct?.toFixed(2)}%
                            </div>
                          </div>
                          
                          {/* Miniature Chart */}
                          <div className="h-10 w-full mt-2 opacity-80 group-hover:opacity-100 transition-opacity">
                            {marketHistory[name] ? (
                              <StockChart 
                                data={marketHistory[name]} 
                                color={data.change_pct >= 0 ? '#10b981' : '#f43f5e'} 
                                height={40} 
                                label={name}
                              />
                            ) : (
                              <div className="h-full w-full flex items-end gap-1 px-1 opacity-20">
                                {[...Array(15)].map((_, i) => (
                                  <div key={i} className="flex-1 bg-white/20 rounded-t-sm" style={{ height: `${20 + Math.random() * 80}%` }}></div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-[9px] text-white/20 group-hover:text-blue-400 transition-colors uppercase tracking-widest font-bold mt-3 flex items-center gap-1">
                            Analyze details <iconify-icon icon="solar:arrow-right-linear"></iconify-icon>
                          </div>
                      </button>
                      </SpotlightCard>
                  )) : (
                      Array.from({length: 5}).map((_, i) => (
                          <div key={i} className="glass-panel rounded-xl p-4 animate-pulse">
                              <div className="h-3 w-20 bg-white/5 rounded mb-3"></div>
                              <div className="h-6 w-24 bg-white/5 rounded mb-2"></div>
                              <div className="h-4 w-16 bg-white/5 rounded"></div>
                          </div>
                      ))
                  )}
              </div>
          </div>
      </section>

      {/* ── Trending Stocks Today ─────────────────── */}
      <section className="border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 py-8">
              <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                          <iconify-icon icon="solar:fire-linear" width="22"></iconify-icon>
                      </div>
                      <div>
                          <h2 className="text-lg font-medium text-white tracking-tight">Top Stocks Today</h2>
                          <p className="text-[10px] text-white/40">Popular NSE stocks • Updated live</p>
                      </div>
                  </div>
                  <button onClick={fetchTrendingStocks} className="text-[10px] px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all">
                      ↻ Refresh
                  </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {trendingStocks.length > 0 ? trendingStocks.map((stock) => (
                      <SpotlightCard
                        key={stock.symbol}
                        className="rounded-xl glass-panel border border-transparent hover:border-white/10 cursor-pointer"
                        spotlightColor={stock.change_pct >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)'}
                      >
                      <div 
                        onClick={() => openStockModal(stock.symbol, stock)}
                        className="p-4 hover:bg-white/[0.04] transition-all group"
                      >
                          <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-white tracking-tight">{stock.symbol}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${stock.change_pct >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                  {stock.change_pct >= 0 ? '▲' : '▼'} {Math.abs(stock.change_pct)}%
                              </span>
                          </div>
                          <div className="text-lg font-medium text-white">₹{stock.price?.toLocaleString('en-IN')}</div>
                          <div className={`text-[10px] mt-1 ${stock.change >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                              {stock.change >= 0 ? '+' : ''}{stock.change?.toFixed(2)}
                          </div>
                      </div>
                      </SpotlightCard>
                  )) : (
                      Array.from({length: 5}).map((_, i) => (
                          <div key={i} className="glass-panel rounded-xl p-4 animate-pulse">
                              <div className="h-3 w-16 bg-white/5 rounded mb-3"></div>
                              <div className="h-5 w-20 bg-white/5 rounded mb-2"></div>
                              <div className="h-3 w-12 bg-white/5 rounded"></div>
                          </div>
                      ))
                  )}
              </div>
          </div>
      </section>

      {/* ── Market-Moving Headlines ─────────────────── */}
      <section className="border-b border-white/5 bg-white/[0.01]">
          <div className="max-w-7xl mx-auto px-6 py-8">
              <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                          <iconify-icon icon="solar:document-text-linear" width="22"></iconify-icon>
                      </div>
                      <div>
                          <h2 className="text-lg font-medium text-white tracking-tight">Latest Financial News</h2>
                          <p className="text-[10px] text-white/40">Updates from the Indian business landscape</p>
                      </div>
                  </div>
                  <button onClick={fetchNews} className="text-[10px] px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all">
                      ↻ Refresh
                  </button>
              </div>
              {/* Headline Tape - Horizontal Scroll */}
              <div className="overflow-x-auto scrollbar-hide pb-2">
                  <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
                      {news.length > 0 ? news.slice(0, 24).map((a, i) => (
                          <a key={i} href={a.url} target="_blank" rel="noreferrer" className="flex-shrink-0 w-[320px] glass-panel rounded-xl p-5 hover:bg-white/[0.04] transition-all group border border-transparent hover:border-white/10">
                              <div className="flex items-center gap-2 mb-3">
                                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">{a.source}</span>
                                  {a.publishedAt && <span className="text-[9px] text-white/30">{new Date(a.publishedAt).toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit'})}</span>}
                              </div>
                              <h3 className="text-sm text-white font-medium leading-snug group-hover:text-blue-400 transition-colors mb-2">{a.title}</h3>
                              {a.description && <p className="text-[11px] text-white/40 leading-relaxed line-clamp-2">{a.description}</p>}
                          </a>
                      )) : (
                          Array.from({length: 4}).map((_, i) => (
                              <div key={i} className="flex-shrink-0 w-[320px] glass-panel rounded-xl p-5 animate-pulse">
                                  <div className="h-3 w-16 bg-white/5 rounded mb-4"></div>
                                  <div className="h-4 w-full bg-white/5 rounded mb-2"></div>
                                  <div className="h-4 w-3/4 bg-white/5 rounded mb-3"></div>
                                  <div className="h-3 w-full bg-white/5 rounded"></div>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      </section>

      {/* Powered By LogoLoop Section */}
      <section className="border-b border-white/5 py-12 overflow-hidden bg-black flex justify-center flex-col items-center">
        <h3 className="text-white/40 text-sm font-medium mb-8 tracking-widest uppercase cursor-target">Trusted By The Fintech Ecosystem</h3>
        <div style={{ height: '80px', width: '100%', position: 'relative' }} className="cursor-target">
            <LogoLoop
                logos={[
                    { title: "NSE",        node: <span className="text-2xl font-bold text-white/70">NSE</span>,          href: "#" },
                    { title: "BSE",        node: <span className="text-2xl font-bold text-white/70">BSE</span>,          href: "#" },
                    { title: "SEBI",       node: <span className="text-2xl font-bold text-white/70">SEBI</span>,         href: "#" },
                    { title: "RBI",        node: <span className="text-2xl font-bold text-white/70">RBI</span>,          href: "#" },
                    { title: "Zerodha",    node: <span className="text-2xl font-bold text-white/70">Zerodha</span>,      href: "#" },
                    { title: "Upstox",     node: <span className="text-2xl font-bold text-white/70">Upstox</span>,       href: "#" },
                    { title: "Angel One",  node: <span className="text-2xl font-bold text-white/70">Angel One</span>,   href: "#" },
                    { title: "HDFC Bank",  node: <span className="text-2xl font-bold text-white/70">HDFC&nbsp;Bank</span>, href: "#" },
                    { title: "ICICI",      node: <span className="text-2xl font-bold text-white/70">ICICI</span>,        href: "#" },
                    { title: "Nifty 50",   node: <span className="text-2xl font-bold text-white/70">Nifty&nbsp;50</span>, href: "#" },
                    { title: "Bloomberg",  node: <span className="text-2xl font-bold text-white/70">Bloomberg</span>,   href: "#" },
                    { title: "Reuters",    node: <span className="text-2xl font-bold text-white/70">Reuters</span>,     href: "#" },
                ]}
                speed={40}
                direction="left"
                logoHeight={40}
                gap={60}
                hoverSpeed={0}
                scaleOnHover
                fadeOut
                fadeOutColor="#000000"
                ariaLabel="Fintech partners"
            />
        </div>
      </section>

      {/* Stats Section with CountUp */}
      <section id="sectors" className="border-b border-white/5 bg-white/[0.02]">
          <div className="max-w-7xl mx-auto px-6 py-12">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  <SpotlightCard className="rounded-xl p-4" spotlightColor="rgba(79, 143, 255, 0.08)">
                      <div className="text-3xl font-medium tracking-tight text-white mb-1 flex items-baseline gap-1">
                        <span className="text-blue-400">&lt;</span>
                        <CountUp to={3} duration={2} className="text-3xl font-medium tracking-tight text-white" />
                        <span className="text-blue-400">s</span>
                      </div>
                      <div className="text-xs text-white/40">Lightning Fast Reports</div>
                  </SpotlightCard>
                  <SpotlightCard className="rounded-xl p-4" spotlightColor="rgba(167, 139, 250, 0.08)">
                      <div className="text-3xl font-medium tracking-tight text-white mb-1 flex items-baseline gap-1">
                        <CountUp to={5} duration={2} className="text-3xl font-medium tracking-tight text-white" />
                        <span className="text-purple-400">+</span>
                      </div>
                      <div className="text-xs text-white/40">Live Data Sources</div>
                  </SpotlightCard>
                  <SpotlightCard className="rounded-xl p-4" spotlightColor="rgba(52, 211, 153, 0.08)">
                      <div className="text-3xl font-medium tracking-tight text-white mb-1 flex items-baseline gap-1">
                        <CountUp to={99} duration={2.5} className="text-3xl font-medium tracking-tight text-white" />
                        <span className="text-emerald-400">%</span>
                      </div>
                      <div className="text-xs text-white/40">AI-Powered Accuracy</div>
                  </SpotlightCard>
                  <SpotlightCard className="rounded-xl p-4" spotlightColor="rgba(251, 191, 36, 0.08)">
                      <div className="text-3xl font-medium tracking-tight text-white mb-1 flex items-baseline gap-1">
                        <CountUp to={24} duration={2} className="text-3xl font-medium tracking-tight text-white" />
                        <span className="text-amber-400">/7</span>
                      </div>
                      <div className="text-xs text-white/40">Always-On Monitoring</div>
                  </SpotlightCard>
              </div>
          </div>
      </section>

      <div id="intelligence" className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main Panel ─────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Input */}
          <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 blur-3xl rounded-full"></div>
            <h2 className="text-2xl font-medium tracking-tight text-white mb-1 relative z-10">AI Portfolio Analyst</h2>
            <p className="text-white/60 text-sm mb-5 relative z-10 max-w-xl">Ask anything about your investments. PortAI uses real-time market data to provide clear, actionable advice tailored to your needs.</p>

            <textarea value={query} onChange={(e) => setQuery(e.target.value)} rows={4}
              placeholder="e.g. Is it a good time to buy Tata Motors for long term holding?"
              className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 transition-colors resize-none relative z-10"
            />

            <div className="flex flex-col sm:flex-row gap-3 mt-4 relative z-10">
              <StarBorder
                as="button"
                onClick={runAnalysis}
                disabled={loading || !query.trim()}
                color="#4f8fff"
                speed="4s"
                className={`flex-1 ${loading || !query.trim() ? 'opacity-30 cursor-not-allowed' : 'active:scale-95'}`}
              >
                <span className="flex items-center justify-center gap-2">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Processing Intelligence...
                  </span>
                ) : (<><iconify-icon icon="solar:stars-minimalistic-bold" width="18"></iconify-icon> Start Analysis</>)}
                </span>
              </StarBorder>
              <button onClick={() => setQuery('')}
                className="px-6 py-3 rounded-xl border border-white/10 text-white/40 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium">
                Clear
              </button>
            </div>

            {error && <div className="mt-3 text-xs text-red-400 relative z-10 bg-red-500/10 p-2 rounded-lg border border-red-500/20">{error}</div>}
          </div>

          {/* Analysis Result */}
          {analysis && (
            <div className="space-y-5 fade-up">
              {/* APIs used banner */}
              {apisUsed.length > 0 && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                    Aggregated Via
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {apisUsed.map(api => (
                      <span key={api} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60">{api}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="glass-panel rounded-2xl p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <iconify-icon icon="solar:document-text-linear" style={{fontSize: "120px"}}></iconify-icon>
                </div>
                <div className="flex items-start justify-between mb-4 relative z-10">
                  <h3 className="text-xl font-medium tracking-tight text-white">AI Analysis Summary</h3>
                  <div className="flex gap-2">
                    <button onClick={() => window.print()} className="px-3 py-1 flex items-center gap-1 hover:bg-white/10 transition-colors rounded-lg text-white/50 text-xs">
                        <iconify-icon icon="solar:printer-linear"></iconify-icon> Print Report
                    </button>
                    <span className={`px-3 py-1 rounded-full text-[11px] font-medium border shadow-lg ${sentimentBg(analysis.sentiment)} ${sentimentColor(analysis.sentiment)}`}>
                        {analysis.sentiment} Signal
                    </span>
                  </div>
                </div>
                <p className="text-sm text-white/80 leading-relaxed relative z-10">{analysis.summary}</p>
              </div>

              {/* Insights + Risks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="glass-panel hover:bg-white/[0.04] transition-colors rounded-2xl p-6">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4">
                      <iconify-icon icon="solar:lightbulb-linear" width="24"></iconify-icon>
                  </div>
                  <h3 className="text-sm font-medium text-white mb-2">Important Insights</h3>
                  <ul className="space-y-3 mt-4">
                    {analysis.key_insights?.map((ins, i) => (
                      <li key={i} className="flex gap-3 text-sm text-white/50 leading-relaxed">
                        <span className="text-emerald-400 mt-0.5 shrink-0"><iconify-icon icon="solar:check-circle-linear"></iconify-icon></span>
                        {ins}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="glass-panel hover:bg-white/[0.04] transition-colors rounded-2xl p-6">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 mb-4">
                      <iconify-icon icon="solar:danger-triangle-linear" width="24"></iconify-icon>
                  </div>
                  <h3 className="text-sm font-medium text-white mb-2">Potential Risks</h3>
                  <ul className="space-y-3 mt-4">
                    {analysis.risks?.map((r, i) => (
                      <li key={i} className="flex gap-3 text-sm text-white/50 leading-relaxed">
                        <span className="text-red-400 mt-0.5 shrink-0"><iconify-icon icon="solar:close-circle-linear"></iconify-icon></span>
                        {r}
                      </li>
                    ))}
                    {(!analysis.risks || analysis.risks.length === 0) && <li className="text-sm text-white/30 italic">No risks identified.</li>}
                  </ul>
                </div>
              </div>

              {/* Recommendations */}
              <div className="glass-panel bg-gradient-to-br from-blue-500/5 to-transparent rounded-2xl p-6 relative overflow-hidden group">
                <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                        <iconify-icon icon="solar:target-linear" width="20"></iconify-icon>
                    </div>
                    <h3 className="text-sm font-medium text-white">Recommended Actions</h3>
                </div>
                <div className="space-y-3 relative z-10">
                  {analysis.recommendations?.map((rec, i) => (
                    <div key={i} className="flex items-start gap-4 p-3 rounded-xl bg-black/40 border border-white/5">
                        <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-xs font-medium text-white flex-shrink-0">{i+1}</div>
                        <div className="text-sm text-white/70">{rec}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!analysis && !loading && (
            <div className="glass-panel rounded-2xl p-16 text-center shadow-2xl">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/5 mb-6 shadow-inner border border-white/10">
                <iconify-icon icon="solar:chart-square-linear" width="40" className="text-white/40"></iconify-icon>
              </div>
              <h3 className="text-xl font-medium tracking-tight text-white mb-2">Awaiting Your Question</h3>
              <p className="text-sm text-white/40 max-w-sm mx-auto mb-8">
                Initiate an analysis of Indian stocks or portfolios to see your custom report here.
              </p>

              {/* Example Queries */}
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  'Analyze TCS vs Infosys for long term',
                  'Impact of RBI rate cut on HDFC Bank',
                  'Is Nifty 50 overvalued right now?',
                ].map((q) => (
                  <button key={q} onClick={() => setQuery(q)}
                    className="text-[11px] px-4 py-2 rounded-full border border-white/10 bg-black/40 text-white/60 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ─────────────────────── */}
        <div className="space-y-6">
          
          {/* Market Ticker Sidebar Variant */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-sm font-medium text-white flex justify-between items-center mb-4">
              Market Overview
              <iconify-icon icon="solar:graph-up-linear" className="text-white/40"></iconify-icon>
            </h3>
            <div className="space-y-3">
              {Object.entries(market).map(([name, data]) => (
                <div key={name} className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 hover:border-white/20 transition-colors">
                  <div className="text-xs font-medium text-white/80">{name}</div>
                  <div className="text-right">
                    <div className="text-sm text-white font-medium">₹{data.price?.toLocaleString('en-IN')}</div>
                    <div className={`text-[10px] ${data.change_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {data.change_pct >= 0 ? '+' : ''}{data.change_pct}%
                    </div>
                  </div>
                </div>
              ))}
              {Object.keys(market).length === 0 && <div className="text-xs text-white/30 italic">Loading market data...</div>}
            </div>
          </div>

          {/* News */}
          <div className="glass-panel rounded-2xl p-6 group">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                🇮🇳 News Feed
              </h3>
              <button onClick={fetchNews} className="text-[10px] w-6 h-6 flex items-center justify-center rounded-md bg-white/5 text-white/30 hover:text-white transition-colors group-hover:bg-white/10">↻</button>
            </div>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 scrollbar-hide">
              {news.map((a, i) => (
                <a 
                  key={i} 
                  href={a.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full text-left block p-3 rounded-xl bg-black/40 border border-white/5 hover:bg-white/5 hover:border-white/20 transition-all cursor-pointer group no-underline"
                >
                  <div className="flex justify-between items-start">
                    <div className="text-[10px] text-emerald-400/80 mb-1 font-medium">{a.source}</div>
                    <iconify-icon icon="solar:link-linear" className="text-white/10 group-hover:text-blue-400 transition-colors"></iconify-icon>
                  </div>
                  <p className="text-xs text-white/80 leading-relaxed font-light">{a.title}</p>
                </a>
              ))}
              {news.length === 0 && <p className="text-xs text-white/30 italic">Loading news feed...</p>}
            </div>
          </div>

        </div>
      </div>
      
      {/* Footer styled similarly */}
      <footer className="border-t border-white/10 pt-16 pb-8 bg-black">
        <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-16">
                <div className="col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                        <iconify-icon icon="solar:shield-check-bold" className="text-white"></iconify-icon>
                        <span className="text-sm font-semibold tracking-tight text-white">PortAI</span>
                    </div>
                    <p className="text-xs text-white/40 max-w-xs leading-relaxed">
                        Clear, AI-driven financial insights to help Indian investors make smarter decisions.
                    </p>
                </div>
                
                <div>
                    <h4 className="text-xs font-semibold text-white mb-4">Platform</h4>
                    <ul className="space-y-2 text-xs text-white/50">
                        <li><a href="#" className="hover:text-white transition-colors">Portfolios</a></li>
                        <li><a href="#" className="hover:text-white transition-colors">Risk Models</a></li>
                        <li><a href="#" className="hover:text-white transition-colors">API Docs</a></li>
                    </ul>
                </div>
                
                <div>
                    <h4 className="text-xs font-semibold text-white mb-4">Intelligence</h4>
                    <ul className="space-y-2 text-xs text-white/50">
                        <li><a href="#" className="hover:text-white transition-colors">Sectors</a></li>
                        <li><a href="#" className="hover:text-white transition-colors">Macro</a></li>
                        <li><a href="#" className="hover:text-white transition-colors">Sentiment</a></li>
                    </ul>
                </div>

                <div>
                    <h4 className="text-xs font-semibold text-white mb-4">Legal</h4>
                    <ul className="space-y-2 text-xs text-white/50">
                        <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                        <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                    </ul>
                </div>
            </div>
            
            <div className="flex items-center justify-between pt-8 border-t border-white/10">
                <p className="text-[10px] text-white/30">© 2026 PortAI. All rights reserved.</p>
                <div className="flex gap-4 text-white/40">
                    <iconify-icon icon="solar:brand-twitter-linear" className="hover:text-white cursor-pointer"></iconify-icon>
                    <iconify-icon icon="solar:brand-linkedin-linear" className="hover:text-white cursor-pointer"></iconify-icon>
                </div>
            </div>
        </div>
      </footer>
      {/* Detail Modal */}
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
