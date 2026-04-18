'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import StockChart from '../../components/StockChart';
import DetailModal from '../../components/DetailModal';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://portai-xsw3.onrender.com';

// ── Sample Portfolio Templates ──────────────────────────────────
const SAMPLE_PORTFOLIOS = [
  {
    id: 'growth',
    label: 'High Growth',
    icon: 'solar:graph-up-bold',
    color: 'emerald',
    description: 'Tech & emerging sectors for aggressive capital appreciation.',
    totalValue: 1200000,
    totalPnl: 148500,
    pnlPct: 14.1,
    holdings: [
      { symbol: 'TCS', qty: 20, avg_price: 3600, current_price: 3890, pnl: 5800, pnl_pct: 8.05 },
      { symbol: 'ZOMATO', qty: 500, avg_price: 165, current_price: 204, pnl: 19500, pnl_pct: 23.6 },
      { symbol: 'TATAMOTORS', qty: 80, avg_price: 870, current_price: 980, pnl: 8800, pnl_pct: 12.6 },
      { symbol: 'HCLTECH', qty: 30, avg_price: 1450, current_price: 1620, pnl: 5100, pnl_pct: 11.7 },
    ]
  },
  {
    id: 'conservative',
    label: 'Conservative',
    icon: 'solar:shield-check-bold',
    color: 'blue',
    description: 'Blue chips and dividend plays for capital preservation.',
    totalValue: 950000,
    totalPnl: 41200,
    pnlPct: 4.5,
    holdings: [
      { symbol: 'HDFCBANK', qty: 50, avg_price: 1620, current_price: 1660, pnl: 2000, pnl_pct: 2.5 },
      { symbol: 'ITC', qty: 300, avg_price: 420, current_price: 448, pnl: 8400, pnl_pct: 6.7 },
      { symbol: 'HINDUNILVR', qty: 25, avg_price: 2200, current_price: 2320, pnl: 3000, pnl_pct: 5.5 },
      { symbol: 'COALINDIA', qty: 200, avg_price: 370, current_price: 432, pnl: 12400, pnl_pct: 16.8 },
    ]
  },
  {
    id: 'balanced',
    label: 'Balanced',
    icon: 'solar:chart-2-bold',
    color: 'purple',
    description: 'Diversified mix across Banking, IT, and Energy for steady returns.',
    totalValue: 800000,
    totalPnl: 62400,
    pnlPct: 8.5,
    holdings: [
      { symbol: 'RELIANCE', qty: 15, avg_price: 2650, current_price: 3050, pnl: 6000, pnl_pct: 15.1 },
      { symbol: 'ICICIBANK', qty: 60, avg_price: 1050, current_price: 1120, pnl: 4200, pnl_pct: 6.7 },
      { symbol: 'INFY', qty: 40, avg_price: 1600, current_price: 1740, pnl: 5600, pnl_pct: 8.75 },
      { symbol: 'SUNPHARMA', qty: 30, avg_price: 1480, current_price: 1620, pnl: 4200, pnl_pct: 9.5 },
    ]
  },
  {
    id: 'midcap',
    label: 'Mid Cap Focus',
    icon: 'solar:star-bold',
    color: 'orange',
    description: 'High-potential mid cap picks targeting sector leadership.',
    totalValue: 650000,
    totalPnl: -18500,
    pnlPct: -2.8,
    holdings: [
      { symbol: 'TITAN', qty: 20, avg_price: 3500, current_price: 3350, pnl: -3000, pnl_pct: -4.3 },
      { symbol: 'BAJFINANCE', qty: 5, avg_price: 7200, current_price: 6950, pnl: -1250, pnl_pct: -3.5 },
      { symbol: 'ASHOKLEY', qty: 300, avg_price: 195, current_price: 188, pnl: -2100, pnl_pct: -3.6 },
      { symbol: 'MUTHOOTFIN', qty: 40, avg_price: 1650, current_price: 1720, pnl: 2800, pnl_pct: 4.2 },
    ]
  },
];

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; glow: string; button: string }> = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', glow: 'bg-emerald-500/10', button: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20' },
  blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/20',    glow: 'bg-blue-500/10',    button: 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20' },
  purple:  { bg: 'bg-purple-500/10',  text: 'text-purple-400',  border: 'border-purple-500/20',  glow: 'bg-purple-500/10',  button: 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/20' },
  orange:  { bg: 'bg-orange-500/10',  text: 'text-orange-400',  border: 'border-orange-500/20',  glow: 'bg-orange-500/10',  button: 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/20' },
};

export default function PortfoliosPage() {
  const router = useRouter();
  const [brokerToken, setBrokerToken] = useState<string | null>(null);
  const [brokerHoldings, setBrokerHoldings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'broker' | 'upload' | 'samples'>('samples');
  const [marketHistory, setMarketHistory] = useState<Record<string, any[]>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'stock' | 'news'>('stock');
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const openStockModal = (sym: string, currentData: any = {}) => {
    setSelectedItem({ ...currentData, symbol: sym });
    setModalType('stock');
    setModalOpen(true);
    if (!marketHistory[sym]) fetchHistory(sym);
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

  useEffect(() => {
    const token = localStorage.getItem('upstox_access_token');
    if (token) {
      setBrokerToken(token);
      fetchBrokerHoldings(token);
      setActiveTab('broker');
    }
    // Fetch history for sample symbols
    SAMPLE_PORTFOLIOS.forEach(p => {
      p.holdings.forEach(h => fetchHistory(h.symbol));
    });
  }, []);

  const fetchBrokerHoldings = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/broker/holdings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: token, broker: 'upstox' })
      });
      const data = await res.json();
      if (data.holdings) {
        setBrokerHoldings(data.holdings);
        data.holdings.forEach((h: any) => fetchHistory(h.symbol));
      }
    } catch (e) { console.error('Failed to fetch broker holdings', e); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setLoading(true); setError('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('query', 'Deep dive analysis of this portfolio data. Identify risks and sector allocations.');
    try {
      const res = await fetch(`${API_BASE}/api/analyze-file`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.analysis) {
        sessionStorage.setItem('cached_analysis', JSON.stringify(data));
        router.push('/intelligence');
      } else { setError(data.error || 'Analysis failed. Check backend logs.'); }
    } catch { setError('File upload failed. Ensure backend is running.'); }
    finally { setLoading(false); }
  };

  const handleConnectUpstox = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/broker/login/upstox`);
      const d = await r.json();
      if (d.login_url === 'mock_auth_flow') {
        window.location.href = '/callback/upstox?code=mock_code';
      } else if (d.login_url) { window.location.href = d.login_url; }
    } catch { setError('Failed to contact backend for Upstox login.'); }
  };

  const handleAnalyzeBrokerHoldings = async () => {
    if (brokerHoldings.length === 0) return;
    setLoading(true); setError('');
    const context = `User Portfolio Holdings from Upstox:\n${JSON.stringify(brokerHoldings, null, 2)}`;
    try {
      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'Analyze my overall portfolio strategy, identify sector risks, and provide actionable recommendations.', context }),
      });
      const data = await res.json();
      if (data.analysis) {
        sessionStorage.setItem('cached_analysis', JSON.stringify(data));
        router.push('/intelligence');
      } else { setError('Analysis failed.'); }
    } catch { setError('Connection failed.'); }
    finally { setLoading(false); }
  };

  const handleAnalyzeSample = async (portfolio: typeof SAMPLE_PORTFOLIOS[0]) => {
    setLoadingId(portfolio.id); setError('');
    const holdingsText = portfolio.holdings.map(h =>
      `${h.symbol}: ${h.qty} shares @ ₹${h.avg_price} avg (current ₹${h.current_price}), P&L: ₹${h.pnl} (${h.pnl_pct}%)`
    ).join('\n');
    const context = `Sample Portfolio: "${portfolio.label}"\nTotal Value: ₹${portfolio.totalValue.toLocaleString('en-IN')}\nTotal P&L: ₹${portfolio.totalPnl.toLocaleString('en-IN')} (${portfolio.pnlPct > 0 ? '+' : ''}${portfolio.pnlPct}%)\n\nHoldings:\n${holdingsText}`;
    try {
      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `Analyze this "${portfolio.label}" portfolio in depth. Assess sector concentration, behavioral risks, and provide 5 specific recommendations for improving risk-adjusted returns.`,
          context
        }),
      });
      const data = await res.json();
      if (data.analysis) {
        sessionStorage.setItem('cached_analysis', JSON.stringify(data));
        router.push('/intelligence');
      } else { setError('Analysis failed.'); }
    } catch { setError('Connection failed. Is the backend running?'); }
    finally { setLoadingId(null); }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <main className="min-h-screen pt-24 pb-20 relative z-10 w-full">
      <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-purple-500/10 blur-[120px] rounded-[100%] pointer-events-none -z-10"></div>

      <div className="max-w-5xl mx-auto px-6">
        {/* Page Header */}
        <div className="mb-8 fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] tracking-wide text-purple-400 mb-4">
            <iconify-icon icon="solar:wallet-2-linear"></iconify-icon>
            PORTFOLIO CENTER
          </div>
          <h1 className="text-3xl font-medium tracking-tight text-white mb-2">Your Portfolio Hub</h1>
          <p className="text-white/50 text-sm max-w-lg">Connect your broker, upload statements, or analyze one of our sample portfolios to see PortAI in action.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-sm">
            <iconify-icon icon="solar:danger-triangle-linear" width="18"></iconify-icon>
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 w-fit mb-8">
          {([
            { id: 'samples', label: '✨ Sample Portfolios' },
            { id: 'broker',  label: '🔗 Broker Sync' },
            { id: 'upload',  label: '📄 Upload File' },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === tab.id ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Sample Portfolios ── */}
        {activeTab === 'samples' && (
          <div className="space-y-4 fade-up">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-white/40">Click "AI Analyze" on any sample to see a full institutional-grade report — no account needed.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {SAMPLE_PORTFOLIOS.map(portfolio => {
                const c = COLOR_MAP[portfolio.color];
                const isLoading = loadingId === portfolio.id;
                const isGain = portfolio.pnlPct >= 0;

                return (
                  <div key={portfolio.id} className={`glass-panel rounded-3xl p-6 border ${c.border} hover:bg-white/[0.03] transition-all duration-300 relative overflow-hidden group`}>
                    <div className={`absolute -right-12 -top-12 w-48 h-48 ${c.glow} blur-[80px] rounded-full pointer-events-none`}></div>

                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-5 relative z-10">
                      <div>
                        <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center ${c.text} mb-3`}>
                          <iconify-icon icon={portfolio.icon} width="20"></iconify-icon>
                        </div>
                        <h3 className="text-base font-semibold text-white">{portfolio.label}</h3>
                        <p className="text-[11px] text-white/40 mt-0.5 max-w-[200px]">{portfolio.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-white">{formatCurrency(portfolio.totalValue)}</div>
                        <div className={`text-xs font-medium ${isGain ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isGain ? '+' : ''}{formatCurrency(portfolio.totalPnl)} ({isGain ? '+' : ''}{portfolio.pnlPct}%)
                        </div>
                      </div>
                    </div>

                    {/* Holdings List */}
                    <div className="space-y-2 mb-5 relative z-10">
                      {portfolio.holdings.map(h => (
                        <div key={h.symbol} className="flex flex-col py-3 border-b border-white/[0.04] last:border-0">
                          <div className="flex items-center justify-between mb-2">
                             <div>
                                <span className="text-xs font-semibold text-white">{h.symbol}</span>
                                <span className="text-[9px] text-white/30 ml-2">{h.qty} shares</span>
                             </div>
                             <div className="text-right">
                                <div className="text-xs text-white">₹{h.current_price.toLocaleString('en-IN')}</div>
                                <div className={`text-[9px] font-medium ${h.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                   {h.pnl >= 0 ? '+' : ''}₹{Math.abs(h.pnl).toLocaleString('en-IN')} ({h.pnl_pct}%)
                                </div>
                             </div>
                          </div>
                          {/* Mini Chart for Portfolio Holding */}
                          <div className="h-6 w-full opacity-40 group-hover:opacity-80 transition-opacity">
                             {marketHistory[h.symbol] && (
                                <StockChart 
                                   data={marketHistory[h.symbol]} 
                                   color={h.pnl >= 0 ? '#10b981' : '#f43f5e'} 
                                   height={24} 
                                />
                             )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Analyze Button */}
                    <button onClick={() => handleAnalyzeSample(portfolio)} disabled={isLoading || loadingId !== null}
                      className={`w-full py-3 rounded-xl ${c.button} text-white text-sm font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative z-10`}>
                      {isLoading ? (
                        <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Analyzing...</>
                      ) : (
                        <><iconify-icon icon="solar:magic-stick-3-linear"></iconify-icon> AI Analyze This Portfolio</>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Tab: Broker Sync ── */}
        {activeTab === 'broker' && (
          <div className="fade-up glass-panel p-8 rounded-3xl relative overflow-hidden border border-white/10 hover:border-purple-500/30 transition-all duration-500 max-w-lg mx-auto">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-500/10 blur-3xl rounded-full"></div>
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6 relative z-10">
              <iconify-icon icon="solar:shield-check-bold" width="28"></iconify-icon>
            </div>
            <h3 className="text-2xl font-medium tracking-tight text-white mb-2 relative z-10">Broker Sync API</h3>
            <p className="text-sm text-white/40 mb-8 relative z-10">Securely connect your Upstox account. PortAI instantly reads your live holdings to find sector risks and alpha opportunities.</p>

            <div className="relative z-10">
              {brokerToken ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm text-white">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                      Upstox Connected
                    </div>
                    <div className="text-xs font-medium text-emerald-400">{brokerHoldings.length} Assets Synced</div>
                  </div>
                  {brokerHoldings.length > 0 && (
                    <div className="space-y-2">
                      {brokerHoldings.map((h, i) => (
                        <button 
                          key={i} 
                          onClick={() => openStockModal(h.symbol, h)}
                          className="w-full text-left flex justify-between items-center text-xs p-3 rounded-xl bg-black/40 border border-white/5 hover:bg-white/5 transition-all cursor-pointer group/row"
                        >
                          <span className="text-white/80 font-medium group-hover/row:text-white">{h.symbol}</span>
                          <span className={h.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {h.pnl >= 0 ? '+' : ''}{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(h.pnl)} ({h.pnl_pct}%)
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  <button onClick={handleAnalyzeBrokerHoldings} disabled={loading || brokerHoldings.length === 0}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-500 transition-colors disabled:opacity-50 shadow-lg shadow-purple-600/20">
                    {loading ? 'Analyzing...' : <><iconify-icon icon="solar:magic-stick-3-linear"></iconify-icon> AI Analyze Synced Holdings</>}
                  </button>
                  <button onClick={() => { localStorage.removeItem('upstox_access_token'); setBrokerToken(null); setBrokerHoldings([]); }}
                    className="w-full py-2 text-xs text-white/30 hover:text-white/80 transition-colors">
                    Disconnect Broker
                  </button>
                </div>
              ) : (
                <button onClick={handleConnectUpstox} disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors">
                  <iconify-icon icon="solar:link-circle-bold"></iconify-icon> Connect Upstox Account
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Upload File ── */}
        {activeTab === 'upload' && (
          <div className="fade-up glass-panel p-8 rounded-3xl relative overflow-hidden border border-white/10 hover:border-blue-500/30 transition-all duration-500 max-w-lg mx-auto">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/10 blur-3xl rounded-full"></div>
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                <iconify-icon icon="solar:document-add-linear" width="28"></iconify-icon>
              </div>
              <div className="flex gap-1">
                <span className="text-[9px] px-2 py-0.5 rounded-md bg-white/5 text-white/40 border border-white/10 font-mono">.CSV</span>
                <span className="text-[9px] px-2 py-0.5 rounded-md bg-white/5 text-white/40 border border-white/10 font-mono">.PDF</span>
                <span className="text-[9px] px-2 py-0.5 rounded-md bg-white/5 text-white/40 border border-white/10 font-mono">.TXT</span>
              </div>
            </div>
            <h3 className="text-2xl font-medium tracking-tight text-white mb-2 relative z-10">Upload Custom Files</h3>
            <p className="text-sm text-white/40 mb-8 relative z-10">Upload your portfolio statements, parsed tax documents, or custom CSV datasets for rapid analysis.</p>
            <div className="relative z-10">
              <input type="file" ref={fileRef} onChange={handleFileUpload} accept=".csv,.txt,.json,.pdf,.jpg,.jpeg,.png" className="hidden" />
              <button onClick={() => fileRef.current?.click()} disabled={loading}
                className="w-full flex-col gap-3 py-12 rounded-xl bg-black/40 border border-dashed border-white/20 text-white/60 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group flex items-center justify-center">
                {loading ? (
                  <svg className="animate-spin w-8 h-8 text-blue-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                ) : (
                  <>
                    <iconify-icon icon="solar:upload-linear" width="32" className="text-white/40 group-hover:text-blue-400 transition-colors"></iconify-icon>
                    <div className="text-sm font-medium">Click to upload file</div>
                    <div className="text-[10px] text-white/30 text-center px-4">CSV, PDF, TXT, or image — PortAI parses everything</div>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
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
