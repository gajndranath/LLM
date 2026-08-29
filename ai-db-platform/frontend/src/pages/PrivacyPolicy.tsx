import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 sm:p-12 flex justify-center">
      <div className="max-w-4xl w-full space-y-8 animate-in fade-in duration-300">
        <Link to="/" className="inline-flex items-center space-x-2 text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={16} />
          <span>Back to Platform</span>
        </Link>

        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl">
            <Shield size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Privacy Policy & Zero-Data Storage Guarantee</h1>
            <p className="text-xs text-slate-400 mt-1">Effective Date: June 2026 | Enterprise Security Standards</p>
          </div>
        </div>

        <div className="glass p-8 rounded-[2rem] border border-white/5 space-y-6 text-sm text-slate-300 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">1. Zero Customer Row Data Storage Guarantee</h2>
            <p>
              ATLAS operates on a strict <strong>Zero-Row Persistence Model</strong>. When you connect your database or run analytical queries, ATLAS extracts schema metadata (table names, column types, and indexes) to generate blueprints and audits. We <strong>never store, log, or persist your database rows or customer PII</strong> on our servers.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">2. Bank-Grade Cryptographic Encryption</h2>
            <p>
              All database connection credentials and API keys are hardware-encrypted at rest using <strong>AES-256-GCM</strong> with scrypt key derivation. Credentials are only decrypted temporarily in memory during active execution.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">3. Isolated Read-Only Transactions</h2>
            <p>
              Schema audits and explain analyses are executed strictly within <code>SET TRANSACTION READ ONLY</code> sandboxes. ATLAS will never modify, drop, or alter your production data without explicit affirmative user authorization.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">4. Compliance & Contact</h2>
            <p>
              ATLAS adheres to global privacy principles under GDPR, HIPAA, and DPDP frameworks. For security inquiries, contact our Data Protection Officer at <code>security@atlas-db.dev</code>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
