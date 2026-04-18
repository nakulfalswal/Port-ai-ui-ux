'use client';

import React from 'react';

const DocsPage = () => {
  return (
    <main className="pt-24 pb-12 px-6 max-w-7xl mx-auto flex gap-12">
      {/* Sidebar Navigation */}
      <aside className="w-64 shrink-0 hidden md:block">
        <div className="sticky top-32 space-y-8">
           <div>
             <h4 className="text-xs font-bold text-white mb-3 uppercase tracking-widest">Getting Started</h4>
             <ul className="text-sm text-white/50 space-y-2">
               <li><a href="#" className="hover:text-white transition-colors">Platform Overview</a></li>
               <li><a href="#" className="hover:text-white transition-colors">Connecting Exchanges</a></li>
               <li><a href="#" className="text-blue-400 font-medium">System Architecture</a></li>
             </ul>
           </div>
           
           <div>
             <h4 className="text-xs font-bold text-white mb-3 uppercase tracking-widest">Core Engines</h4>
             <ul className="text-sm text-white/50 space-y-2">
               <li><a href="#" className="hover:text-white transition-colors">AI Reasoning Pipeline</a></li>
               <li><a href="#" className="hover:text-white transition-colors">Sentiment Analysis</a></li>
               <li><a href="#" className="hover:text-white transition-colors">Behavioral Biases</a></li>
               <li><a href="#" className="hover:text-white transition-colors">Risk Scoring Models</a></li>
             </ul>
           </div>

           <div>
             <h4 className="text-xs font-bold text-white mb-3 uppercase tracking-widest">Developer API</h4>
             <ul className="text-sm text-white/50 space-y-2">
               <li><a href="#" className="hover:text-white transition-colors">Authentication</a></li>
               <li><a href="#" className="hover:text-white transition-colors">Endpoints</a></li>
               <li><a href="#" className="hover:text-white transition-colors">Webhooks</a></li>
             </ul>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <article className="flex-1 max-w-3xl prose prose-invert">
        <div className="mb-12">
           <h1 className="text-4xl font-medium tracking-tight text-white mb-4">System Architecture</h1>
           <p className="text-white/60 text-lg">Understanding the data flow and AI models behind PortAI's financial intelligence.</p>
        </div>

        <div className="space-y-12">
           <section>
              <h2 className="text-2xl font-medium text-white mb-4">1. High-Level Overview</h2>
              <p className="text-white/70 text-sm leading-relaxed mb-6">
                PortAI operates on a microservices architecture designed for high availability and low latency data processing. The system aggregates data from multiple disparate sources (exchanges, news APIs, economic feeds), normalizes it, and feeds it into our proprietary neural reasoning engine.
              </p>
              
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 mb-6">
                 <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                   <iconify-icon icon="solar:server-square-linear"></iconify-icon> API Gateway
                 </h3>
                 <p className="text-xs text-white/50 leading-relaxed mb-4">Routes requests to appropriate worker nodes for Market Data (FastAPI), User Portfolios, or AI Generation.</p>
                 
                 <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                   <iconify-icon icon="solar:database-linear"></iconify-icon> Data Lake Cache
                 </h3>
                 <p className="text-xs text-white/50 leading-relaxed">Redis clusters ensure that high-frequency pricing data and recent news sentiment scores are available in &lt;10ms.</p>
              </div>
           </section>

           <section>
              <h2 className="text-2xl font-medium text-white mb-4">2. AI Reasoning Pipeline</h2>
              <p className="text-white/70 text-sm leading-relaxed mb-4">
                The core of PortAI is the Reasoning Pipeline. When a user requests an intelligence report, the following sequence occurs:
              </p>
              <ol className="list-decimal pl-5 text-sm text-white/70 space-y-3">
                 <li><strong>Data Ingestion:</strong> User portfolio data is combined with real-time market quotes via <code>yfinance</code>.</li>
                 <li><strong>Sentiment Aggregation:</strong> News headlines from <code>NewsAPI</code> and <code>Finnhub</code> are processed through a localized DistilBERT model to generate continuous sentiment scores (-1 to 1).</li>
                 <li><strong>Context Assembly:</strong> A comprehensive JSON payload is assembled containing the user's risk tolerance, portfolio weights, and current market context.</li>
                 <li><strong>LLM Analysis:</strong> The context is passed to our fine-tuned Large Language Model acting as the "Advisor".</li>
                 <li><strong>Report Structuring:</strong> The raw LLM output is parsed into structured JSON conforming to our Report Schema for UI rendering.</li>
              </ol>
           </section>

           <section>
              <h2 className="text-2xl font-medium text-white mb-4">3. Risk Scoring Model</h2>
              <p className="text-white/70 text-sm leading-relaxed">
                Risk is not a single number; it's a multi-dimensional surface. We evaluate risk across three primary axes:
              </p>
              <div className="mt-6 flex flex-col gap-4">
                 <div className="flex gap-4 p-4 rounded-xl border border-white/10">
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                       <iconify-icon icon="solar:graph-down-linear"></iconify-icon>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-white mb-1">Concentration Risk</h4>
                      <p className="text-xs text-white/50">Measured via the Herfindahl-Hirschman Index (HHI) across sectors and asset classes.</p>
                    </div>
                 </div>
                 
                 <div className="flex gap-4 p-4 rounded-xl border border-white/10">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
                       <iconify-icon icon="solar:hourglass-line-linear"></iconify-icon>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-white mb-1">Behavioral Risk</h4>
                      <p className="text-xs text-white/50">Pattern matching against known investor biases (e.g., disposition effect, herd behavior).</p>
                    </div>
                 </div>
              </div>
           </section>
        </div>
      </article>
    </main>
  );
};

export default DocsPage;
