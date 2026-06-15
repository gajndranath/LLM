import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  Database, Zap, Lock, Users, Server, CheckCircle2, 
  ArrowRight, LayoutDashboard, Code, ShieldCheck,
  BarChart, Globe, Cpu, Blocks, Rocket, ChevronRight,
  GitBranch, Search, ShieldAlert, LineChart, FileJson
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
      
      {/* ── Background Effects ── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] right-[-10%] w-[30%] h-[40%] bg-emerald-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />
      </div>

      {/* ── Navbar ── */}
      <nav className="relative z-50 border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Database className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Atlas AI
            </span>
          </div>

          <div className="flex items-center gap-6">
            {!isAuthenticated ? (
              <>
                <Link to="/login" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
                  Log in
                </Link>
                <button 
                  onClick={() => navigate('/register-org')}
                  className="px-5 py-2.5 rounded-lg bg-white text-black font-bold text-sm hover:bg-slate-200 transition-all flex items-center gap-2"
                >
                  Get Started <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button 
                onClick={handleCTA}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        {/* ── Hero Section ── */}
        <section className="pt-32 pb-20 px-6 text-center max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold mb-8">
            <Zap className="w-4 h-4" /> The Senior Principal AI Database Architect
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
            Build, Audit, and Query <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
              at the Speed of Thought
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed">
            Atlas AI is your enterprise database companion. Replace manual migrations, complex JOINs, and performance bottlenecks with chat-to-schema blueprints, deep architectural audits, and natural language analytics.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={handleCTA}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white text-black font-bold text-lg hover:bg-slate-200 transition-all flex items-center justify-center gap-2 transform hover:scale-105"
            >
              Start Free Trial <ChevronRight className="w-5 h-5" />
            </button>
            <a href="#features" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white/5 border border-white/10 font-bold text-lg hover:bg-white/10 transition-all flex items-center justify-center">
              Explore Platform
            </a>
          </div>
        </section>

        {/* ── How It Works Pipeline ── */}
        <section className="py-12 px-6">
           <div className="max-w-5xl mx-auto">
             <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative">
                {/* Connecting Line */}
                <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-emerald-500/20 -z-10" />
                
                <div className="flex-1 bg-black/40 border border-white/10 p-6 rounded-2xl text-center relative z-10 backdrop-blur-md">
                   <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20"><Database /></div>
                   <h3 className="font-bold mb-2">1. Connect Securely</h3>
                   <p className="text-sm text-slate-400">Attach Postgres or MySQL databases securely via our encrypted vault.</p>
                </div>
                <ArrowRight className="text-slate-600 hidden md:block shrink-0" />
                <div className="flex-1 bg-black/40 border border-white/10 p-6 rounded-2xl text-center relative z-10 backdrop-blur-md">
                   <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center mx-auto mb-4 border border-purple-500/20"><Search /></div>
                   <h3 className="font-bold mb-2">2. Chat & Audit</h3>
                   <p className="text-sm text-slate-400">Ask questions in plain English or request a deep architectural audit.</p>
                </div>
                <ArrowRight className="text-slate-600 hidden md:block shrink-0" />
                <div className="flex-1 bg-black/40 border border-white/10 p-6 rounded-2xl text-center relative z-10 backdrop-blur-md">
                   <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20"><LineChart /></div>
                   <h3 className="font-bold mb-2">3. Visualize & Deploy</h3>
                   <p className="text-sm text-slate-400">Get NL insights, ERD diagrams, and safely deploy rollback-ready SQL.</p>
                </div>
             </div>
           </div>
        </section>

        {/* ── Who is this for? Personas ── */}
        <section className="py-24 px-6 bg-slate-900/40 border-y border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-extrabold mb-4">Empowering Every Data Persona</h2>
              <p className="text-slate-400 text-lg">Stop bottlenecking your data requests. A tool designed for the entire enterprise.</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: <Blocks className="w-6 h-6 text-blue-400" />,
                  title: "CTOs & VP Eng",
                  desc: "Guarantee scalable architectures, enforce ACID compliance, and reduce cloud costs via query optimization and caching strategies."
                },
                {
                  icon: <Database className="w-6 h-6 text-purple-400" />,
                  title: "Senior DBAs",
                  desc: "Automate schema migrations, generate visual ERDs instantly, and deploy changes safely with auto-generated rollback scripts."
                },
                {
                  icon: <Server className="w-6 h-6 text-indigo-400" />,
                  title: "Freelance Developers",
                  desc: "Scale your clients' databases with confidence. Instantly generate professional ERDs, audit schemas, and deliver enterprise-grade databases faster."
                },
                {
                  icon: <BarChart className="w-6 h-6 text-emerald-400" />,
                  title: "Data Analysts",
                  desc: "Bypass complex SQL writing. Ask questions in plain English and instantly receive automated charts, insights, and anomaly reports."
                },
                {
                  icon: <Code className="w-6 h-6 text-orange-400" />,
                  title: "Junior Developers",
                  desc: "Learn from the AI Principal Architect. Audit your schema, identify N+1 query risks, and understand the 'why' behind index optimization."
                },
                {
                  icon: <Globe className="w-6 h-6 text-pink-400" />,
                  title: "Product Teams",
                  desc: "Retrieve critical business metrics independently. Use the platform's multi-tenant RBAC to safely access restricted dashboards."
                }
              ].map((item, i) => (
                <div key={i} className="p-6 rounded-2xl bg-black/30 border border-white/5 hover:border-white/20 transition-all group">
                  <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white">{item.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Market Comparison ── */}
        <section className="py-24 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4">The Market is Broken. We Fixed It.</h2>
            <p className="text-slate-400 text-lg max-w-3xl mx-auto">
              Traditional tools are too slow, and generic AI chatbots hallucinate destructive SQL. Atlas AI bridges the gap by offering context-aware, principal-level database intelligence that actually understands your schema.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl bg-red-500/5 border border-red-500/20 shadow-2xl shadow-red-500/5">
              <h3 className="text-2xl font-bold text-red-400 mb-6 flex items-center gap-2"><ShieldAlert /> The Old Way (The Problem)</h3>
              <ul className="space-y-4 text-slate-300">
                <li className="flex items-start gap-3"><span className="text-red-400 mt-1">✗</span> <strong>Generic AI Hallucinations:</strong> ChatGPT doesn't know your foreign keys, leading to invalid or destructive SQL.</li>
                <li className="flex items-start gap-3"><span className="text-red-400 mt-1">✗</span> <strong>Waiting on DBAs:</strong> Analysts wait weeks for the data engineering team just to write a complex JOIN query.</li>
                <li className="flex items-start gap-3"><span className="text-red-400 mt-1">✗</span> <strong>Blind Deployments:</strong> Migrating schema changes manually often results in locked tables and downtime.</li>
                <li className="flex items-start gap-3"><span className="text-red-400 mt-1">✗</span> <strong>Hidden Bottlenecks:</strong> Finding N+1 queries or missing composite indexes only happens *after* the database crashes.</li>
              </ul>
            </div>
            <div className="p-8 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 shadow-2xl shadow-emerald-500/5">
              <h3 className="text-2xl font-bold text-emerald-400 mb-6 flex items-center gap-2"><ShieldCheck /> The Atlas Way (The Solution)</h3>
              <ul className="space-y-4 text-slate-300">
                <li className="flex items-start gap-3"><span className="text-emerald-400 mt-1">✓</span> <strong>Context-Aware Execution:</strong> Atlas connects directly to your DB. Every query generated is 100% syntactically valid and dialect-specific.</li>
                <li className="flex items-start gap-3"><span className="text-emerald-400 mt-1">✓</span> <strong>Instant Analytics:</strong> Business teams get data visualizations and NL insights in 2 seconds. No SQL required.</li>
                <li className="flex items-start gap-3"><span className="text-emerald-400 mt-1">✓</span> <strong>Safe Rollbacks:</strong> Every single schema change is accompanied by an auto-generated `DROP/CASCADE` rollback script.</li>
                <li className="flex items-start gap-3"><span className="text-emerald-400 mt-1">✓</span> <strong>Proactive Audits:</strong> Atlas scans your entire schema and gives a Scalability Score *before* production traffic hits.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── Deep Feature Bento Box ── */}
        <section id="features" className="py-24 px-6 max-w-7xl mx-auto space-y-32">
          
          {/* Feature Block 1: AI Architect */}
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-wider">
                <Cpu className="w-4 h-4" /> AI Architect & Design Studio
              </div>
              <h2 className="text-4xl font-extrabold leading-tight">Your 20-Year Principal DBA. Available 24/7.</h2>
              <p className="text-lg text-slate-400 leading-relaxed">
                Don't just generate SQL. Atlas acts as a Senior Architect that strictly enforces <strong className="text-white">1NF/2NF/3NF Normalization</strong>, validates <strong className="text-white">ACID compliance</strong>, and guarantees zero data redundancy.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                 <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="font-bold text-purple-400 mb-1 flex items-center gap-2"><GitBranch className="w-4 h-4" /> Auto-ERD & DFD</div>
                    <div className="text-sm text-slate-400">Instantly generates Mermaid-based Entity-Relationship and Data Flow diagrams.</div>
                 </div>
                 <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="font-bold text-red-400 mb-1 flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Safe Rollbacks</div>
                    <div className="text-sm text-slate-400">Every schema deployment comes with an auto-generated `DROP/CASCADE` rollback script.</div>
                 </div>
                 <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="font-bold text-emerald-400 mb-1 flex items-center gap-2"><Search className="w-4 h-4" /> Smart Indexing</div>
                    <div className="text-sm text-slate-400">Recommends B-Tree for equality, GIN for JSONB/Text, and GiST for PostGIS.</div>
                 </div>
                 <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="font-bold text-blue-400 mb-1 flex items-center gap-2"><Server className="w-4 h-4" /> Scalability Audits</div>
                    <div className="text-sm text-slate-400">Scans for N+1 risks, suggests table partitioning, and evaluates Redis caching needs.</div>
                 </div>
              </div>
            </div>
            
            <div className="flex-1 w-full relative">
               <div className="absolute inset-0 bg-purple-500/20 blur-[100px] rounded-full" />
               <div className="relative bg-[#0f172a] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
                 <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700 flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-red-500" />
                   <div className="w-3 h-3 rounded-full bg-yellow-500" />
                   <div className="w-3 h-3 rounded-full bg-green-500" />
                   <span className="ml-2 text-xs text-slate-400 font-mono">atlas_architect_audit.json</span>
                 </div>
                 <div className="p-6 font-mono text-sm leading-relaxed overflow-hidden">
                   <span className="text-slate-400">{"{"}</span><br/>
                   <span className="text-slate-400">  "executive_summary": </span><span className="text-emerald-300">"Schema lacks cursor pagination. At 10M rows, OFFSET will cause 500ms+ latency."</span>,<br/>
                   <span className="text-slate-400">  "scalability_score": </span><span className="text-orange-400">62</span>,<br/>
                   <span className="text-slate-400">  "critical_mistakes": [</span><br/>
                   <span className="text-red-300">    "Missing index on foreign key orders.user_id",</span><br/>
                   <span className="text-red-300">    "3NF Violation: Address repeated in users table"</span><br/>
                   <span className="text-slate-400">  ],</span><br/>
                   <span className="text-slate-400">  "suggested_fixes": [</span><br/>
                   <span className="text-slate-400">    {"{"}</span><br/>
                   <span className="text-slate-400">      "sql": </span><span className="text-blue-300">"CREATE INDEX CONCURRENTLY idx_user_id ON orders(user_id);"</span>,<br/>
                   <span className="text-slate-400">      "rollback_sql": </span><span className="text-blue-300">"DROP INDEX IF EXISTS idx_user_id;"</span><br/>
                   <span className="text-slate-400">    {"}"}</span><br/>
                   <span className="text-slate-400">  ]</span><br/>
                   <span className="text-slate-400">{"}"}</span>
                 </div>
               </div>
            </div>
          </div>

          {/* Feature Block 2: SQL Copilot & Analytics */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
            <div className="flex-1 space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
                <Rocket className="w-4 h-4" /> Query Copilot & Analytics
              </div>
              <h2 className="text-4xl font-extrabold leading-tight">From Plain English to Actionable Insights.</h2>
              <p className="text-lg text-slate-400 leading-relaxed">
                We go far beyond generating SQL. Atlas AI executes your natural language queries, analyzes the raw data, and returns a comprehensive intelligence report.
              </p>
              <ul className="space-y-4">
                {[
                  { title: "Anomaly Detection", desc: "The AI scans query results to find statistical outliers and unexpected null values." },
                  { title: "Automated Visualization", desc: "Instantly generates beautiful Bar, Line, and Pie charts directly from your data." },
                  { title: "Query Optimization", desc: "Identifies sequential scans and suggests composite indexes to speed up slow queries." }
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                    <CheckCircle2 className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-white">{item.title}</h4>
                      <p className="text-sm text-slate-400 mt-1">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="flex-1 w-full relative">
               <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full" />
               <div className="relative bg-[#0f172a] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl p-6">
                 {/* Mock UI for Insights */}
                 <div className="bg-slate-900 border border-white/10 rounded-xl p-4 mb-4">
                   <div className="text-xs text-slate-500 font-mono mb-2">Prompt</div>
                   <div className="text-white">"Show me revenue trends for Q3. Did any region underperform?"</div>
                 </div>
                 <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4 space-y-3">
                   <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                     <FileJson className="w-4 h-4" /> AI Generated Insights
                   </div>
                   <p className="text-sm text-slate-300">Revenue grew by 14% overall, but the <strong className="text-white">EU Region dropped by 8%</strong>.</p>
                   <div className="bg-red-500/10 text-red-400 p-2 rounded text-xs border border-red-500/20">
                     <strong>Anomaly Detected:</strong> 42 orders in Germany failed payment processing on Sept 14th.
                   </div>
                 </div>
                 <div className="h-32 bg-gradient-to-t from-blue-500/20 to-transparent rounded-xl border-b-2 border-blue-500 flex items-end justify-between px-6 pt-4 pb-0">
                    <div className="w-8 bg-blue-500/40 rounded-t-sm h-[40%]" />
                    <div className="w-8 bg-blue-500/60 rounded-t-sm h-[60%]" />
                    <div className="w-8 bg-blue-500/80 rounded-t-sm h-[85%]" />
                    <div className="w-8 bg-blue-400 rounded-t-sm h-[100%]" />
                    <div className="w-8 bg-red-400/80 rounded-t-sm h-[30%]" />
                 </div>
               </div>
            </div>
          </div>

          {/* Feature Block 3: Enterprise Security & Billing */}
          <div className="flex flex-col lg:flex-row items-center gap-16">
             <div className="flex-1 space-y-8">
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                 <ShieldCheck className="w-4 h-4" /> Multi-Tenant & Security
               </div>
               <h2 className="text-4xl font-extrabold leading-tight">Enterprise-Grade Security & Organization Management.</h2>
               <p className="text-lg text-slate-400 leading-relaxed">
                 Atlas AI is built for teams. Manage multiple database connections safely, enforce strict Role-Based Access Controls (RBAC), and manage billing transparently via Razorpay.
               </p>
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/5 text-center">
                     <Lock className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                     <h4 className="font-bold text-white mb-1">Encrypted Vault</h4>
                     <p className="text-xs text-slate-400">AES-256 encrypted DB credentials. We never store plain text.</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/5 text-center">
                     <Users className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                     <h4 className="font-bold text-white mb-1">Strict RBAC</h4>
                     <p className="text-xs text-slate-400">Admin, Analyst, and Viewer roles prevent unauthorized DDL.</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/5 text-center">
                     <Code className="w-8 h-8 text-orange-400 mx-auto mb-3" />
                     <h4 className="font-bold text-white mb-1">Audit Logs</h4>
                     <p className="text-xs text-slate-400">Track exactly who executed which query and when.</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/5 text-center">
                     <CreditCard className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                     <h4 className="font-bold text-white mb-1">Dynamic Billing</h4>
                     <p className="text-xs text-slate-400">Razorpay integrated quota tracking to prevent runaway LLM costs.</p>
                  </div>
               </div>
             </div>
             <div className="flex-1 w-full relative h-[400px]">
                <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full" />
                <div className="absolute inset-0 border border-white/10 rounded-2xl bg-slate-900/80 backdrop-blur-xl p-8 flex flex-col justify-center">
                   <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-black/50 rounded-xl border border-white/5">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">JD</div>
                           <div>
                              <div className="text-sm font-bold text-white">John Doe</div>
                              <div className="text-xs text-slate-400">Super Admin</div>
                           </div>
                         </div>
                         <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full">Full Access</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-black/50 rounded-xl border border-white/5">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">AS</div>
                           <div>
                              <div className="text-sm font-bold text-white">Alice Smith</div>
                              <div className="text-xs text-slate-400">Data Analyst</div>
                           </div>
                         </div>
                         <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full">Read Only (SELECT)</span>
                      </div>
                      
                      <div className="mt-8 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl">
                         <div className="flex justify-between items-end mb-2">
                            <span className="text-sm font-bold text-white">Pro Plan Quota</span>
                            <span className="text-xs text-slate-400">342 / 500 Queries</span>
                         </div>
                         <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 w-[68%]" />
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </section>

        {/* ── IDE Extension Banner ── */}
        <section className="py-12 px-6">
          <div className="max-w-5xl mx-auto bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px] pointer-events-none" />
            
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider mb-6">
                <Rocket className="w-4 h-4" /> Coming Soon
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Atlas AI in your IDE</h2>
              <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-8">
                We are bringing the power of the Senior Principal DBA directly to your editor. Soon you will be able to download and install the Atlas AI extension for <strong className="text-white">VS Code, Zed, and Antigravity</strong>.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-bold text-slate-400">
                <div className="px-4 py-2 bg-black/40 rounded-lg border border-white/10 flex items-center gap-2">
                  <Code className="w-4 h-4" /> VS Code
                </div>
                <div className="px-4 py-2 bg-black/40 rounded-lg border border-white/10 flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Zed
                </div>
                <div className="px-4 py-2 bg-black/40 rounded-lg border border-white/10 flex items-center gap-2">
                  <Database className="w-4 h-4" /> Antigravity
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing Summary ── */}
        <section className="py-24 px-6 bg-slate-900/40 border-y border-white/5 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
           <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />
           
           <div className="max-w-5xl mx-auto relative z-10">
              <div className="text-center mb-16">
                 <h2 className="text-4xl md:text-5xl font-extrabold mb-6">Invest in Intelligence, Not Overhead.</h2>
                 <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                   Hiring a Senior DBA costs upwards of $150k/year. Atlas AI gives your entire team principal-level database intelligence for a fraction of the cost.
                 </p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-8">
                 {[
                   { name: 'Free', price: '₹0', period: 'forever', desc: 'Perfect for exploring the platform.', queries: '50 AI Queries / day', users: 'Up to 2 Staff', highlight: false },
                   { name: 'Pro', price: '₹2,999', period: 'per month', desc: 'For growing teams needing deep audits.', queries: '500 AI Queries / day', users: 'Up to 10 Staff', highlight: true },
                   { name: 'Mega', price: '₹9,999', period: 'per month', desc: 'Enterprise limits and priority support.', queries: 'Unlimited AI Queries', users: 'Unlimited Staff', highlight: false }
                 ].map((plan, i) => (
                   <div key={i} className={`p-8 rounded-3xl border transition-all ${plan.highlight ? 'bg-gradient-to-b from-blue-900/20 to-slate-900/50 border-blue-500 shadow-2xl shadow-blue-500/20 scale-105 relative z-10' : 'bg-black/40 border-white/10 hover:border-white/20'} flex flex-col`}>
                     {plan.highlight && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-blue-500 text-white text-xs font-bold rounded-full tracking-widest uppercase">Most Popular</div>}
                     <h3 className="text-xl font-bold mb-2 text-white">{plan.name}</h3>
                     <p className="text-sm text-slate-400 mb-6 h-10">{plan.desc}</p>
                     <div className="mb-8">
                       <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                       <span className="text-slate-500 text-sm">/{plan.period}</span>
                     </div>
                     <div className="space-y-4 mb-8 flex-1">
                       <div className="flex items-center gap-3 text-sm text-slate-300">
                         <CheckCircle2 className={`w-5 h-5 ${plan.highlight ? 'text-blue-400' : 'text-slate-500'}`} /> {plan.queries}
                       </div>
                       <div className="flex items-center gap-3 text-sm text-slate-300">
                         <CheckCircle2 className={`w-5 h-5 ${plan.highlight ? 'text-blue-400' : 'text-slate-500'}`} /> {plan.users}
                       </div>
                       <div className="flex items-center gap-3 text-sm text-slate-300">
                         <CheckCircle2 className={`w-5 h-5 ${plan.highlight ? 'text-blue-400' : 'text-slate-500'}`} /> 100% ACID Compliance
                       </div>
                       <div className="flex items-center gap-3 text-sm text-slate-300">
                         <CheckCircle2 className={`w-5 h-5 ${plan.highlight ? 'text-blue-400' : 'text-slate-500'}`} /> ERD & DFD Generation
                       </div>
                     </div>
                     <button onClick={handleCTA} className={`w-full py-3.5 rounded-xl font-bold transition-all ${plan.highlight ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/25' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                        Get Started with {plan.name}
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
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-500" />
            <span className="text-xl font-bold tracking-tight text-white">Atlas AI</span>
          </div>
          <div className="text-sm text-slate-500 font-medium">
            © {new Date().getFullYear()} Atlas Intelligence Platform. Engineered for Scale.
          </div>
          <div className="flex gap-6 text-sm font-semibold text-slate-400">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Documentation</a>
            <a href="#" className="hover:text-white transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Simple Mock Icon for CreditCard since it wasn't imported at top
function CreditCard(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}

export default LandingPage;
