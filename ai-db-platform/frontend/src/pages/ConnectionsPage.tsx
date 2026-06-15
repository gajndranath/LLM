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

// Simplified Modal Component
const ConnectionModal = ({ onClose, initialData }: { onClose: () => void, initialData?: any }) => {
  const queryClient = useQueryClient();
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
      <div className="glass w-full max-w-2xl rounded-[3rem] p-12 relative z-10 animate-in zoom-in-95 duration-200">
        <h3 className="text-2xl font-bold mb-2">{initialData ? 'Edit Data Source' : 'Configure Data Source'}</h3>
        <p className="text-slate-400 mb-8 font-medium">{initialData ? 'Update your database connection details' : 'Connect your PostgreSQL enterprise database'}</p>

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
      </div>
    </div>
  );
};

export default ConnectionsPage;
