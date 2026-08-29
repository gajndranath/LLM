import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { connectionsApi } from '../api/connections.api';
import { designStudioApi } from '../api/designStudio.api';
import { useWorkspaceStore } from '../store/workspaceStore';
import {
  ShieldAlert, Database, RefreshCw, AlertTriangle, CheckCircle2,
  GitCompare, Table, Columns, PlusCircle, MinusCircle,
  FileCode2, ShieldCheck, Activity
} from 'lucide-react';
import { toast } from 'sonner';

export default function SchemaDriftPage() {
  const { selectedConnectionId, setConnectionId: setSelectedConnectionId } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const [selectedTableDiff, setSelectedTableDiff] = useState<string | null>(null);

  // 1. Fetch Connections
  const { data: connections, isLoading: connectionsLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => {
      const res = await connectionsApi.getConnections();
      return res.data || [];
    }
  });

  const activeConnectionId = selectedConnectionId || (connections && connections.length > 0 ? connections[0].id : null);

  // 2. Fetch Drift Report for active connection
  const { data: driftResponse, refetch } = useQuery({
    queryKey: ['drift-report', activeConnectionId],
    queryFn: () => connectionsApi.getDriftReport(activeConnectionId!),
    enabled: !!activeConnectionId,
    refetchInterval: 20000,
  });

  const drift = driftResponse?.data;

  // 3. Sync Mutation
  const syncMutation = useMutation({
    mutationFn: () => designStudioApi.clearSchemaCache(activeConnectionId!),
    onSuccess: () => {
      toast.success('Live database schema synced to Blueprint! 🔄');
      queryClient.invalidateQueries({ queryKey: ['schema', activeConnectionId] });
      queryClient.invalidateQueries({ queryKey: ['drift-report', activeConnectionId] });
      refetch();
    },
    onError: (err: any) => toast.error(err.message || 'Sync failed')
  });

  const selectedTable = drift?.tableDiffs?.find((t: any) => t.tableName === selectedTableDiff) 
    || (drift?.tableDiffs && drift.tableDiffs.length > 0 ? drift.tableDiffs[0] : null);

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col text-slate-100 overflow-y-auto">
      {/* ── Top Header ── */}
      <header className="px-8 py-6 border-b border-white/5 bg-slate-900/40 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <GitCompare size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Schema Drift & Out-of-Band Audit
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 uppercase font-bold">
                  Live Engine
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Detect, inspect, and reconcile external database modifications made via CLI, pgAdmin, or DBeaver.
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Connection Selector */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
            <Database size={14} className="text-blue-400" />
            <select
              className="bg-transparent border-none focus:ring-0 text-xs font-semibold text-white cursor-pointer"
              value={activeConnectionId || ''}
              onChange={(e) => setSelectedConnectionId(e.target.value)}
              disabled={connectionsLoading}
            >
              {connections?.map((c: any) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || !drift?.hasDrift}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-lg shadow-amber-500/10 active:scale-95"
          >
            <RefreshCw size={13} className={syncMutation.isPending ? 'animate-spin' : ''} />
            <span>Reconcile Blueprint</span>
          </button>
        </div>
      </header>

      {/* ── Main Dashboard Content ── */}
      <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Status Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/3 border border-white/8 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sync Status</p>
              <p className="text-lg font-bold mt-1 text-white flex items-center gap-2">
                {drift?.hasDrift ? (
                  <span className="text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle size={16} /> Out of Sync
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 size={16} /> In Sync
                  </span>
                )}
              </p>
            </div>
            <div className={`p-3 rounded-xl border ${drift?.hasDrift ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
              <Activity size={18} />
            </div>
          </div>

          <div className="bg-white/3 border border-white/8 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Risk Assessment</p>
              <p className={`text-lg font-bold mt-1 uppercase ${
                drift?.riskLevel === 'HIGH' ? 'text-red-400' : drift?.riskLevel === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {drift?.riskLevel || 'LOW'} Risk
              </p>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <ShieldAlert size={18} />
            </div>
          </div>

          <div className="bg-white/3 border border-white/8 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Added Entities</p>
              <p className="text-lg font-bold mt-1 text-emerald-400">
                +{drift?.summary?.addedTables || 0} Tables
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <PlusCircle size={18} />
            </div>
          </div>

          <div className="bg-white/3 border border-white/8 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dropped Entities</p>
              <p className="text-lg font-bold mt-1 text-red-400">
                -{drift?.summary?.removedTables || 0} Tables
              </p>
            </div>
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
              <MinusCircle size={18} />
            </div>
          </div>
        </div>

        {/* ── Fingerprint Hash Row ── */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Live PostgreSQL SHA-256 Hash:</span>
            <p className="text-slate-300 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
              {drift?.liveSchemaHash || 'Computing live fingerprint...'}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Stored Blueprint SHA-256 Hash:</span>
            <p className="text-slate-300 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
              {drift?.expectedSchemaHash || 'Baseline schema recorded'}
            </p>
          </div>
        </div>

        {/* ── Side-by-Side Detailed Diff Viewer ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[420px]">
          {/* Left: Table Diff List (4 Cols) */}
          <div className="lg:col-span-4 bg-white/3 border border-white/8 rounded-2xl p-4 flex flex-col space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Table size={13} className="text-blue-400" />
                Modified Tables ({drift?.tableDiffs?.length || 0})
              </h2>
            </div>

            {drift?.tableDiffs?.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <ShieldCheck size={32} className="text-emerald-400/60 mb-2" />
                <p className="text-xs font-semibold text-slate-400">All Tables Match Blueprint</p>
                <p className="text-[10px] text-slate-600 mt-1">Zero out-of-band mutations detected.</p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[380px]">
                {drift?.tableDiffs?.map((t: any) => (
                  <div
                    key={t.tableName}
                    onClick={() => setSelectedTableDiff(t.tableName)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      (selectedTable?.tableName === t.tableName)
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                        : 'bg-white/3 border-white/5 hover:bg-white/5 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Table size={14} className="text-blue-400" />
                      <span className="text-xs font-bold">{t.tableName}</span>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                      t.status === 'ADDED' 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : t.status === 'REMOVED'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Detailed Column Changes Inspector (8 Cols) */}
          <div className="lg:col-span-8 bg-white/3 border border-white/8 rounded-2xl p-5 flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Columns size={14} className="text-purple-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  {selectedTable ? `Column Mutations for '${selectedTable.tableName}'` : 'Select a table to inspect'}
                </h3>
              </div>
              {selectedTable && (
                <span className="text-[10px] font-mono text-slate-400">
                  {selectedTable.columns?.length || 0} column diffs
                </span>
              )}
            </div>

            {!selectedTable ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                <FileCode2 size={32} className="text-slate-600 mb-2" />
                <p className="text-xs">No active drift selected</p>
              </div>
            ) : (
              <div className="space-y-2.5 overflow-y-auto max-h-[360px]">
                {selectedTable.columns.map((c: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 font-mono text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${
                        c.status === 'ADDED' ? 'bg-emerald-400' : c.status === 'REMOVED' ? 'bg-red-400' : 'bg-amber-400'
                      }`} />
                      <span className="font-bold text-white">{c.name}</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-slate-400 text-[11px] bg-white/5 px-2 py-0.5 rounded">
                        {c.type}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                        c.status === 'ADDED' 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : c.status === 'REMOVED'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
