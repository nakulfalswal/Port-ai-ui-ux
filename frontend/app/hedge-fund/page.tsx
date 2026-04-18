'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ShinyText from '@/components/reactbits/ShinyText';
import GradientText from '@/components/reactbits/GradientText';
import SpotlightCard from '@/components/reactbits/SpotlightCard';
import Particles from '@/components/reactbits/Particles';
import StarBorder from '@/components/reactbits/StarBorder';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AnalystInfo { label: string; description: string; icon: string; }
interface PersonaInfo { label: string; style: string; color: string; }
interface ProviderInfo { label: string; models: string[]; }

interface AnalystSignal {
  agent_id: string; ticker: string; signal: string;
  confidence: number; reasoning: string;
}
interface RiskSignal {
  ticker: string; signal: string; confidence: number; max_position_size: number;
}
interface PortfolioPosition {
  ticker: string; action: string; quantity: number; confidence: number; reasoning: string;
}
interface AnalysisResult {
  tickers: string[];
  analyst_signals: Record<string, AnalystSignal[]>;
  risk_adjusted_signals: RiskSignal[];
  portfolio_output: { positions: PortfolioPosition[]; cash_remaining: number; total_value: number };
  timestamp: string;
}
interface PaperPortfolio {
  cash: number; total_value: number;
  positions: Record<string, { shares: number; avg_cost: number; current_price: number }>;
  trades: any[];
  last_run: string | null;
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const ANALYST_ICONS: Record<string, string> = {
  fundamentals: 'solar:chart-square-linear',
  technical: 'solar:graph-up-linear',
  sentiment: 'solar:document-text-linear',
  valuation: 'solar:calculator-linear',
  growth: 'solar:rocket-linear',
  macro_regime: 'solar:globe-linear',
};

const PERSONA_COLORS: Record<string, string> = {
  buffett: '#3b82f6', graham: '#8b5cf6', munger: '#6366f1', burry: '#ef4444',
  wood: '#f59e0b', ackman: '#10b981', lynch: '#14b8a6', damodaran: '#6d28d9',
  druckenmiller: '#dc2626', fisher: '#0891b2', pabrai: '#7c3aed', jhunjhunwala: '#059669',
};

const SIGNAL_STYLES: Record<string, string> = {
  bullish: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  bearish: 'text-red-400 bg-red-500/10 border-red-500/30',
  neutral: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
};

const ACTION_STYLES: Record<string, string> = {
  buy: 'text-emerald-400 bg-emerald-500/10',
  sell: 'text-red-400 bg-red-500/10',
  hold: 'text-amber-400 bg-amber-500/10',
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function SignalBadge({ signal }: { signal: string }) {
  const s = signal?.toLowerCase() || 'neutral';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${SIGNAL_STYLES[s] || SIGNAL_STYLES.neutral}`}>
      {s === 'bullish' ? '▲' : s === 'bearish' ? '▼' : '—'} {s}
    </span>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 65 ? 'bg-emerald-500' : value >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-white/50 w-8 text-right">{value}%</span>
    </div>
  );
}

function StatusChip({ online }: { online: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border ${online ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
      {online ? 'Backend Online' : 'Backend Offline'}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HedgeFundPage() {
  const [activeTab, setActiveTab] = useState<'analyze' | 'backtest' | 'paper' | 'risk'>('analyze');
  const [backendOnline, setBackendOnline] = useState(false);

  // Metadata from backend
  const [analysts, setAnalysts] = useState<Record<string, AnalystInfo>>({});
  const [personas, setPersonas] = useState<Record<string, PersonaInfo>>({});
  const [providers, setProviders] = useState<Record<string, ProviderInfo>>({});

  // ── Analysis state ──────────────────────────────────────────────────────────
  const [tickers, setTickers] = useState('AAPL,MSFT');
  const [useLLM, setUseLLM] = useState(false);
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('groq');
  const [selectedModel, setSelectedModel] = useState('llama3-70b-8192');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState('');

  // ── Backtest state ──────────────────────────────────────────────────────────
  const [btTickers, setBtTickers] = useState('AAPL,MSFT');
  const [btStartDate, setBtStartDate] = useState('2024-01-01');
  const [btEndDate, setBtEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [btCash, setBtCash] = useState(100000);
  const [btStopLoss, setBtStopLoss] = useState<number | ''>('');
  const [btTrailingStop, setBtTrailingStop] = useState<number | ''>('');
  const [btTakeProfit, setBtTakeProfit] = useState<number | ''>('');
  const [btFrequency, setBtFrequency] = useState('weekly');
  const [btLoading, setBtLoading] = useState(false);
  const [btResult, setBtResult] = useState<any>(null);
  const [btError, setBtError] = useState('');

  // ── Paper trading state ─────────────────────────────────────────────────────
  const [paperPortfolio, setPaperPortfolio] = useState<PaperPortfolio | null>(null);
  const [ptTickers, setPtTickers] = useState('AAPL,MSFT,NVDA');
  const [ptCash, setPtCash] = useState(100000);
  const [ptLoading, setPtLoading] = useState(false);
  const [ptError, setPtError] = useState('');

  // ── Bootstrap ───────────────────────────────────────────────────────────────
  useEffect(() => {
    checkBackend();
    fetchPaperPortfolio();
  }, []);

  const checkBackend = async () => {
    try {
      const [analystsRes, personasRes, providersRes] = await Promise.all([
        fetch('/api/hedge-fund/analysts'),
        fetch('/api/hedge-fund/personas'),
        fetch('/api/hedge-fund/providers'),
      ]);
      setBackendOnline(analystsRes.ok);
      if (analystsRes.ok) setAnalysts((await analystsRes.json()).analysts || {});
      if (personasRes.ok) setPersonas((await personasRes.json()).personas || {});
      if (providersRes.ok) {
        const pd = await providersRes.json();
        setProviders(pd.providers || pd.all_providers || {});
      }
    } catch {
      setBackendOnline(false);
    }
  };

  const fetchPaperPortfolio = async () => {
    try {
      const res = await fetch('/api/hedge-fund/paper-portfolio');
      if (res.ok) setPaperPortfolio(await res.json());
    } catch { }
  };

  // ── Analysis ────────────────────────────────────────────────────────────────
  const runAnalysis = async () => {
    setAnalysisLoading(true);
    setAnalysisError('');
    setAnalysisResult(null);
    try {
      const res = await fetch('/api/hedge-fund/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tickers: tickers.split(',').map(t => t.trim().toUpperCase()).filter(Boolean),
          use_llm: useLLM,
          personas: selectedPersonas.length > 0 ? selectedPersonas : null,
          model_provider: selectedProvider,
          model_name: selectedModel,
          show_reasoning: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setAnalysisResult(data);
    } catch (e: any) {
      setAnalysisError(e.message);
    } finally {
      setAnalysisLoading(false);
    }
  };

  // ── Backtest ────────────────────────────────────────────────────────────────
  const runBacktest = async () => {
    setBtLoading(true);
    setBtError('');
    setBtResult(null);
    try {
      const res = await fetch('/api/hedge-fund/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tickers: btTickers.split(',').map(t => t.trim().toUpperCase()).filter(Boolean),
          start_date: btStartDate,
          end_date: btEndDate,
          cash: btCash,
          stop_loss: btStopLoss !== '' ? Number(btStopLoss) / 100 : null,
          trailing_stop: btTrailingStop !== '' ? Number(btTrailingStop) / 100 : null,
          take_profit: btTakeProfit !== '' ? Number(btTakeProfit) / 100 : null,
          frequency: btFrequency,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Backtest failed');
      setBtResult(data);
    } catch (e: any) {
      setBtError(e.message);
    } finally {
      setBtLoading(false);
    }
  };

  // ── Paper Trading ───────────────────────────────────────────────────────────
  const runPaperTrade = async () => {
    setPtLoading(true);
    setPtError('');
    try {
      const res = await fetch('/api/hedge-fund/paper-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tickers: ptTickers.split(',').map(t => t.trim().toUpperCase()).filter(Boolean),
          use_llm: useLLM,
          model_provider: selectedProvider,
          model_name: selectedModel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Trade failed');
      setPaperPortfolio(data.portfolio);
    } catch (e: any) {
      setPtError(e.message);
    } finally {
      setPtLoading(false);
    }
  };

  const resetPaperPortfolio = async () => {
    setPtLoading(true);
    setPtError('');
    try {
      const res = await fetch('/api/hedge-fund/paper-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _action: 'reset',
          cash: ptCash,
          tickers: ptTickers.split(',').map(t => t.trim().toUpperCase()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      setPaperPortfolio(data.portfolio);
    } catch (e: any) {
      setPtError(e.message);
    } finally {
      setPtLoading(false);
    }
  };

  const togglePersona = (key: string) => {
    setSelectedPersonas(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'analyze', label: 'Multi-Agent Analysis', icon: 'solar:users-group-two-rounded-linear' },
    { id: 'backtest', label: 'Backtesting', icon: 'solar:graph-up-linear' },
    { id: 'paper', label: 'Paper Trading', icon: 'solar:wallet-linear' },
    { id: 'risk', label: 'Risk Monitor', icon: 'solar:shield-warning-linear' },
  ] as const;

  return (
    <main className="min-h-screen w-full bg-black text-white relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <Particles particleCount={100} particleSpread={18} speed={0.06}
          particleColors={['#5227FF', '#4f8fff', '#a78bfa']}
          alphaParticles particleBaseSize={50} cameraDistance={28} className="w-full h-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-28 pb-20">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              <ShinyText text="AI HEDGE FUND ENGINE" speed={3} color="#a78bfa" shineColor="#fff" className="text-[10px] tracking-wide font-medium" />
            </div>
            <h1 className="text-3xl md:text-5xl font-medium tracking-tighter">
              <GradientText colors={['#5227FF', '#a78bfa', '#4f8fff', '#5227FF']} animationSpeed={4}>
                Stratton Oakmont
              </GradientText>
            </h1>
            <p className="text-white/40 mt-2 text-sm max-w-lg">
              6 core analysts · 12 investor personas · real-time signals · backtesting · paper trading
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusChip online={backendOnline} />
            {!backendOnline && (
              <p className="text-[10px] text-white/30 text-right max-w-xs">
                Start: <code className="text-purple-400">cd stratton-oakmont && uvicorn api_server:app --port 8000</code>
              </p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-white/[0.03] border border-white/10 rounded-2xl p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === tab.id ? 'bg-white/10 text-white shadow-md' : 'text-white/40 hover:text-white/70'}`}
            >
              <iconify-icon icon={tab.icon} width="16" />
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── TAB: Multi-Agent Analysis ───────────────────────────────────────── */}
        {activeTab === 'analyze' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Config */}
            <div className="lg:col-span-1 space-y-5">
              {/* Tickers */}
              <SpotlightCard className="glass-panel rounded-2xl p-5" spotlightColor="rgba(82,39,255,0.15)">
                <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <iconify-icon icon="solar:chart-2-linear" className="text-purple-400" />
                  Tickers
                </h3>
                <input
                  value={tickers}
                  onChange={e => setTickers(e.target.value)}
                  placeholder="AAPL,MSFT,NVDA"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50"
                />
                <p className="text-[10px] text-white/30 mt-2">Comma-separated (e.g. AAPL,MSFT,NVDA)</p>
              </SpotlightCard>

              {/* LLM Toggle */}
              <SpotlightCard className="glass-panel rounded-2xl p-5" spotlightColor="rgba(82,39,255,0.1)">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-white flex items-center gap-2">
                    <iconify-icon icon="solar:stars-minimalistic-bold" className="text-amber-400" />
                    LLM Reasoning
                  </h3>
                  <button
                    onClick={() => setUseLLM(!useLLM)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${useLLM ? 'bg-purple-600' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${useLLM ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
                {useLLM && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Provider</label>
                      <select
                        value={selectedProvider}
                        onChange={e => {
                          setSelectedProvider(e.target.value);
                          const p = providers[e.target.value];
                          if (p?.models?.length) setSelectedModel(p.models[0]);
                        }}
                        className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                      >
                        {Object.entries(providers).map(([key, p]) => (
                          <option key={key} value={key}>{p.label || key}</option>
                        ))}
                        {Object.keys(providers).length === 0 && <option value="groq">Groq</option>}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Model</label>
                      <select
                        value={selectedModel}
                        onChange={e => setSelectedModel(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                      >
                        {(providers[selectedProvider]?.models || ['llama3-70b-8192']).map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </SpotlightCard>

              {/* Investor Personas */}
              <SpotlightCard className="glass-panel rounded-2xl p-5" spotlightColor="rgba(82,39,255,0.1)">
                <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <iconify-icon icon="solar:users-group-two-rounded-linear" className="text-blue-400" />
                  Investor Personas
                  <span className="text-[10px] text-white/30">(requires LLM)</span>
                </h3>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto scrollbar-hide">
                  {Object.entries(personas).length > 0
                    ? Object.entries(personas).map(([key, p]) => (
                      <button
                        key={key}
                        onClick={() => togglePersona(key)}
                        disabled={!useLLM}
                        style={{ borderColor: selectedPersonas.includes(key) ? (PERSONA_COLORS[key] || '#5227FF') : 'transparent' }}
                        className={`text-left p-2.5 rounded-xl border text-xs transition-all ${selectedPersonas.includes(key) ? 'bg-white/10' : 'bg-white/[0.03] hover:bg-white/[0.06]'} ${!useLLM ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="font-medium text-white truncate">{p.label}</div>
                        <div className="text-white/30 text-[9px] truncate mt-0.5">{p.style}</div>
                      </button>
                    ))
                    : Object.entries(PERSONA_COLORS).map(([key, color]) => (
                      <button
                        key={key}
                        onClick={() => togglePersona(key)}
                        disabled={!useLLM}
                        style={{ borderColor: selectedPersonas.includes(key) ? color : 'transparent' }}
                        className={`text-left p-2.5 rounded-xl border text-xs transition-all ${selectedPersonas.includes(key) ? 'bg-white/10' : 'bg-white/[0.03] hover:bg-white/[0.06]'} ${!useLLM ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="font-medium text-white capitalize">{key}</div>
                      </button>
                    ))
                  }
                </div>
                {selectedPersonas.length > 0 && (
                  <div className="mt-3 flex gap-1 flex-wrap">
                    <button onClick={() => setSelectedPersonas(Object.keys(personas))} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400">Select All</button>
                    <button onClick={() => setSelectedPersonas([])} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40">Clear</button>
                  </div>
                )}
              </SpotlightCard>

              {/* Run Button */}
              <StarBorder as="button" onClick={runAnalysis} disabled={analysisLoading || !tickers.trim()} color="#5227FF" speed="4s"
                className={`w-full ${analysisLoading || !tickers.trim() ? 'opacity-30 cursor-not-allowed' : ''}`}>
                <span className="flex items-center justify-center gap-2">
                  {analysisLoading ? (
                    <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Running Agents...</>
                  ) : (
                    <><iconify-icon icon="solar:stars-minimalistic-bold" width="18" />Run Analysis</>
                  )}
                </span>
              </StarBorder>
            </div>

            {/* Right: Results */}
            <div className="lg:col-span-2 space-y-5">
              {analysisError && (
                <div className="glass-panel rounded-2xl p-5 border border-red-500/20 bg-red-500/5">
                  <div className="flex items-start gap-3">
                    <iconify-icon icon="solar:danger-triangle-linear" className="text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-300">{analysisError}</p>
                  </div>
                </div>
              )}

              {!analysisResult && !analysisLoading && !analysisError && (
                <div className="glass-panel rounded-2xl p-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/10">
                    <iconify-icon icon="solar:chart-square-linear" width="34" className="text-white/30" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">Ready to Analyze</h3>
                  <p className="text-sm text-white/30">Configure tickers and click "Run Analysis"</p>
                  <div className="grid grid-cols-3 gap-3 mt-6 max-w-sm mx-auto">
                    {['AAPL,MSFT', 'NVDA,AMD', 'TSLA,AMZN'].map(t => (
                      <button key={t} onClick={() => setTickers(t)}
                        className="text-[11px] px-3 py-1.5 rounded-full border border-white/10 bg-black/40 text-white/50 hover:text-white hover:border-white/30 transition-all">
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {analysisLoading && (
                <div className="glass-panel rounded-2xl p-10 text-center">
                  <div className="w-16 h-16 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin mx-auto mb-6" />
                  <h3 className="text-lg font-medium text-white mb-2">Agents Running</h3>
                  <p className="text-sm text-white/30">6 analysts processing {tickers} in parallel…</p>
                  <div className="flex justify-center gap-3 mt-4 flex-wrap">
                    {['Fundamentals', 'Technical', 'Sentiment', 'Valuation', 'Growth', 'Macro'].map(a => (
                      <span key={a} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 animate-pulse">{a}</span>
                    ))}
                  </div>
                </div>
              )}

              {analysisResult && (
                <>
                  {/* Analyst Signals */}
                  <SpotlightCard className="glass-panel rounded-2xl p-5" spotlightColor="rgba(82,39,255,0.1)">
                    <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                      <iconify-icon icon="solar:users-group-two-rounded-linear" className="text-purple-400" />
                      Analyst Signals
                      <span className="text-[10px] text-white/40 ml-auto">{analysisResult.timestamp ? new Date(analysisResult.timestamp).toLocaleTimeString() : ''}</span>
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="text-left text-[10px] text-white/30 uppercase tracking-widest py-2 pr-4">Agent</th>
                            <th className="text-left text-[10px] text-white/30 uppercase tracking-widest py-2 pr-4">Ticker</th>
                            <th className="text-left text-[10px] text-white/30 uppercase tracking-widest py-2 pr-4">Signal</th>
                            <th className="text-left text-[10px] text-white/30 uppercase tracking-widest py-2 pr-4 w-32">Confidence</th>
                            <th className="text-left text-[10px] text-white/30 uppercase tracking-widest py-2">Reasoning</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                          {Object.entries(analysisResult.analyst_signals).flatMap(([agentId, signals]) =>
                            (signals as AnalystSignal[]).map((sig, i) => (
                              <tr key={`${agentId}-${i}`} className="hover:bg-white/[0.02] transition-colors">
                                <td className="py-2.5 pr-4">
                                  <span className="text-[11px] text-purple-300/80 font-medium">{agentId.replace('_analyst', '').replace('_', ' ')}</span>
                                </td>
                                <td className="py-2.5 pr-4 font-mono text-white">{sig.ticker}</td>
                                <td className="py-2.5 pr-4"><SignalBadge signal={sig.signal} /></td>
                                <td className="py-2.5 pr-4 w-32"><ConfidenceBar value={sig.confidence} /></td>
                                <td className="py-2.5 text-[11px] text-white/40 max-w-xs truncate">{sig.reasoning}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </SpotlightCard>

                  {/* Risk-Adjusted Signals */}
                  {analysisResult.risk_adjusted_signals?.length > 0 && (
                    <SpotlightCard className="glass-panel rounded-2xl p-5" spotlightColor="rgba(251,191,36,0.08)">
                      <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                        <iconify-icon icon="solar:shield-warning-linear" className="text-amber-400" />
                        Risk-Adjusted Signals
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {analysisResult.risk_adjusted_signals.map((rs, i) => (
                          <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/5">
                            <div>
                              <div className="text-base font-mono text-white font-medium">{rs.ticker}</div>
                              <div className="text-[10px] text-white/30 mt-0.5">Max: ${rs.max_position_size?.toLocaleString()}</div>
                            </div>
                            <div className="text-right">
                              <SignalBadge signal={rs.signal} />
                              <ConfidenceBar value={rs.confidence} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </SpotlightCard>
                  )}

                  {/* Portfolio Decisions */}
                  {analysisResult.portfolio_output?.positions?.length > 0 && (
                    <SpotlightCard className="glass-panel rounded-2xl p-5" spotlightColor="rgba(52,211,153,0.08)">
                      <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                        <iconify-icon icon="solar:wallet-linear" className="text-emerald-400" />
                        Portfolio Decisions
                        <span className="ml-auto text-xs text-white/30">
                          Cash: ${analysisResult.portfolio_output.cash_remaining?.toLocaleString()}
                        </span>
                      </h3>
                      <div className="space-y-3">
                        {analysisResult.portfolio_output.positions.map((pos, i) => (
                          <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-black/40 border border-white/5">
                            <div className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${ACTION_STYLES[pos.action?.toLowerCase()] || ACTION_STYLES.hold}`}>
                              {pos.action}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-white font-medium">{pos.ticker}</span>
                                <span className="text-white/30 text-xs">×{pos.quantity}</span>
                                <ConfidenceBar value={pos.confidence} />
                              </div>
                              <p className="text-[11px] text-white/40 mt-1">{pos.reasoning}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </SpotlightCard>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: Backtesting ────────────────────────────────────────────────── */}
        {activeTab === 'backtest' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-5">
              <SpotlightCard className="glass-panel rounded-2xl p-5" spotlightColor="rgba(16,185,129,0.12)">
                <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                  <iconify-icon icon="solar:graph-up-linear" className="text-emerald-400" />
                  Backtest Configuration
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Tickers</label>
                    <input value={btTickers} onChange={e => setBtTickers(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Start Date</label>
                      <input type="date" value={btStartDate} onChange={e => setBtStartDate(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">End Date</label>
                      <input type="date" value={btEndDate} onChange={e => setBtEndDate(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Starting Cash ($)</label>
                    <input type="number" value={btCash} onChange={e => setBtCash(Number(e.target.value))}
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Frequency</label>
                    <select value={btFrequency} onChange={e => setBtFrequency(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  {/* Protection */}
                  <div className="border-t border-white/5 pt-4">
                    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">Downside Protection (%)</p>
                    <div className="space-y-3">
                      {[
                        { label: 'Stop Loss', val: btStopLoss, setter: setBtStopLoss },
                        { label: 'Trailing Stop', val: btTrailingStop, setter: setBtTrailingStop },
                        { label: 'Take Profit', val: btTakeProfit, setter: setBtTakeProfit },
                      ].map(({ label, val, setter }) => (
                        <div key={label} className="flex items-center gap-3">
                          <label className="text-xs text-white/50 w-24 flex-shrink-0">{label}</label>
                          <input type="number" value={val} onChange={e => setter(e.target.value === '' ? '' : Number(e.target.value))} placeholder="—"
                            className="flex-1 bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </SpotlightCard>

              <StarBorder as="button" onClick={runBacktest} disabled={btLoading} color="#10b981" speed="4s" className={`w-full ${btLoading ? 'opacity-30 cursor-not-allowed' : ''}`}>
                <span className="flex items-center justify-center gap-2">
                  {btLoading ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Running Backtest...</> : <><iconify-icon icon="solar:graph-up-linear" />Run Backtest</>}
                </span>
              </StarBorder>
            </div>

            <div className="lg:col-span-2">
              {btError && (
                <div className="glass-panel rounded-2xl p-5 border border-red-500/20 bg-red-500/5 mb-5">
                  <p className="text-sm text-red-300">{btError}</p>
                </div>
              )}
              {btLoading && (
                <div className="glass-panel rounded-2xl p-16 text-center">
                  <div className="w-16 h-16 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin mx-auto mb-6" />
                  <h3 className="text-lg font-medium text-white mb-2">Running Backtest</h3>
                  <p className="text-sm text-white/30">Simulating {btTickers} from {btStartDate} to {btEndDate}…</p>
                </div>
              )}
              {!btResult && !btLoading && !btError && (
                <div className="glass-panel rounded-2xl p-16 text-center">
                  <iconify-icon icon="solar:graph-up-linear" width="48" className="text-white/20 mb-4 block" />
                  <h3 className="text-lg font-medium text-white mb-2">Configure & Run</h3>
                  <p className="text-sm text-white/30">Set date range and tickers, then run the historical simulation</p>
                </div>
              )}
              {btResult && (
                <SpotlightCard className="glass-panel rounded-2xl p-6" spotlightColor="rgba(16,185,129,0.1)">
                  <h3 className="text-sm font-medium text-white mb-5">Backtest Results — {btResult.tickers?.join(', ')}</h3>
                  {btResult.results?.summary && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                      {Object.entries(btResult.results.summary).map(([k, v]) => (
                        <div key={k} className="p-4 rounded-xl bg-black/40 border border-white/5">
                          <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">{k.replace(/_/g, ' ')}</div>
                          <div className="text-lg font-medium text-white">{String(v)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {btResult.results?.trades && (
                    <div>
                      <h4 className="text-xs text-white/40 uppercase tracking-widest mb-3">Trade Log</h4>
                      <div className="max-h-96 overflow-y-auto space-y-2 scrollbar-hide">
                        {btResult.results.trades.slice(0, 50).map((t: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-white/5 text-xs">
                            <span className={`px-2 py-0.5 rounded font-bold ${t.action === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>{t.action}</span>
                            <span className="font-mono text-white">{t.ticker}</span>
                            <span className="text-white/40">×{t.quantity}</span>
                            <span className="text-white/60">@ ${t.price?.toFixed(2)}</span>
                            <span className="ml-auto text-white/30">{t.date}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {!btResult.results?.summary && !btResult.results?.trades && (
                    <pre className="text-xs text-white/50 overflow-auto max-h-96">{JSON.stringify(btResult.results, null, 2)}</pre>
                  )}
                </SpotlightCard>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: Paper Trading ──────────────────────────────────────────────── */}
        {activeTab === 'paper' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-5">
              <SpotlightCard className="glass-panel rounded-2xl p-5" spotlightColor="rgba(79,143,255,0.12)">
                <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                  <iconify-icon icon="solar:wallet-linear" className="text-blue-400" />
                  Paper Trade Config
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Tickers to Trade</label>
                    <input value={ptTickers} onChange={e => setPtTickers(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Starting Cash ($)</label>
                    <input type="number" value={ptCash} onChange={e => setPtCash(Number(e.target.value))}
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" />
                  </div>
                </div>
              </SpotlightCard>

              <div className="space-y-2">
                <StarBorder as="button" onClick={runPaperTrade} disabled={ptLoading} color="#4f8fff" speed="4s" className={`w-full ${ptLoading ? 'opacity-30 cursor-not-allowed' : ''}`}>
                  <span className="flex items-center justify-center gap-2">
                    {ptLoading ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Running Cycle...</> : <><iconify-icon icon="solar:play-circle-linear" />Run Trading Cycle</>}
                  </span>
                </StarBorder>
                <button onClick={resetPaperPortfolio} disabled={ptLoading}
                  className="w-full py-2.5 rounded-xl border border-white/10 text-white/40 hover:text-white hover:bg-white/5 text-sm transition-all">
                  Reset Portfolio (${ptCash.toLocaleString()})
                </button>
              </div>
              {ptError && <div className="glass-panel rounded-2xl p-4 border border-red-500/20 bg-red-500/5"><p className="text-xs text-red-300">{ptError}</p></div>}
            </div>

            <div className="lg:col-span-2 space-y-5">
              {paperPortfolio ? (
                <>
                  {/* Portfolio Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Total Value', val: `$${paperPortfolio.total_value?.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, color: 'text-white' },
                      { label: 'Cash', val: `$${paperPortfolio.cash?.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, color: 'text-blue-400' },
                      { label: 'Positions', val: Object.keys(paperPortfolio.positions || {}).length.toString(), color: 'text-purple-400' },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="glass-panel rounded-2xl p-5 text-center">
                        <div className={`text-2xl font-medium tracking-tight ${color}`}>{val}</div>
                        <div className="text-[10px] text-white/30 uppercase tracking-widest mt-1">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Positions */}
                  {Object.keys(paperPortfolio.positions).length > 0 && (
                    <SpotlightCard className="glass-panel rounded-2xl p-5" spotlightColor="rgba(79,143,255,0.1)">
                      <h3 className="text-sm font-medium text-white mb-4">Open Positions</h3>
                      <div className="space-y-2">
                        {Object.entries(paperPortfolio.positions).map(([ticker, pos]) => {
                          const pnl = (pos.current_price - pos.avg_cost) * pos.shares;
                          const pnlPct = ((pos.current_price / pos.avg_cost) - 1) * 100;
                          return (
                            <div key={ticker} className="flex items-center gap-4 p-4 rounded-xl bg-black/40 border border-white/5">
                              <div className="font-mono text-white font-medium w-16">{ticker}</div>
                              <div className="text-xs text-white/40">{pos.shares} shares</div>
                              <div className="text-xs text-white/60">avg ${pos.avg_cost?.toFixed(2)}</div>
                              <div className="text-xs text-white/60">now ${pos.current_price?.toFixed(2)}</div>
                              <div className={`ml-auto text-sm font-medium ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {pnl >= 0 ? '+' : ''}${pnl.toFixed(0)} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </SpotlightCard>
                  )}

                  {/* Trade History */}
                  {paperPortfolio.trades?.length > 0 && (
                    <SpotlightCard className="glass-panel rounded-2xl p-5" spotlightColor="rgba(79,143,255,0.1)">
                      <h3 className="text-sm font-medium text-white mb-4">Recent Trades</h3>
                      <div className="max-h-72 overflow-y-auto space-y-2 scrollbar-hide">
                        {[...paperPortfolio.trades].reverse().slice(0, 30).map((t, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-white/5 text-xs">
                            <span className={`px-2 py-0.5 rounded font-bold ${t.action === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>{t.action}</span>
                            <span className="font-mono text-white">{t.ticker}</span>
                            <span className="text-white/40">×{t.quantity}</span>
                            <span className="text-white/60">@ ${t.price?.toFixed(2)}</span>
                            <span className="text-white/40 ml-auto">${t.total?.toFixed(0)}</span>
                            <span className="text-white/20">{t.timestamp ? new Date(t.timestamp).toLocaleDateString() : ''}</span>
                          </div>
                        ))}
                      </div>
                    </SpotlightCard>
                  )}
                </>
              ) : (
                <div className="glass-panel rounded-2xl p-16 text-center">
                  <iconify-icon icon="solar:wallet-linear" width="48" className="text-white/20 mb-4 block" />
                  <h3 className="text-lg font-medium text-white mb-2">No Portfolio Yet</h3>
                  <p className="text-sm text-white/30">Set your starting cash and run a trading cycle</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: Risk Monitor ──────────────────────────────────────────────── */}
        {activeTab === 'risk' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {analysisResult?.risk_adjusted_signals?.length ? (
                <>
                  {/* Correlation Groups */}
                  <SpotlightCard className="glass-panel rounded-2xl p-6" spotlightColor="rgba(251,191,36,0.1)">
                    <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                      <iconify-icon icon="solar:shield-warning-linear" className="text-amber-400" />
                      Risk-Adjusted Signals
                    </h3>
                    <div className="space-y-3">
                      {analysisResult.risk_adjusted_signals.map((rs, i) => (
                        <div key={i} className="p-4 rounded-xl bg-black/40 border border-white/5">
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-mono text-white">{rs.ticker}</span>
                            <SignalBadge signal={rs.signal} />
                          </div>
                          <ConfidenceBar value={rs.confidence} />
                          <div className="text-[10px] text-white/30 mt-2">Max position: ${rs.max_position_size?.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </SpotlightCard>

                  {/* Portfolio Rules */}
                  <SpotlightCard className="glass-panel rounded-2xl p-6" spotlightColor="rgba(82,39,255,0.1)">
                    <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                      <iconify-icon icon="solar:shield-check-bold" className="text-purple-400" />
                      Risk Rules Active
                    </h3>
                    <ul className="space-y-3">
                      {[
                        { rule: 'Correlation Cap', desc: 'Correlated groups capped at 40% of portfolio', icon: 'solar:link-linear', color: 'text-blue-400' },
                        { rule: 'Volatility Penalty', desc: 'High-vol stocks get confidence haircut', icon: 'solar:danger-triangle-linear', color: 'text-amber-400' },
                        { rule: 'Position Limits', desc: 'Single position max 20% of portfolio', icon: 'solar:lock-linear', color: 'text-purple-400' },
                        { rule: 'Consensus Vote', desc: 'Only act when majority of analysts agree', icon: 'solar:users-group-two-rounded-linear', color: 'text-emerald-400' },
                      ].map(({ rule, desc, icon, color }) => (
                        <li key={rule} className="flex items-start gap-3 p-3 rounded-xl bg-black/40 border border-white/5">
                          <iconify-icon icon={icon} className={`${color} mt-0.5 flex-shrink-0`} />
                          <div>
                            <div className="text-sm text-white font-medium">{rule}</div>
                            <div className="text-[11px] text-white/40 mt-0.5">{desc}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </SpotlightCard>
                </>
              ) : (
                <div className="col-span-2 glass-panel rounded-2xl p-16 text-center">
                  <iconify-icon icon="solar:shield-warning-linear" width="48" className="text-white/20 mb-4 block" />
                  <h3 className="text-lg font-medium text-white mb-2">Run Analysis First</h3>
                  <p className="text-sm text-white/30">Run a multi-agent analysis to see risk signal data here</p>
                  <button onClick={() => setActiveTab('analyze')}
                    className="mt-6 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors">
                    Go to Analysis →
                  </button>
                </div>
              )}
            </div>

            {/* Always-On Rules */}
            <SpotlightCard className="glass-panel rounded-2xl p-6" spotlightColor="rgba(82,39,255,0.05)">
              <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                <iconify-icon icon="solar:code-circle-linear" className="text-white/40" />
                Hard-Coded Guard Rails
                <span className="text-[10px] text-white/30 ml-auto">Never overridden by AI</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { code: `if portfolio_value < start * 0.92:\n  liquidate_all()`, label: 'Stop-Loss Trigger', color: 'border-red-500/20' },
                  { code: `if corr(A, B, 60d) > 0.7:\n  group_cap = 0.40`, label: 'Correlation Cap', color: 'border-amber-500/20' },
                  { code: `max_position = 0.20\n# per ticker`, label: 'Position Limit', color: 'border-blue-500/20' },
                ].map(({ code, label, color }) => (
                  <div key={label} className={`p-4 rounded-xl bg-black/60 border ${color}`}>
                    <pre className="text-[11px] text-emerald-300 font-mono mb-2 whitespace-pre">{code}</pre>
                    <div className="text-[10px] text-white/40 uppercase tracking-widest">{label}</div>
                  </div>
                ))}
              </div>
            </SpotlightCard>
          </div>
        )}
      </div>
    </main>
  );
}
