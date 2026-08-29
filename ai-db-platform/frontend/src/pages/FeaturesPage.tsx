import { Link, useNavigate } from 'react-router-dom';
import { 
  Layers, 
  ShieldCheck, 
  CheckCircle2, 
  Database,
  ArrowLeft,
  Zap,
  RefreshCcw,
  Terminal
} from 'lucide-react';

const FeaturesPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <nav className="border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Database className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Atlas AI Platform Suite</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
              <ArrowLeft size={14} /> Back to Overview
            </Link>
            <button 
              onClick={() => navigate('/register-org')}
              className="px-4 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-slate-200 transition-all"
            >
              Start 7-Day Trial
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-20 space-y-24">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
            <Zap size={14} /> Complete Enterprise Feature Catalog
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight">
            The Autonomous Engine Powering Modern Databases
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Atlas AI abstracts the complexity of database administration, 3NF schema design, SQL optimization, and migration safety into a unified multi-agent platform.
          </p>
        </div>

        {/* ── Feature 1: 3NF Architect Studio ── */}
        <div className="glass p-10 md:p-14 rounded-[3rem] border border-white/10 grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Layers size={24} />
            </div>
            <h2 className="text-3xl font-extrabold text-white">1. AI 3NF Architect & Visual ERD Canvas</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Describe business entities in plain English. Atlas calculates transitive dependencies, enforces third-normal form (3NF), standardizes primary/foreign keys, and renders live interactive Mermaid ERD/DFD diagrams.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-400" /> Automatic cardinality detection (1:1, 1:N, N:M)</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-400" /> Composite B-Tree & GIN index synthesis</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-400" /> Dialect-specific DDL generation for PostgreSQL & MySQL</li>
            </ul>
          </div>
          <div className="p-6 rounded-2xl bg-black/50 border border-white/5 font-mono text-xs text-purple-300 space-y-2">
            <div className="text-slate-500">// Mathematical 3NF Verification</div>
            <div>STATUS: 3NF_NORMALIZED</div>
            <div>REDUNDANCY_CHECK: 0% DUPLICATION</div>
            <div>FOREIGN_KEYS: ENFORCED (ON DELETE CASCADE)</div>
            <div>INDEXING: COMPOSITE (tenant_id, created_at)</div>
          </div>
        </div>

        {/* ── Feature 2: AST Safety Gatekeeper & LIFO Rollback ── */}
        <div className="glass p-10 md:p-14 rounded-[3rem] border border-white/10 grid md:grid-cols-2 gap-10 items-center">
          <div className="p-6 rounded-2xl bg-black/50 border border-white/5 font-mono text-xs text-red-300 space-y-2 order-2 md:order-1">
            <div className="text-slate-500">// AST Safety Guard & Rollback Execution</div>
            <div>INTERCEPT: DROP TABLE / ALTER LOCK</div>
            <div>EVALUATION: TABLE_EXCLUSIVE_LOCK HAZARD</div>
            <div>ACTION: GENERATED LIFO REVERSE MIGRATION</div>
            <div>STATUS: ZERO-DOWNTIME SAFE</div>
          </div>
          <div className="space-y-6 order-1 md:order-2">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400">
              <ShieldCheck size={24} />
            </div>
            <h2 className="text-3xl font-extrabold text-white">2. Silicon AST Gatekeeper & LIFO Rollbacks</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Every DDL migration is parsed into an abstract syntax tree (AST) to detect dangerous table locks or destructive column drops. Atlas automatically generates corresponding reverse-order LIFO rollback scripts for instant rollback.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-red-400" /> Non-blocking `CONCURRENTLY` index enforcement</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-red-400" /> One-click automated reverse migration execution</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-red-400" /> Zero data-loss dry run transaction validation</li>
            </ul>
          </div>
        </div>

        {/* ── Feature 3: Out-of-Band Schema Drift Sentinel ── */}
        <div className="glass p-10 md:p-14 rounded-[3rem] border border-white/10 grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <RefreshCcw size={24} />
            </div>
            <h2 className="text-3xl font-extrabold text-white">3. Out-of-Band Schema Drift Sentinel</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              When engineers make ad-hoc changes in staging or local GUI clients (DBeaver, pgAdmin), Atlas calculates SHA-256 state fingerprints to identify schema divergence and alerts your team before staging discrepancies crash production.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400" /> Real-time DDL drift diff visualizer</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400" /> Side-by-side table and index comparison</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400" /> Automated synchronization remediation scripts</li>
            </ul>
          </div>
          <div className="p-6 rounded-2xl bg-black/50 border border-white/5 font-mono text-xs text-amber-300 space-y-2">
            <div className="text-slate-500">// SHA-256 Fingerprint Delta</div>
            <div>EXPECTED: e3b0c44298fc1c149afbf4c8996fb924</div>
            <div>ACTUAL:   8f43b12a67e91c451afdb3c7784ec819</div>
            <div>DIFF:     MISSING_INDEX (orders.created_at)</div>
            <div>ACTION:   ALERT DISPATCHED</div>
          </div>
        </div>

        {/* ── Feature 4: Natural Language Text-to-SQL Copilot ── */}
        <div className="glass p-10 md:p-14 rounded-[3rem] border border-white/10 grid md:grid-cols-2 gap-10 items-center">
          <div className="p-6 rounded-2xl bg-black/50 border border-white/5 font-mono text-xs text-blue-300 space-y-2 order-2 md:order-1">
            <div className="text-slate-500">// Natural Language Execution</div>
            <div>INPUT:  "Show monthly revenue by country"</div>
            <div>SQL:    SELECT country, SUM(total) FROM orders...</div>
            <div>LATENCY: 14ms (OPTIMIZED VIA B-TREE)</div>
            <div>CHARTS: AUTO-GENERATED REVENUE BAR CHART</div>
          </div>
          <div className="space-y-6 order-1 md:order-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Terminal size={24} />
            </div>
            <h2 className="text-3xl font-extrabold text-white">4. Natural Language SQL Copilot & Visual Analytics</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Empower developers and business stakeholders to query databases in plain English. Atlas writes 100% verified dialect-specific SQL, runs it in a safe read-only sandbox, and outputs instant charts and anomaly insights.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-400" /> Read-only transaction enforcement (`READ ONLY`)</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-400" /> Automated chart rendering (Bar, Line, Pie)</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-400" /> Query performance and execution time profiling</li>
            </ul>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center bg-gradient-to-r from-blue-900/30 via-indigo-900/30 to-purple-900/30 p-12 rounded-3xl border border-white/10 space-y-6">
          <h2 className="text-3xl font-extrabold text-white">Ready to Automate Your Database Engineering?</h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Join developers, Shopify merchants, and fast-growing startups using Atlas AI to prevent outages and build zero-downtime schemas.
          </p>
          <button 
            onClick={() => navigate('/register-org')}
            className="px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-all shadow-xl shadow-white/10 active:scale-95 text-sm"
          >
            Start Your 7-Day Free Pass →
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-500 bg-black">
        © {new Date().getFullYear()} Atlas AI Intelligence Platform. All rights reserved.
      </footer>
    </div>
  );
};

export default FeaturesPage;
