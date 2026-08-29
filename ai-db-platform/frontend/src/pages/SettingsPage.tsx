import { useState } from 'react';
import { 
  Building, 
  Shield, 
  Key, 
  Bell, 
  Save, 
  Loader2, 
  Copy
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

const SettingsPage = () => {
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<'org' | 'security' | 'api' | 'notifications'>('org');

  // Org Settings State
  const [orgName, setOrgName] = useState(user?.organizationName || 'fireTech');
  const [billingEmail, setBillingEmail] = useState(user?.email || 'admin@firetech.io');
  const [saving, setSaving] = useState(false);

  // Security / Password State
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  // API Key State
  const [apiKey, setApiKey] = useState('atlas_live_9f83b27c6e1a4d958204e1f7');
  const [generatingKey, setGeneratingKey] = useState(false);

  // Notifications State
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [driftAlerts, setDriftAlerts] = useState(true);
  const [budgetAlerts, setBudgetAlerts] = useState(false);

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Organization profile updated successfully');
    }, 800);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) return toast.error('Passwords do not match');
    if (newPass.length < 8) return toast.error('Password must be at least 8 characters');
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      toast.success('Password updated successfully');
    }, 1000);
  };

  const handleRotateKey = () => {
    setGeneratingKey(true);
    setTimeout(() => {
      const newK = 'atlas_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      setApiKey(newK);
      setGeneratingKey(false);
      toast.success('New API key generated! Please save it securely.');
    }, 1000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Organization Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Manage tenant configurations, API credentials, security policies, and alerting preferences.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/5 pb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('org')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'org' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Building size={14} /> <span>General Profile</span>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'security' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Shield size={14} /> <span>Security & Auth</span>
        </button>
        <button
          onClick={() => setActiveTab('api')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'api' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Key size={14} /> <span>API Keys & Webhooks</span>
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'notifications' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Bell size={14} /> <span>Alerts & Notifications</span>
        </button>
      </div>

      {/* ── 1. General Profile Tab ── */}
      {activeTab === 'org' && (
        <form onSubmit={handleSaveOrg} className="glass p-8 rounded-3xl border border-white/5 space-y-6 max-w-2xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Building size={18} className="text-blue-400" />
            <span>Organization Details</span>
          </h2>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Company Name</label>
            <input
              type="text"
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Billing & Invoicing Email</label>
            <input
              type="email"
              value={billingEmail}
              onChange={e => setBillingEmail(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Primary Cloud Region</label>
            <select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40">
              <option>AWS Mumbai (ap-south-1)</option>
              <option>AWS US-East (us-east-1)</option>
              <option>AWS Frankfurt (eu-central-1)</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl text-xs flex items-center space-x-2 active:scale-95 transition-all shadow-lg shadow-blue-600/20"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>Save Changes</span>
          </button>
        </form>
      )}

      {/* ── 2. Security Tab ── */}
      {activeTab === 'security' && (
        <form onSubmit={handleUpdatePassword} className="glass p-8 rounded-3xl border border-white/5 space-y-6 max-w-2xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield size={18} className="text-emerald-400" />
            <span>Update Account Password</span>
          </h2>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Current Password</label>
            <input
              type="password"
              required
              value={currentPass}
              onChange={e => setCurrentPass(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">New Password</label>
            <input
              type="password"
              required
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              placeholder="Min 8 characters"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPass}
              onChange={e => setConfirmPass(e.target.value)}
              placeholder="Min 8 characters"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl text-xs flex items-center space-x-2 active:scale-95 transition-all shadow-lg shadow-emerald-600/20"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>Update Password</span>
          </button>
        </form>
      )}

      {/* ── 3. API Keys Tab ── */}
      {activeTab === 'api' && (
        <div className="glass p-8 rounded-3xl border border-white/5 space-y-6 max-w-3xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Key size={18} className="text-purple-400" />
            <span>Developer API Key & CI/CD Token</span>
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Use this bearer token to authenticate automated GitHub Actions CI/CD migration safety scans and programmatically query schemas.
          </p>

          <div className="bg-black/40 p-4 rounded-2xl border border-white/10 flex items-center justify-between gap-4 font-mono text-xs text-slate-200">
            <span className="truncate">{apiKey}</span>
            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(apiKey)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 transition-colors"
                title="Copy Key"
              >
                <Copy size={16} />
              </button>
            </div>
          </div>

          <button
            onClick={handleRotateKey}
            disabled={generatingKey}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 active:scale-95 transition-all shadow-lg shadow-purple-600/20"
          >
            {generatingKey ? <Loader2 size={14} className="animate-spin" /> : <span>Rotate API Key</span>}
          </button>
        </div>
      )}

      {/* ── 4. Notifications Tab ── */}
      {activeTab === 'notifications' && (
        <div className="glass p-8 rounded-3xl border border-white/5 space-y-6 max-w-2xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Bell size={18} className="text-amber-400" />
            <span>Automated Sentinel Alerting</span>
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
              <div>
                <p className="text-sm font-bold text-white">Live Schema Drift Alarms</p>
                <p className="text-xs text-slate-400">Receive instant alerts when untracked DDL mutations occur.</p>
              </div>
              <input
                type="checkbox"
                checked={driftAlerts}
                onChange={e => setDriftAlerts(e.target.checked)}
                className="w-5 h-5 rounded accent-blue-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
              <div>
                <p className="text-sm font-bold text-white">Security & Auth Email Alerts</p>
                <p className="text-xs text-slate-400">Notify upon new logins or staff privilege changes.</p>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={e => setEmailAlerts(e.target.checked)}
                className="w-5 h-5 rounded accent-blue-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
              <div>
                <p className="text-sm font-bold text-white">Monthly Usage Quota Warnings</p>
                <p className="text-xs text-slate-400">Get notified when nearing daily AI token query limits.</p>
              </div>
              <input
                type="checkbox"
                checked={budgetAlerts}
                onChange={e => setBudgetAlerts(e.target.checked)}
                className="w-5 h-5 rounded accent-blue-600 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
