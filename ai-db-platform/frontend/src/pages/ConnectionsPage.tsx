import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { connectionsApi } from '../api/connections.api';
import {
  Database,
  Plus,
  Trash2,
  CheckCircle,
  Loader2,
  RefreshCw,
  Search,
  Edit2
} from 'lucide-react';
import { toast } from 'sonner';

const ConnectionsPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: connections, isLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => {
      const res = await connectionsApi.getConnections();
      return res.data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => connectionsApi.deleteConnection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast.success('Connection removed successfully');
    },
    onError: () => toast.error('Failed to remove connection')
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => connectionsApi.testConnection(id),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(`Connected!`);
      } else {
        toast.error(`Connection Failed: ${res.message}`);
      }
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    }
  });

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Database Connections</h2>
          <p className="text-slate-400 mt-2 font-medium">Manage your enterprise database sources</p>
        </div>
        <button
          onClick={() => { setEditingConnection(null); setIsModalOpen(true); }}
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-bold flex items-center space-x-3 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
        >
          <Plus size={20} />
          <span>Add New Source</span>
        </button>
      </header>

      {/* Filters/Search */}
      <div className="glass p-4 rounded-2xl flex items-center space-x-4 max-w-md">
        <Search className="text-slate-500" size={20} />
        <input
          type="text"
          placeholder="Filter sources..."
          className="bg-transparent border-none focus:ring-0 text-sm font-medium w-full text-white placeholder:text-slate-600"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-40">
          <Loader2 className="animate-spin text-blue-400" size={48} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.isArray(connections) && connections.map((conn: any) => (
            <div key={conn.id} className="glass p-8 rounded-[2rem] border border-white/5 hover:border-blue-500/20 transition-all group flex flex-col h-full relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 flex space-x-2">
                <button
                  onClick={() => testMutation.mutate(conn.id)}
                  disabled={testMutation.isPending}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-all border border-transparent hover:border-emerald-500/20"
                  title="Test Connection"
                >
                  {testMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                </button>
                <button
                  onClick={() => { setEditingConnection(conn); setIsModalOpen(true); }}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 transition-all border border-transparent hover:border-blue-500/20"
                  title="Edit Connection"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => deleteMutation.mutate(conn.id)}
                  disabled={deleteMutation.isPending}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
                  title="Remove Source"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="flex-1 mt-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-6">
                  <Database size={24} />
                </div>
                <h3 className="text-xl font-bold mb-1 truncate pr-20">{conn.name}</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-6 truncate">{conn.host}</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white/2 border border-white/5">
                    <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Database</p>
                    <p className="text-xs font-bold truncate text-slate-300">{conn.database_name}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/2 border border-white/5">
                    <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Port</p>
                    <p className="text-xs font-bold truncate text-slate-300">{conn.port}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {conn.last_test_ok ? (
                    <div className="flex items-center space-x-1.5 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                      <CheckCircle size={12} className="text-emerald-400" />
                      <span className="text-[10px] font-bold text-emerald-400 uppercase">Live</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1.5 bg-slate-500/10 px-2 py-1 rounded-md border border-white/5">
                      <RefreshCw size={12} className="text-slate-500" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Ready</span>
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-slate-600 font-bold uppercase tracking-tight">
                  Added {new Date(conn.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}

          <button
            onClick={() => { setEditingConnection(null); setIsModalOpen(true); }}
            className="rounded-[2rem] border-2 border-dashed border-white/10 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all flex flex-col items-center justify-center py-16 group"
          >
            <div className="p-4 rounded-full bg-white/5 group-hover:bg-blue-500/10 group-hover:scale-110 transition-all mb-4 text-slate-600 group-hover:text-blue-400">
              <Plus size={32} />
            </div>
            <span className="font-bold text-slate-500 group-hover:text-blue-400 uppercase tracking-widest text-xs">Add New Source</span>
          </button>
        </div>
      )}

      {/* Modal would go here - for now I'll create a simple placeholder form or modal component */}
      {isModalOpen && <ConnectionModal onClose={() => setIsModalOpen(false)} initialData={editingConnection} />}
    </div>
  );
};

const ConnectionModal = ({ onClose, initialData }: { onClose: () => void, initialData?: any }) => {
  const queryClient = useQueryClient();
  const [sourceType, setSourceType] = useState<'postgres' | 'zero_ddl' | 'readonly_guide' | 'shopify'>('postgres');
  const [ddlData, setDdlData] = useState({ name: '', ddlText: '' });
  const [shopifyData, setShopifyData] = useState({
    name: '',
    shopDomain: '',
    accessToken: ''
  });
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    host: initialData?.host || '',
    port: initialData?.port || 5432,
    databaseName: initialData?.database_name || '',
    username: initialData?.username || '',
    password: '', // Blank for security, unless updating
    sslEnabled: initialData ? initialData.ssl_enabled : false
  });

  const mutation = useMutation({
    mutationFn: (data: any) => {
      if (initialData) {
        return connectionsApi.updateConnection(initialData.id, data);
      }
      return connectionsApi.createConnection(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast.success(initialData ? 'Connection updated!' : 'Connection added!');
      onClose();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to process connection')
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="glass w-full max-w-2xl rounded-[3rem] p-10 relative z-10 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-bold mb-1">{initialData ? 'Edit Data Source' : 'Configure Data Source'}</h3>
        <p className="text-slate-400 mb-6 font-medium text-xs">
          Choose between Direct Connection, Zero-Password DDL Import, or Least-Privilege Read-Only access.
        </p>

        {/* Source Type Selector */}
        {!initialData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6 p-1 bg-white/5 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => setSourceType('postgres')}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-[11px] font-bold transition-all ${
                sourceType === 'postgres' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Database size={14} />
              <span>Direct Connect</span>
            </button>

            <button
              type="button"
              onClick={() => setSourceType('zero_ddl')}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-[11px] font-bold transition-all ${
                sourceType === 'zero_ddl' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📄 Zero-Pass DDL</span>
            </button>

            <button
              type="button"
              onClick={() => setSourceType('readonly_guide')}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-[11px] font-bold transition-all ${
                sourceType === 'readonly_guide' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🛡️ Read-Only Guide</span>
            </button>

            <button
              type="button"
              onClick={() => setSourceType('shopify')}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-[11px] font-bold transition-all ${
                sourceType === 'shopify' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🛍️ Shopify Store</span>
            </button>
          </div>
        )}

        {/* ── Mode 1: Zero-Password DDL Import ── */}
        {sourceType === 'zero_ddl' && !initialData ? (
          <div className="space-y-4">
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
              <p className="text-xs font-bold text-purple-300">🔒 100% Zero-Password Schema Import</p>
              <p className="text-[11px] text-slate-400 mt-1">Paste your schema DDL or tables below. No DB host, username, or passwords required. ATLAS will parse and visualize your architecture with zero cloud credentials.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Schema / Project Name</label>
              <input
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                placeholder="e.g. My Offline E-Commerce Schema"
                value={ddlData.name}
                onChange={e => setDdlData({ ...ddlData, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Paste SQL DDL (CREATE TABLE ...)</label>
              <textarea
                rows={6}
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                placeholder={`CREATE TABLE users (\n  id UUID PRIMARY KEY,\n  email VARCHAR(255) UNIQUE,\n  created_at TIMESTAMPTZ\n);`}
                value={ddlData.ddlText}
                onChange={e => setDdlData({ ...ddlData, ddlText: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button type="button" onClick={onClose} className="px-6 py-3 rounded-2xl font-bold text-xs text-slate-400 hover:text-white">Cancel</button>
              <button
                type="button"
                disabled={mutation.isPending}
                onClick={async () => {
                  if (!ddlData.name || !ddlData.ddlText) return toast.error('Name and DDL SQL are required');
                  try {
                    await connectionsApi.importDdl(ddlData);
                    queryClient.invalidateQueries({ queryKey: ['connections'] });
                    toast.success('📄 Offline DDL Blueprint parsed & saved to database!');
                    onClose();
                  } catch (err: any) {
                    toast.error(err.message || 'Failed to import DDL');
                  }
                }}
                className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-bold text-xs shadow-xl shadow-purple-600/20 active:scale-95"
              >
                Import DDL Blueprint
              </button>
            </div>
          </div>
        ) : sourceType === 'readonly_guide' && !initialData ? (
          /* ── Mode 2: Read-Only Least Privilege Guide ── */
          <div className="space-y-4">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
              <p className="text-xs font-bold text-amber-300">🛡️ Recommended Least-Privilege Role</p>
              <p className="text-[11px] text-slate-400 mt-1">Don't share your master/admin password. Run this 1-click script in PostgreSQL / Neon to create an isolated read-only user with zero DROP or DELETE permissions.</p>
            </div>
            <div className="bg-black/60 p-4 rounded-2xl border border-white/10 text-xs font-mono text-amber-200/90 relative">
              <pre className="overflow-x-auto whitespace-pre-wrap">{`-- Run on your database (AWS RDS / Neon / Supabase):
CREATE USER atlas_reader WITH PASSWORD 'atlas_secure_reader_123';
GRANT CONNECT ON DATABASE my_db TO atlas_reader;
GRANT USAGE ON SCHEMA public TO atlas_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO atlas_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO atlas_reader;`}</pre>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`CREATE USER atlas_reader WITH PASSWORD 'atlas_secure_reader_123';\nGRANT CONNECT ON DATABASE my_db TO atlas_reader;\nGRANT USAGE ON SCHEMA public TO atlas_reader;\nGRANT SELECT ON ALL TABLES IN SCHEMA public TO atlas_reader;`);
                  toast.success('📋 Read-Only SQL snippet copied to clipboard!');
                }}
                className="absolute top-3 right-3 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold rounded-lg border border-amber-500/30 active:scale-95"
              >
                Copy SQL
              </button>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button type="button" onClick={onClose} className="px-6 py-3 rounded-2xl font-bold text-xs text-slate-400 hover:text-white">Cancel</button>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    username: 'atlas_reader',
                    password: 'atlas_secure_reader_123'
                  });
                  setSourceType('postgres');
                  toast.info('Auto-filled read-only credentials. Fill in host & DB name.');
                }}
                className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-bold text-xs shadow-xl shadow-amber-600/20 active:scale-95"
              >
                Use Read-Only Credentials
              </button>
            </div>
          </div>
        ) : sourceType === 'shopify' && !initialData ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Store Name</label>
              <input
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                placeholder="e.g. My Flagship Store"
                value={shopifyData.name}
                onChange={e => setShopifyData({ ...shopifyData, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Shopify Domain</label>
              <input
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                placeholder="my-store.myshopify.com"
                value={shopifyData.shopDomain}
                onChange={e => setShopifyData({ ...shopifyData, shopDomain: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Admin API Access Token</label>
              <input
                type="password"
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxx"
                value={shopifyData.accessToken}
                onChange={e => setShopifyData({ ...shopifyData, accessToken: e.target.value })}
              />
            </div>
            {/* Demo Sandbox Alert & 1-Click Load Button */}
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-emerald-300">Don't have a Shopify Admin Token?</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Load instant demo store with 50+ mock orders, products, and customer cohorts.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShopifyData({
                    name: 'Demo Fashion Hub (Sandbox)',
                    shopDomain: 'demo-fashion-hub.myshopify.com',
                    accessToken: 'shpat_demo_sandbox_token_mock_123'
                  });
                  toast.success('⚡ Demo Store credentials auto-filled!');
                }}
                className="px-3.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all whitespace-nowrap active:scale-95"
              >
                ⚡ Load Demo Sandbox
              </button>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-2xl font-bold text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!shopifyData.shopDomain) return toast.error('Shop domain is required');
                  toast.success('🛍️ Shopify Store Connected & Sync Scheduled!');
                  onClose();
                }}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs shadow-xl shadow-emerald-600/20 active:scale-95"
              >
                Connect Store
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(formData); }} className="grid grid-cols-2 gap-6">
          <div className="col-span-2 space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Display Name</label>
            <input
              required
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              placeholder="e.g. Production Logistics DB"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Host Address</label>
            <input
              required
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              placeholder="db.example.com"
              value={formData.host}
              onChange={e => setFormData({ ...formData, host: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Port</label>
            <input
              type="number"
              required
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              value={formData.port}
              onChange={e => setFormData({ ...formData, port: parseInt(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Database Name</label>
            <input
              required
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              placeholder="postgres"
              value={formData.databaseName}
              onChange={e => setFormData({ ...formData, databaseName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Username</label>
            <input
              required
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              placeholder="db_admin"
              value={formData.username}
              onChange={e => setFormData({ ...formData, username: e.target.value })}
            />
          </div>
          <div className="col-span-2 space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
              {initialData ? 'Password (leave blank to keep current)' : 'Password'}
            </label>
            <input
              type="password"
              required={!initialData}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              placeholder={initialData ? "••••••••" : "••••••••"}
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <div className="col-span-2 flex items-center space-x-3 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
            <input
              type="checkbox"
              id="sslEnabled"
              className="w-5 h-5 rounded border-white/10 bg-white/5 text-blue-600 focus:ring-blue-500/40"
              checked={formData.sslEnabled}
              onChange={e => setFormData({ ...formData, sslEnabled: e.target.checked })}
            />
            <label htmlFor="sslEnabled" className="text-sm font-bold text-slate-300 cursor-pointer select-none">
              Enable SSL Connection (Required for Neon/Cloud DBs)
            </label>
          </div>

          <div className="col-span-2 flex justify-end space-x-4 mt-6">
            <button type="button" onClick={onClose} className="px-8 py-4 rounded-2xl font-bold text-slate-400 hover:text-white transition-all">Cancel</button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-blue-600/20 active:scale-95 disabled:opacity-50 flex items-center space-x-2"
            >
              {mutation.isPending ? <Loader2 className="animate-spin" /> : <span>{initialData ? 'Update Connection' : 'Connect Database'}</span>}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};

export default ConnectionsPage;
