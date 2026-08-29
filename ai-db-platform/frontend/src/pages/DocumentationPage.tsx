import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Terminal, 
  Database, 
  ShieldCheck, 
  GitBranch, 
  Sparkles, 
  Layers, 
  ArrowLeft
} from 'lucide-react';

const DocumentationPage = () => {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans">
      {/* Header */}
      <nav className="border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Database className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Atlas AI Docs</span>
          </Link>
          <Link to="/" className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
            <ArrowLeft size={14} /> Back to Home
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-16 space-y-16">
        {/* Intro */}
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
            <BookOpen size={14} /> Enterprise Developer Guide
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Atlas AI System Architecture & Quickstart</h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Atlas AI is a multi-tenant autonomous database intelligence platform with AST verification, 3NF auto-normalization, and real-time schema drift alerting.
          </p>
        </div>

        {/* Quick Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          <div className="glass p-8 rounded-3xl border border-white/5 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Terminal size={20} />
            </div>
            <h3 className="text-lg font-bold text-white">SQL Copilot & Natural Query</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Convert plain English to dialect-specific SQL (Postgres, MySQL, Mongo, Redis, SQLite). Features automated index suggestions and query latency profiling.
            </p>
          </div>

          <div className="glass p-8 rounded-3xl border border-white/5 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Layers size={20} />
            </div>
            <h3 className="text-lg font-bold text-white">3NF AI Architect Studio</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generate full production schemas from natural language. Enforces foreign key constraints, composite indexing, and renders live Mermaid ERDs and DFDs.
            </p>
          </div>

          <div className="glass p-8 rounded-3xl border border-white/5 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <GitBranch size={20} />
            </div>
            <h3 className="text-lg font-bold text-white">CI/CD Migration Gate</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Integrate with GitHub Actions to automatically audit incoming SQL pull requests. Detects destructive table-locking queries before production merge.
            </p>
          </div>
        </div>

        {/* Step-by-Step Guide */}
        <div className="glass p-10 rounded-3xl border border-white/5 space-y-8">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Sparkles className="text-blue-400" />
            <span>Connecting Your First Database in 30 Seconds</span>
          </h2>

          <div className="space-y-6 text-sm text-slate-300">
            <div className="flex items-start gap-4">
              <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">1</span>
              <div>
                <h4 className="font-bold text-white">Create Organization & Add Connection</h4>
                <p className="text-slate-400 text-xs mt-1">Navigate to <strong>/connections</strong> and enter your database host, port, credentials, and SSL preference.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">2</span>
              <div>
                <h4 className="font-bold text-white">Run Instant Schema Extraction & Audit</h4>
                <p className="text-slate-400 text-xs mt-1">Atlas extracts table definitions, foreign keys, and indexes in &lt; 50ms and computes your Scalability Score.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">3</span>
              <div>
                <h4 className="font-bold text-white">Configure GitHub Migration CI Gate</h4>
                <p className="text-slate-400 text-xs mt-1">Add your Atlas Bearer API Token to GitHub Repository Secrets to automatically guard PRs.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Vault */}
        <div className="glass p-8 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 space-y-4">
          <div className="flex items-center gap-3 text-emerald-400 font-bold">
            <ShieldCheck size={20} />
            <span>Enterprise Security & AES-256 Vault Guarantee</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Atlas AI never stores raw database passwords. All credentials are encrypted using military-grade AES-256-GCM cipher encryption before persisting to PostgreSQL.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-500 bg-black">
        © {new Date().getFullYear()} Atlas AI Intelligence Platform. All rights reserved.
      </footer>
    </div>
  );
};

export default DocumentationPage;
