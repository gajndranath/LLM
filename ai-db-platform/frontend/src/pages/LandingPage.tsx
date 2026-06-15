import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  Database, Zap, Lock, Users, Server, CheckCircle2, 
  ArrowRight, LayoutDashboard, Code, ShieldCheck,
  BarChart, Globe, Cpu, Blocks, Rocket, ChevronRight
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
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />
      </div>

      {/* ── Navbar ── */}
      <nav className="relative z-50 border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Database className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Atlas AI
            </span>
          </div>

          <div className="flex items-center gap-6">
            {!isAuthenticated ? (
              <>
                <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                  Log in
                </Link>
                <button 
                  onClick={() => navigate('/register-org')}
                  className="px-5 py-2.5 rounded-lg bg-white text-black font-semibold text-sm hover:bg-slate-200 transition-all flex items-center gap-2"
                >
                  Get Started <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button 
                onClick={handleCTA}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold text-sm hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2"
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-blue-500/30 text-blue-400 text-sm font-medium mb-8">
            <Zap className="w-4 h-4" /> The Next Generation Database Intelligence
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
            The Ultimate AI Database <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
              Companion for Enterprises
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed">
            Atlas AI is an intelligent wrapper over your existing SQL databases. Eliminate manual query writing, automate schema audits, and generate complex architectural blueprints just by chatting.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={handleCTA}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white text-black font-bold text-lg hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
            >
              Start Free Trial <ChevronRight className="w-5 h-5" />
            </button>
            <a href="#features" className="w-full sm:w-auto px-8 py-4 rounded-xl glass border border-white/10 font-bold text-lg hover:bg-white/5 transition-all flex items-center justify-center">
              Explore Features
            </a>
          </div>
        </section>

        {/* ── Who is this for? ── */}
        <section className="py-24 px-6 bg-black/40 border-y border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Built for Every Data Professional</h2>
              <p className="text-slate-400 text-lg">Empowering teams to interact with data at the speed of thought.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: <Blocks className="w-8 h-8 text-blue-400" />,
                  title: "CTOs & Architects",
                  desc: "Perform deep architectural audits, detect structural flaws, and auto-deploy optimized schema blueprints safely."
                },
                {
                  icon: <BarChart className="w-8 h-8 text-purple-400" />,
                  title: "Data Analysts",
                  desc: "Translate natural language questions into highly complex, optimized SQL queries in milliseconds."
                },
                {
                  icon: <Globe className="w-8 h-8 text-emerald-400" />,
                  title: "Operations Teams",
                  desc: "Instantly retrieve critical business data and insights without needing any prior SQL knowledge."
                }
              ].map((item, i) => (
                <div key={i} className="p-8 rounded-2xl glass border border-white/10 hover:border-white/20 transition-all">
                  <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center mb-6">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Core Features ── */}
        <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Platform Capabilities</h2>
            <p className="text-slate-400 text-lg">A full suite of database intelligence tools.</p>
          </div>

          <div className="space-y-24">
            {/* Feature 1 */}
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1 space-y-6">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Rocket className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-3xl font-bold">AI Query Copilot</h3>
                <p className="text-slate-400 text-lg leading-relaxed">
                  Stop wrestling with JOINs and window functions. Talk to your database in plain English. Atlas AI understands your schema and instantly translates your questions into highly optimized, dialect-specific SQL.
                </p>
                <ul className="space-y-3">
                  {['Natural Language to SQL', 'Explain & Optimize slow queries', 'Data visualizer & table inspector'].map((txt, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-300">
                      <CheckCircle2 className="w-5 h-5 text-blue-400" /> {txt}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 w-full relative">
                <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
                <div className="relative glass border border-white/10 rounded-2xl p-6 shadow-2xl">
                  <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-4">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="space-y-4 font-mono text-sm">
                    <div className="text-slate-400">{"// User: Find top 5 customers by revenue this month"}</div>
                    <div className="text-emerald-400">SELECT users.name, SUM(orders.amount) as revenue</div>
                    <div className="text-blue-400">FROM users JOIN orders ON users.id = orders.user_id</div>
                    <div className="text-purple-400">WHERE orders.created_at &gt;= date_trunc('month', current_date)</div>
                    <div className="text-orange-400">GROUP BY users.name ORDER BY revenue DESC LIMIT 5;</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-12">
              <div className="flex-1 space-y-6">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-3xl font-bold">AI Architect & Design Studio</h3>
                <p className="text-slate-400 text-lg leading-relaxed">
                  Actively monitor your database for structural anti-patterns. Use the interactive Design Studio to chat with the AI, generate complete migration blueprints, and deploy them directly to your live database safely.
                </p>
                <ul className="space-y-3">
                  {['Automated Schema Auditing', 'Auto-generated Rollback Scripts', 'Chat-to-Schema interactive canvas'].map((txt, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-300">
                      <CheckCircle2 className="w-5 h-5 text-purple-400" /> {txt}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 w-full relative">
                <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full" />
                <div className="relative glass border border-white/10 rounded-2xl p-6 shadow-2xl bg-slate-900/80">
                   <div className="flex flex-col gap-4">
                     <div className="bg-white/5 p-4 rounded-lg border border-red-500/30">
                       <h4 className="text-red-400 font-bold text-sm mb-1">Issue Detected: Missing Index</h4>
                       <p className="text-xs text-slate-400">Table 'transactions' is frequently queried by 'user_id' but lacks an index.</p>
                     </div>
                     <div className="bg-emerald-500/10 p-4 rounded-lg border border-emerald-500/30">
                       <h4 className="text-emerald-400 font-bold text-sm mb-1">Proposed Fix</h4>
                       <code className="text-xs text-slate-300 block bg-black/50 p-2 rounded mt-2">
                         CREATE INDEX idx_user_id ON transactions(user_id);
                       </code>
                       <button className="mt-3 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded text-xs font-bold hover:bg-emerald-500/30">Deploy Fix</button>
                     </div>
                   </div>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1 space-y-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-3xl font-bold">Multi-Tenant Organization Management</h3>
                <p className="text-slate-400 text-lg leading-relaxed">
                  Enterprise-grade security and team management. Create organizations, invite your entire team, and assign strict Role-Based Access Controls (RBAC) to ensure your data stays secure.
                </p>
                <ul className="space-y-3">
                  {['Role-based access (Admin, Analyst, Viewer)', 'Organization-wide API limits & Billing', 'Secure database credential vault'].map((txt, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" /> {txt}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 w-full grid grid-cols-2 gap-4">
                 <div className="glass p-6 rounded-2xl border border-white/10 text-center">
                    <Users className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                    <div className="font-bold">Team Invites</div>
                    <div className="text-xs text-slate-400 mt-1">Seamless collaboration</div>
                 </div>
                 <div className="glass p-6 rounded-2xl border border-white/10 text-center">
                    <Lock className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                    <div className="font-bold">RBAC Security</div>
                    <div className="text-xs text-slate-400 mt-1">Strict role enforcement</div>
                 </div>
                 <div className="glass p-6 rounded-2xl border border-white/10 text-center">
                    <Server className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                    <div className="font-bold">Multi-DB Pools</div>
                    <div className="text-xs text-slate-400 mt-1">Connect Postgres & MySQL</div>
                 </div>
                 <div className="glass p-6 rounded-2xl border border-white/10 text-center">
                    <Code className="w-8 h-8 text-orange-400 mx-auto mb-3" />
                    <div className="font-bold">Audit Logs</div>
                    <div className="text-xs text-slate-400 mt-1">Trace every execution</div>
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing Summary ── */}
        <section className="py-24 px-6 bg-black/40 border-y border-white/5">
           <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Simple, Transparent Pricing</h2>
              <p className="text-slate-400 text-lg mb-12">Start for free, upgrade when your team scales.</p>
              
              <div className="grid sm:grid-cols-3 gap-6">
                 {[
                   { name: 'Free', price: '$0', queries: '50 AI Queries / day', users: 'Up to 2 Staff', highlight: false },
                   { name: 'Pro', price: '₹2,999/mo', queries: '500 AI Queries / day', users: 'Up to 10 Staff', highlight: true },
                   { name: 'Mega', price: '₹9,999/mo', queries: 'Unlimited AI Queries', users: 'Unlimited Staff', highlight: false }
                 ].map((plan, i) => (
                   <div key={i} className={`p-8 rounded-2xl border ${plan.highlight ? 'bg-blue-600/10 border-blue-500 shadow-xl shadow-blue-500/20' : 'glass border-white/10'} flex flex-col items-center justify-center`}>
                     <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                     <div className="text-3xl font-extrabold mb-4">{plan.price}</div>
                     <div className="text-sm text-slate-300 space-y-2 mb-6">
                       <div>{plan.queries}</div>
                       <div>{plan.users}</div>
                     </div>
                     <button onClick={handleCTA} className={`w-full py-2 rounded-lg font-bold ${plan.highlight ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-white/10 hover:bg-white/20'}`}>
                        Choose {plan.name}
                     </button>
                   </div>
                 ))}
              </div>
           </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-12 px-6 mt-12 bg-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-500" />
            <span className="text-lg font-bold tracking-tight">Atlas AI</span>
          </div>
          <div className="text-sm text-slate-500">
            © {new Date().getFullYear()} Atlas Intelligence Platform. All rights reserved.
          </div>
          <div className="flex gap-6 text-sm text-slate-400">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
