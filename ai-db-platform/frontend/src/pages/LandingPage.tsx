import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  Database, Zap, Lock, CheckCircle2, 
  ArrowRight, LayoutDashboard, ShieldCheck,
  Cpu, ChevronRight, ShieldAlert, Star,
  RefreshCcw, Layers, Terminal, Building2,
  TrendingUp, Activity, Users, Globe
} from 'lucide-react';

const LandingPage = () => {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  const handleCTA = () => {
    if (isAuthenticated) {
      if (user?.role === 'SUPER_ADMIN') navigate('/super-admin');
      else navigate('/dashboard');
    } else {
      navigate('/register-org');
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-blue-500/30 font-sans overflow-x-hidden">
      
      {/* ── Background Cyber Glow Effects ── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-blue-600/20 rounded-full blur-[150px]" />
        <div className="absolute top-[35%] right-[-10%] w-[35%] h-[45%] bg-purple-600/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[45%] h-[45%] bg-emerald-600/15 rounded-full blur-[150px]" />
      </div>

      {/* ── Top Psychological Urgency Banner ── */}
      <div className="relative z-50 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-4 py-2.5 text-center text-xs font-bold text-white flex items-center justify-center gap-2">
        <span className="bg-white text-blue-600 px-2 py-0.5 rounded-full uppercase text-[10px] font-black tracking-wider animate-pulse">
          7-Day Enterprise Pass
        </span>
        <span>Unlock Autonomous 4-Agent Architect, AST Silicon Gatekeeper & Zero-Downtime CI/CD PR Gates. Zero credit card needed.</span>
        <button onClick={handleCTA} className="underline hover:text-slate-200 ml-2 font-black">Claim Instant Pass →</button>
      </div>

      {/* ── Navbar ── */}
      <nav className="relative z-50 border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-all">
              <Database className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Atlas AI
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-400">
            <Link to="/features" className="hover:text-white transition-colors text-blue-400">Features Suite</Link>
            <a href="#problem" className="hover:text-white transition-colors">Outage Hazards</a>
            <a href="#agents" className="hover:text-white transition-colors">4-Agent AI</a>
            <a href="#personas" className="hover:text-white transition-colors">Who is This For?</a>
            <a href="#security" className="hover:text-white transition-colors">Security Vault</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <Link to="/docs" className="hover:text-white transition-colors">Docs</Link>
          </div>

          <div className="flex items-center gap-6">
            {!isAuthenticated ? (
              <>
                <Link to="/login" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
                  Log in
                </Link>
                <button 
                  onClick={() => navigate('/register-org')}
                  className="px-5 py-2.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-slate-200 transition-all flex items-center gap-2 shadow-lg shadow-white/10 active:scale-95"
                >
                  Start Free Trial <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button 
                onClick={handleCTA}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2 active:scale-95"
              >
                <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        
        {/* ── 1. Hero Section (Psychological Hook + High Conversion) ── */}
        <section className="pt-24 pb-20 px-6 text-center max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-8">
            <Zap className="w-4 h-4" /> The Autonomous Multi-Agent Database Reliability Engineer (DBRE)
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
            One Bad Migration Costs $300k/hr. <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
              Atlas Prevents It Before You Merge.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed">
            Atlas AI acts as your 24/7 Principal Database Architect. By combining <strong className="text-white">Multi-Agent DAG Consensus</strong>, <strong className="text-white">Silicon AST Syntax Gatekeepers</strong>, and <strong className="text-white">Live Out-of-Band Schema Drift Detection</strong>, Atlas guarantees mathematically normalized 3NF blueprints with zero data loss.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button 
              onClick={handleCTA}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-black font-bold text-lg hover:bg-slate-200 transition-all flex items-center justify-center gap-2 transform hover:scale-105 shadow-xl shadow-white/10 active:scale-95"
            >
              Claim 7-Day Free Enterprise Pass <ChevronRight className="w-5 h-5" />
            </button>
            <Link to="/docs" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/5 border border-white/10 font-bold text-lg hover:bg-white/10 transition-all flex items-center justify-center text-slate-300">
              Read Architecture Whitepaper
            </Link>
          </div>

          {/* Social Proof Badges */}
          <div className="pt-8 border-t border-white/5 flex flex-wrap items-center justify-center gap-8 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-2"><ShieldCheck className="text-emerald-400 w-4 h-4" /> SOC-2 Type II Certified Vault</div>
            <div className="flex items-center gap-2"><Lock className="text-blue-400 w-4 h-4" /> AES-256-GCM Zero-Plaintext Security</div>
            <div className="flex items-center gap-2"><Activity className="text-purple-400 w-4 h-4" /> Postgres, MySQL, Mongo, Redis, SQLite</div>
            <div className="flex items-center gap-1 text-amber-400"><Star className="w-4 h-4 fill-amber-400" /><Star className="w-4 h-4 fill-amber-400" /><Star className="w-4 h-4 fill-amber-400" /><Star className="w-4 h-4 fill-amber-400" /><Star className="w-4 h-4 fill-amber-400" /> <span className="text-slate-400 ml-1">4.9/5 Rating (50k+ Queries Audited)</span></div>
          </div>

          {/* ── Trusted By & Engineering Endorsement ── */}
          <div className="mt-16 pt-10 border-t border-white/5">
            <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-6 font-bold">
              Engineering Heritage & Enterprise Trust
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14">
              <a
                href="https://www.linkedin.com/company/galas-it-solutions"
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center space-x-2.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white font-bold text-sm tracking-wider shadow-lg transition-all active:scale-95 group"
                title="View Galas IT Solutions on LinkedIn"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                <span>GALAS IT SOLUTIONS</span>
                <span className="text-[10px] text-blue-400 group-hover:translate-x-0.5 transition-transform">↗</span>
              </a>
            </div>

            {/* Lead Architect Attribution */}
            <a
              href="https://www.linkedin.com/in/gajndra/"
              target="_blank"
              rel="noreferrer noopener"
              className="mt-8 inline-flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/30 rounded-2xl px-5 py-3 shadow-xl backdrop-blur-md transition-all active:scale-95 group text-left"
              title="View Gajendra Nath Tripathi on LinkedIn"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-500/30 group-hover:scale-105 transition-transform">
                GT
              </div>
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  Gajendra Nath Tripathi
                  <span className="text-[10px] font-normal text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 font-mono">Lead Architect</span>
                  <span className="text-[10px] text-slate-400 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all">↗</span>
                </p>
                <p className="text-[11px] text-slate-400">
                  Ex-Software Engineer @ <strong className="text-slate-200">Galas IT Solutions</strong> • Creator of Schemio Engine
                </p>
              </div>
            </a>
          </div>
        </section>

        {/* ── 2. The $300k/hr Problem (Psychological Impact Section) ── */}
        <section id="problem" className="py-24 px-6 max-w-6xl mx-auto border-t border-white/5">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-red-400">The Hard Truth of Scaling</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mt-2 mb-4">Why Modern Databases Crash Production</h2>
            <p className="text-slate-400 text-base max-w-2xl mx-auto">
              Databases are the most fragile layer of any tech stack. When high traffic strikes, three catastrophic failures happen:
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="glass p-8 rounded-3xl border border-red-500/20 bg-red-500/5 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-400">
                <ShieldAlert size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">1. Un-Indexed Foreign Key Locks</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                A simple migration runs without `CONCURRENTLY`. The table acquires an `EXCLUSIVE LOCK`, requests queue up, memory spikes to 100%, and the entire API goes down.
              </p>
            </div>

            <div className="glass p-8 rounded-3xl border border-orange-500/20 bg-orange-500/5 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-400">
                <RefreshCcw size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">2. Silent Out-of-Band Schema Drift</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                A developer alters a column directly in DBeaver/pgAdmin on staging. Two weeks later, the production deployment crashes with unresolvable schema divergence.
              </p>
            </div>

            <div className="glass p-8 rounded-3xl border border-purple-500/20 bg-purple-500/20 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                <Terminal size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">3. ChatGPT Hallucinated Queries</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Generic LLMs don't know your foreign keys or table partitions. They generate dangerous `CROSS JOINs` and Cartesian products that exhaust server IOPS.
              </p>
            </div>
          </div>
        </section>

        {/* ── 3. The 4-Agent DAG Consensus Architecture (Core Intellectual Property) ── */}
        <section id="agents" className="py-24 px-6 max-w-7xl mx-auto border-t border-white/5">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Deterministic Multi-Agent Consensus</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mt-2 mb-4">Meet Your 4-Agent AI Engineering Board</h2>
            <p className="text-slate-400 text-base max-w-3xl mx-auto">
              Instead of unconstrained LLM loops that burn tokens, Atlas coordinates four specialized agents structured in a deterministic Directed Acyclic Graph (DAG):
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass p-8 rounded-3xl border border-white/5 space-y-4 hover:border-blue-500/40 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <Cpu size={24} />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Marcus</h3>
                <span className="text-[10px] font-mono bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Domain Architect</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Decomposes business requirements into clean entities, entity relationships, and structural cardinalities (1:1, 1:N, N:M).
              </p>
            </div>

            <div className="glass p-8 rounded-3xl border border-white/5 space-y-4 hover:border-purple-500/40 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <Layers size={24} />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Sophia</h3>
                <span className="text-[10px] font-mono bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">3NF Normalizer</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enforces strict 1NF ➔ 2NF ➔ 3NF mathematical normalization, eliminates redundant data columns, and standardizes atomic types.
              </p>
            </div>

            <div className="glass p-8 rounded-3xl border border-white/5 space-y-4 hover:border-emerald-500/40 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <TrendingUp size={24} />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Optimus</h3>
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">DBA Performance</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Synthesizes high-speed Composite B-Tree, GIN, and BRIN indexes, evaluates partition schemes, and prevents N+1 query bottlenecks.
              </p>
            </div>

            <div className="glass p-8 rounded-3xl border border-white/5 space-y-4 hover:border-red-500/40 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                <ShieldCheck size={24} />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Victor</h3>
                <span className="text-[10px] font-mono bg-red-500/20 text-red-400 px-2 py-0.5 rounded">Forensic Auditor</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Parses AST syntax trees, detects destructive `DROP` statements, flags SQL injection hazards, and generates automated LIFO rollback scripts.
              </p>
            </div>
          </div>
        </section>

        {/* ── 4. Who Uses Atlas AI? (Personas & Market Segments) ── */}
        <section id="personas" className="py-24 px-6 max-w-7xl mx-auto border-t border-white/5">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Tailored Intelligence</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mt-2 mb-4">Built for Every Tech Ecosystem</h2>
            <p className="text-slate-400 text-base max-w-3xl mx-auto">
              From solo developers building client MVPs to high-scale e-commerce stores and VC-backed enterprises:
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="glass p-8 rounded-3xl border border-white/5 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Users size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">1. Freelancers & Indie Hackers</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ship client MVPs 10x faster. Generate complete 3NF database architectures, interactive Mermaid ERD documentation, and clean migrations in under 60 seconds.
              </p>
            </div>

            <div className="glass p-8 rounded-3xl border border-white/5 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Globe size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">2. Shopify & E-Commerce Merchants</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Query customer churn, Net Merchandising Value, and inventory velocity in plain English. No SQL required—instant automated charts and financial insights.
              </p>
            </div>

            <div className="glass p-8 rounded-3xl border border-white/5 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Building2 size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">3. Growth Tech & Mega Enterprises</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enforce GitHub Actions CI/CD migration safety gates. Catch unindexed foreign keys, table-locking DDL, and silent schema drift before it hits production.
              </p>
            </div>
          </div>
        </section>

        {/* ── 5. Zero-Knowledge Security Vault Architecture ── */}
        <section id="security" className="py-24 px-6 max-w-6xl mx-auto border-t border-white/5">
          <div className="glass p-10 md:p-14 rounded-[3rem] border border-emerald-500/30 bg-emerald-500/5 relative overflow-hidden">
            <div className="relative z-10 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                <Lock size={14} /> Zero-Knowledge Credential Security Guarantee
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">
                "We Never Store or Touch Your Production Data"
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed max-w-3xl">
                Atlas AI connects strictly in <strong className="text-white">READ-ONLY Transaction Sandboxes</strong> (`SET TRANSACTION READ ONLY`). We extract table schema metadata, foreign key constraints, and column statistics—never your customers' private records or raw data.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/10">
                <div>
                  <h4 className="font-bold text-white text-sm">AES-256-GCM Vault</h4>
                  <p className="text-xs text-slate-400 mt-1">Credentials encrypted with scrypt KDF derived keys.</p>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">AST Gatekeeper</h4>
                  <p className="text-xs text-slate-400 mt-1">Every query evaluated by parse-trees before execution.</p>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Offline DDL Mode</h4>
                  <p className="text-xs text-slate-400 mt-1">Import raw schema SQL text with 0 database credentials.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 6. Pricing & ROI Calculator ── */}
        <section id="pricing" className="py-24 px-6 bg-slate-900/40 border-y border-white/5 relative overflow-hidden">
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="text-center mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Transparent Enterprise ROI</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white mt-2 mb-4">Invest in Autonomous Reliability</h2>
              <p className="text-slate-400 text-base max-w-2xl mx-auto">
                Hiring a full-time Senior DBA costs $180,000/year. Atlas delivers 24/7 infallible reliability at a fraction of the cost.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { 
                  name: 'Individual Developer', 
                  price: '₹999', 
                  usd: '$12/mo',
                  desc: 'For solo founders and engineers building fast MVPs.', 
                  dbs: '2 Active Databases', 
                  queries: '200 AI Queries / day', 
                  seats: '1 Seat',
                  highlight: false 
                },
                { 
                  name: 'Growth Team', 
                  price: '₹1,999', 
                  usd: '$24/mo',
                  desc: 'For scaling tech startups requiring proactive audits.', 
                  dbs: '10 Polyglot DBs', 
                  queries: 'Unlimited Queries', 
                  seats: '5 Seats + LIFO Rollback',
                  highlight: true 
                },
                { 
                  name: 'Mega Enterprise', 
                  price: '₹7,999', 
                  usd: '$99/mo',
                  desc: 'Full company mission control with PR safety gates.', 
                  dbs: 'Unlimited DBs', 
                  queries: 'Unlimited AI Architect & SQL', 
                  seats: '25 Seats + PR Gatekeeper',
                  highlight: false 
                }
              ].map((plan, i) => (
                <div key={i} className={`p-8 rounded-3xl border transition-all ${plan.highlight ? 'bg-gradient-to-b from-blue-900/30 to-slate-900/80 border-blue-500 shadow-2xl shadow-blue-500/20 scale-105 relative z-10' : 'bg-black/40 border-white/10 hover:border-white/20'} flex flex-col justify-between`}>
                  <div>
                    {plan.highlight && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-blue-500 text-white text-xs font-bold rounded-full tracking-widest uppercase">Most Popular</div>}
                    <h3 className="text-xl font-bold mb-2 text-white">{plan.name}</h3>
                    <p className="text-xs text-slate-400 mb-6 h-8">{plan.desc}</p>
                    <div className="mb-6">
                      <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                      <span className="text-slate-500 text-xs ml-1">({plan.usd})</span>
                    </div>
                    <div className="space-y-3 mb-8 text-xs text-slate-300">
                      <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-400" /> {plan.dbs}</div>
                      <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-400" /> {plan.queries}</div>
                      <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-400" /> {plan.seats}</div>
                      <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-400" /> 100% 3NF Normalization & Auto-Rollback</div>
                    </div>
                  </div>
                  <button onClick={handleCTA} className={`w-full py-3.5 rounded-xl font-bold text-xs transition-all ${plan.highlight ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/25 active:scale-95' : 'bg-white/10 text-white hover:bg-white/20 active:scale-95'}`}>
                    Claim 7-Day Free Pass
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-12 px-6 bg-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-500" />
            <span className="text-xl font-bold tracking-tight text-white">Atlas AI</span>
          </Link>
          <div className="text-xs text-slate-500 font-medium">
            © {new Date().getFullYear()} Atlas AI Intelligence Platform. All rights reserved.
          </div>
          <div className="flex gap-6 text-xs font-semibold text-slate-400">
            <Link to="/docs" className="hover:text-white transition-colors">Documentation</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <a href="mailto:support@firetech.io" className="hover:text-white transition-colors">Contact Support</a>
            <Link to="/login" className="hover:text-white transition-colors text-blue-400">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
