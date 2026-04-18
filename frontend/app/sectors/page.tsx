'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import StockChart from '../../components/StockChart';
import DetailModal from '../../components/DetailModal';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://portai-xsw3.onrender.com';

const SECTOR_ICONS: Record<string, string> = {
  'IT': 'solar:laptop-linear',
  'Banking': 'solar:bank-linear',
  'Energy': 'solar:bolt-linear',
  'FMCG': 'solar:cart-large-2-linear',
  'Auto': 'solar:car-linear',
  'Pharma': 'solar:pills-linear',
  'Infra': 'solar:buildings-2-linear',
  'Telecom': 'solar:phone-rounded-linear',
};

const SECTOR_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'IT': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  'Banking': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  'Energy': { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  'FMCG': { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  'Auto': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  'Pharma': { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
  'Infra': { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  'Telecom': { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
};

interface SectorStock { symbol: string; price: number; change_pct: number; }
interface Sector { name: string; price: number; change_pct: number; stocks: SectorStock[]; }

export default function SectorsPage() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState('');
  const [marketHistory, setMarketHistory] = useState<Record<string, any[]>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'stock' | 'news'>('stock');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const sectorIndices: Record<string, string> = {
    'IT': '^CNXIT', 'Banking': '^NSEBANK', 'Pharma': '^CNXPHARMA',
    'FMCG': '^CNXFMCG', 'Auto': '^CNXAUTO', 'Energy': '^CNXENERGY',
    'Infra': '^CNXINFRA', 'Telecom': '^CNXTELECOM',
  };

  useEffect(() => {
    fetchSectors();
  }, []);

  const fetchSectors = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/sectors`);
      const d = await r.json();
      const sectorData = d.sectors || [];
      setSectors(sectorData);
      setLastUpdated(new Date().toLocaleTimeString('en-IN'));
      
      // Fetch history for top 6 sectors
      const indices: Record<string, string> = {
        'IT': '^CNXIT', 'Banking': '^NSEBANK', 'Pharma': '^CNXPHARMA',
        'FMCG': '^CNXFMCG', 'Auto': '^CNXAUTO', 'Energy': '^CNXENERGY',
        'Infra': '^CNXINFRA', 'Telecom': '^CNXTELECOM',
      };
      sectorData.forEach((s: any) => {
        if (indices[s.name]) fetchHistory(s.name, indices[s.name]);
      });
    } catch (e) {
      // Fallback mock data if backend not available
      setSectors([
        { name: 'IT', price: 38200, change_pct: -0.82, stocks: [{ symbol: 'TCS', price: 3890, change_pct: -0.5 }, { symbol: 'INFY', price: 1740, change_pct: -1.2 }, { symbol: 'WIPRO', price: 480, change_pct: 0.3 }] },
        { name: 'Banking', price: 51400, change_pct: 0.42, stocks: [{ symbol: 'HDFCBANK', price: 1660, change_pct: 0.8 }, { symbol: 'ICICIBANK', price: 1120, change_pct: 0.5 }, { symbol: 'SBIN', price: 788, change_pct: -0.2 }] },
        { name: 'Energy', price: 29800, change_pct: -0.33, stocks: [{ symbol: 'RELIANCE', price: 3050, change_pct: -0.4 }, { symbol: 'ONGC', price: 248, change_pct: 0.1 }] },
        { name: 'FMCG', price: 55200, change_pct: 0.17, stocks: [{ symbol: 'HINDUNILVR', price: 2320, change_pct: 0.3 }, { symbol: 'ITC', price: 448, change_pct: 0.5 }] },
        { name: 'Auto', price: 24600, change_pct: 0.66, stocks: [{ symbol: 'MARUTI', price: 12100, change_pct: 1.1 }, { symbol: 'TATAMOTORS', price: 980, change_pct: 0.4 }] },
        { name: 'Pharma', price: 21800, change_pct: -0.55, stocks: [{ symbol: 'SUNPHARMA', price: 1620, change_pct: -0.7 }, { symbol: 'CIPLA', price: 1440, change_pct: -0.3 }] },
        { name: 'Infra', price: 9800, change_pct: 0.92, stocks: [{ symbol: 'LT', price: 3780, change_pct: 0.9 }, { symbol: 'NTPC', price: 368, change_pct: 1.0 }] },
        { name: 'Telecom', price: 2800, change_pct: 1.24, stocks: [{ symbol: 'BHARTIARTL', price: 1840, change_pct: 1.3 }] },
      ]);
      setLastUpdated(new Date().toLocaleTimeString('en-IN') + ' (cached)');
    } finally {
      setLoading(false);
    }
  };

  const openStockModal = (sym: string, currentData: any = {}) => {
    setSelectedItem({ ...currentData, symbol: sym });
    setModalType('stock');
    setModalOpen(true);
    if (!marketHistory[sym]) fetchHistory(sym, sym);
  };

  const openSectorModal = (sectorName: string, data: any) => {
    const symbol = sectorIndices[sectorName] || sectorName;
    setSelectedItem({ ...data, symbol: sectorName });
    setModalType('stock');
    setModalOpen(true);
    if (!marketHistory[sectorName]) fetchHistory(sectorName, symbol);
  };

  const fetchHistory = async (name: string, symbol: string) => {
    try {
      const r = await fetch(`${API_BASE}/api/history/${encodeURIComponent(symbol)}?period=1mo`);
      const d = await r.json();
      if (d.history) {
        setMarketHistory(prev => ({ ...prev, [name]: d.history }));
      }
    } catch (err) {}
  };

  const gainers = [...sectors].filter(s => s.change_pct > 0).sort((a, b) => b.change_pct - a.change_pct);
  const losers = [...sectors].filter(s => s.change_pct < 0).sort((a, b) => a.change_pct - b.change_pct);

  return (
    <main className="min-h-screen w-full relative z-10">
      {/* Page Header */}
      <div className="pt-24 pb-8 border-b border-white/5 bg-black/30">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] tracking-wide text-cyan-400 mb-4">
              <iconify-icon icon="solar:buildings-2-linear"></iconify-icon>
              SECTOR INTELLIGENCE
            </div>
            <h1 className="text-3xl font-medium tracking-tight text-white">Indian Market Sectors</h1>
            <p className="text-white/50 text-sm mt-1">Live performance breakdown of all major NSE sectors.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-white/30">Updated: {lastUpdated || '--:--:--'}</div>
            <button onClick={fetchSectors} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all">
              <iconify-icon icon="solar:refresh-linear"></iconify-icon> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Market Breadth Indicators */}
        {!loading && sectors.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel rounded-2xl p-5 text-center">
              <div className="text-3xl font-medium text-emerald-400 mb-1">{gainers.length}</div>
              <div className="text-xs text-white/40">Sectors Gaining</div>
            </div>
            <div className="glass-panel rounded-2xl p-5 text-center">
              <div className="text-3xl font-medium text-red-400 mb-1">{losers.length}</div>
              <div className="text-xs text-white/40">Sectors Declining</div>
            </div>
            <div className="glass-panel rounded-2xl p-5 text-center">
              <div className="text-3xl font-medium text-white mb-1">
                {gainers.length > 0 ? `+${gainers[0].change_pct}%` : '--'}
              </div>
              <div className="text-xs text-white/40">Best Sector: <span className="text-emerald-400">{gainers[0]?.name || '--'}</span></div>
            </div>
            <div className="glass-panel rounded-2xl p-5 text-center">
              <div className="text-3xl font-medium text-white mb-1">
                {losers.length > 0 ? `${losers[0].change_pct}%` : '--'}
              </div>
              <div className="text-xs text-white/40">Worst Sector: <span className="text-red-400">{losers[0]?.name || '--'}</span></div>
            </div>
          </div>
        )}

        {/* Sector Grid */}
        <div>
          <h2 className="text-sm font-medium text-white/50 uppercase tracking-widest mb-4">All Sectors</h2>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({length: 8}).map((_, i) => (
                <div key={i} className="glass-panel rounded-2xl p-5 animate-pulse h-48">
                  <div className="h-8 w-8 bg-white/5 rounded-xl mb-4"></div>
                  <div className="h-4 w-20 bg-white/5 rounded mb-2"></div>
                  <div className="h-6 w-28 bg-white/5 rounded mb-4"></div>
                  <div className="h-3 w-full bg-white/5 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {sectors.map((sector) => {
                const color = SECTOR_COLORS[sector.name] || SECTOR_COLORS['IT'];
                const icon = SECTOR_ICONS[sector.name] || 'solar:chart-2-linear';
                const isGain = sector.change_pct >= 0;
                const isSelected = selected === sector.name;

                return (
                  <div key={sector.name}
                    onClick={() => setSelected(isSelected ? null : sector.name)}
                    className={`glass-panel rounded-2xl p-5 cursor-pointer transition-all duration-300 border ${isSelected ? `${color.border} bg-white/5` : 'border-transparent hover:border-white/15 hover:bg-white/[0.03]'}`}>

                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-10 h-10 rounded-xl ${color.bg} flex items-center justify-center ${color.text}`}>
                        <iconify-icon icon={icon} width="20"></iconify-icon>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isGain ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {isGain ? '+' : ''}{sector.change_pct}%
                      </span>
                    </div>

                    {/* Sector Performance Chart */}
                    <div className="h-10 w-full mb-4 opacity-70 group-hover:opacity-100 transition-opacity">
                       {marketHistory[sector.name] ? (
                          <StockChart 
                            data={marketHistory[sector.name]} 
                            color={isGain ? '#10b981' : '#f43f5e'} 
                            height={40} 
                          />
                       ) : (
                         <div className="h-full w-full flex items-end gap-1 px-1 opacity-20">
                            {[...Array(15)].map((_, i) => (
                              <div key={i} className="flex-1 bg-white/20 rounded-t-sm" style={{ height: `${20 + Math.random() * 80}%` }}></div>
                            ))}
                         </div>
                       )}
                    </div>

                    <div className="mb-3">
                      <div className="text-sm font-semibold text-white">{sector.name}</div>
                      {sector.price > 0 && <div className="text-xs text-white/40 mt-0.5">₹{sector.price.toLocaleString('en-IN')}</div>}
                    </div>

                    {/* Mini performance bar */}
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-3">
                      <div className={`h-full rounded-full transition-all duration-700 ${isGain ? 'bg-emerald-400' : 'bg-red-400'}`}
                        style={{width: `${Math.min(Math.abs(sector.change_pct) * 15 + 20, 100)}%`}}></div>
                    </div>

                    {/* Top stocks */}
                    {sector.stocks.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {sector.stocks.map(s => (
                          <span key={s.symbol} className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium ${s.change_pct >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {s.symbol} {s.change_pct >= 0 ? '+' : ''}{s.change_pct}%
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Expanded detail on selection */}
                    {isSelected && sector.stocks.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                        {sector.stocks.map(s => (
                          <div key={s.symbol} className="flex items-center justify-between">
                            <span className="text-xs font-medium text-white/80">{s.symbol}</span>
                            <div className="text-right">
                              <div className="text-xs text-white">₹{s.price.toLocaleString('en-IN')}</div>
                              <div className={`text-[9px] ${s.change_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{s.change_pct >= 0 ? '+' : ''}{s.change_pct}%</div>
                            </div>
                          </div>
                        ))}
                        <Link href="/intelligence"
                          onClick={(e) => { e.stopPropagation(); sessionStorage.setItem('intelligence_prefill', `Analyze the ${sector.name} sector. What is the outlook and top picks?`); }}
                          className={`mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-medium ${color.bg} ${color.text} hover:opacity-80 transition-opacity`}>
                          <iconify-icon icon="solar:magic-stick-3-linear"></iconify-icon> AI Analyze {sector.name}
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Gainers vs Losers */}
        {!loading && sectors.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-sm font-medium text-white flex items-center gap-2 mb-4">
                <iconify-icon icon="solar:arrow-up-linear" className="text-emerald-400"></iconify-icon>
                Top Gaining Sectors
              </h3>
              <div className="space-y-3">
                {gainers.map((s) => (
                  <div key={s.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg ${SECTOR_COLORS[s.name]?.bg} flex items-center justify-center ${SECTOR_COLORS[s.name]?.text}`}>
                        <iconify-icon icon={SECTOR_ICONS[s.name] || 'solar:chart-2-linear'} width="14"></iconify-icon>
                      </div>
                      <div className="text-sm text-white/80">{s.name}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400 rounded-full" style={{width: `${Math.min(s.change_pct * 20 + 10, 100)}%`}}></div>
                      </div>
                      <span className="text-xs font-semibold text-emerald-400">+{s.change_pct}%</span>
                    </div>
                  </div>
                ))}
                {gainers.length === 0 && <div className="text-sm text-white/30 text-center py-4">No gaining sectors today</div>}
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-sm font-medium text-white flex items-center gap-2 mb-4">
                <iconify-icon icon="solar:arrow-down-linear" className="text-red-400"></iconify-icon>
                Declining Sectors
              </h3>
              <div className="space-y-3">
                {losers.map((s) => (
                  <div key={s.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg ${SECTOR_COLORS[s.name]?.bg} flex items-center justify-center ${SECTOR_COLORS[s.name]?.text}`}>
                        <iconify-icon icon={SECTOR_ICONS[s.name] || 'solar:chart-2-linear'} width="14"></iconify-icon>
                      </div>
                      <div className="text-sm text-white/80">{s.name}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-red-400 rounded-full" style={{width: `${Math.min(Math.abs(s.change_pct) * 20 + 10, 100)}%`}}></div>
                      </div>
                      <span className="text-xs font-semibold text-red-400">{s.change_pct}%</span>
                    </div>
                  </div>
                ))}
                {losers.length === 0 && <div className="text-sm text-white/30 text-center py-4">No declining sectors today</div>}
              </div>
            </div>
          </div>
        )}

        {/* CTA to Intelligence */}
        <div className="glass-panel rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-white/5 to-transparent border border-white/5">
          <div>
            <h3 className="text-lg font-medium text-white mb-2">Want a deeper sector analysis?</h3>
            <p className="text-sm text-white/50">Use PortAI to generate a full institutional-grade report on any sector or stock.</p>
          </div>
          <Link href="/intelligence" className="flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors">
            <iconify-icon icon="solar:magic-stick-3-linear"></iconify-icon> Open AI Intelligence Hub
          </Link>
        </div>
      </div>
      <DetailModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        type={modalType} 
        data={selectedItem} 
        history={selectedItem ? marketHistory[selectedItem.symbol] || marketHistory[selectedItem.name] : undefined}
      />
    </main>
  );
}
