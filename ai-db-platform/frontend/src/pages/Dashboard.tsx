import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { connectionsApi } from '../api/connections.api';
import { queryApi } from '../api/query.api';
import { missionsApi } from '../api/missions.api';
import { architectApi } from '../api/architect.api';
import {
  Database,
  Activity,
  History,
  ArrowUpRight,
  Plus,
  ShieldCheck,
  Target,
  CheckCircle2,
  AlertCircle,
  Zap,
  ShieldAlert
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWorkspaceStore } from '../store/workspaceStore';
import { toast } from 'sonner';

const Dashboard = () => {
  const queryClient = useQueryClient();
  const { selectedConnectionId } = useWorkspaceStore();
  const [missionPage, setMissionPage] = useState(1);

  const { data: connData } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => {
      const res = await connectionsApi.getConnections();
      return res.data || [];
    }
  });

  const { data: historyData } = useQuery({
    queryKey: ['history'],
    queryFn: async () => {
      const res = await queryApi.getHistory(undefined, 5);
      return res.data || [];
    }
  });

  // NEW: Fetch Active Missions from ATLAS
  const { data: missions, refetch: refetchMissions } = useQuery({
    queryKey: ['missions', selectedConnectionId],
    queryFn: async () => {
      if (!selectedConnectionId) return [];
      const res = await missionsApi.getActiveMissions(selectedConnectionId);
      return res.data || [];
    },
    enabled: !!selectedConnectionId
  });

  const { data: audits } = useQuery({
    queryKey: ['architect-history', selectedConnectionId],
    queryFn: async () => {
      const res = await architectApi.getHistory(selectedConnectionId || undefined);
      return res.data || [];
    },
    enabled: !!selectedConnectionId
  });

  // NEW: ATLAS Proactive Audit (Automated Workspace Analysis)
  const { mutate: runAudit, isPending: isAuditing } = useMutation({
    mutationFn: async () => {
      const res = await architectApi.reviewArchitecture({ connectionId: selectedConnectionId!, scale: '1M rows' });
      return res.data;
    },
    onSuccess: () => {
      toast.success("ATLAS: Workspace Analysis Complete!");
      queryClient.invalidateQueries({ queryKey: ['architect-history'] });
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    }
  });

  useEffect(() => {
    // If we have a workspace selected, but no audits yet, ATLAS starts automatically
    if (selectedConnectionId && audits && audits.length === 0 && !isAuditing) {
      toast.info("ATLAS: New Workspace detected. Initializing Master Audit...");
      runAudit();
    }
  }, [selectedConnectionId, audits]);

  const updateMissionStatus = async (id: string, status: any) => {
    try {
      await missionsApi.updateMissionStatus(id, status);
      toast.success(`Mission marked as ${status.toLowerCase()}`);
      refetchMissions();
    } catch {
      toast.error("Failed to update mission");
    }
  };

  const stats = [
    { name: 'Active Connections', value: connData?.length || 0, icon: Database, color: 'text-blue-400' },
    { name: 'Architecture Score', value: audits?.[0]?.scalability_score ? `${audits[0].scalability_score}%` : 'N/A', icon: ShieldCheck, color: 'text-emerald-400' },
    { name: 'AI Missions Active', value: missions?.filter((m: any) => m.status !== 'COMPLETED').length || 0, icon: Target, color: 'text-purple-400' },
    { name: 'Platform Status', value: 'OPTIMAL', icon: Activity, color: 'text-orange-400' },
  ];

  return (
    <div className="space-y-10">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Platform Overview</h2>
          <p className="text-slate-400 mt-2 font-medium">Monitoring your database architecture ecosystem</p>
        </div>
        <Link to="/connections" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center space-x-2 transition-all shadow-lg shadow-blue-600/20 active:scale-95">
          <Plus size={20} />
          <span>New Connection</span>
        </Link>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="glass p-8 rounded-[2rem] relative overflow-hidden group">
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">{stat.name}</p>
                <h3 className="text-3xl font-bold mt-2">{stat.value}</h3>
              </div>
              <div className={`p-4 rounded-2xl bg-white/5 ${stat.color} group-hover:scale-110 transition-transform duration-500`}>
                <stat.icon size={24} />
              </div>
            </div>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-current opacity-[0.02] rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
          </div>
        ))}
      </div>

      {/* ATLAS MISSION CONTROL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass rounded-3xl p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Zap size={120} className="text-blue-400" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <ShieldAlert className="text-blue-400" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">ATLAS MISSION CONTROL</h2>
                  <p className="text-sm text-slate-400">Proactive Architectural Improvements</p>
                </div>
              </div>
              
              <div className="bg-white/5 rounded-3xl p-6 border border-white/5 space-y-4">
                <div className="flex items-start space-x-3 text-slate-300">
                  <AlertCircle size={18} className="text-blue-400 mt-1 shrink-0" />
                  <p className="text-sm leading-relaxed font-medium italic">
                    {audits?.[0]
                      ? `"Chief, our last audit for ${audits[0].connection_name} shows a score of ${audits[0].scalability_score}%. We've identified ${missions?.length || 0} active missions to reach 100% stability. I'm standing by to execute remediation."`
                      : `"System initialized. Please select a database and run an architectural audit so I can begin mission planning, Chief."`
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Missions List */}
        <div className="glass rounded-[2.5rem] p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ongoing Missions</span>
              <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                {missions?.filter((m: any) => m.status !== 'COMPLETED').length || 0} Pending
              </span>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {missions?.length === 0 ? (
                <div className="text-center py-12 opacity-40">
                  <Target size={32} className="mx-auto mb-2 text-slate-500" />
                  <p className="text-xs font-bold uppercase text-slate-400">All Missions Resolved</p>
                </div>
              ) : (
                missions?.slice((missionPage - 1) * 3, missionPage * 3).map((mission: any) => (
                  <div key={mission.id} className={`p-4 rounded-2xl border transition-all ${mission.status === 'COMPLETED' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                            mission.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                            mission.priority === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>{mission.priority}</span>
                          <h4 className={`text-xs font-bold truncate ${mission.status === 'COMPLETED' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{mission.title}</h4>
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-1">{mission.description}</p>
                      </div>
                      <button
                        onClick={() => updateMissionStatus(mission.id, mission.status === 'COMPLETED' ? 'PLANNED' : 'COMPLETED')}
                        title={mission.status === 'COMPLETED' ? 'Mark Incomplete' : 'Mark Complete'}
                        className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          mission.status === 'COMPLETED' ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-500 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <CheckCircle2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Mission Pagination */}
          {missions && missions.length > 3 && (
            <div className="flex items-center justify-between pt-4 mt-2 border-t border-white/5 text-xs text-slate-400">
              <span>Page {missionPage} of {Math.ceil(missions.length / 3)}</span>
              <div className="flex gap-2">
                <button
                  disabled={missionPage === 1}
                  onClick={() => setMissionPage(p => Math.max(p - 1, 1))}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                >
                  Prev
                </button>
                <button
                  disabled={missionPage >= Math.ceil(missions.length / 3)}
                  onClick={() => setMissionPage(p => p + 1)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 glass rounded-[2.5rem] p-10">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold flex items-center space-x-3">
              <History className="text-blue-400" size={24} />
              <span>Recent Queries</span>
            </h3>
            <Link to="/query" className="text-sm font-semibold text-blue-400 hover:underline">View All Copilot History</Link>
          </div>

          <div className="space-y-4">
            {historyData?.length === 0 ? (
              <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                <p className="text-slate-500">No recent queries found</p>
              </div>
            ) : (
              historyData?.map((item: any) => (
                <div key={item.id} className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group flex items-center justify-between">
                  <div className="flex-1 overflow-hidden pr-6">
                    <p className="text-sm text-slate-300 font-medium truncate mb-1 italic">"{item.natural_query}"</p>
                    <code className="text-xs text-blue-400 font-mono truncate block bg-blue-500/5 px-3 py-1.5 rounded-lg border border-blue-500/10">
                      {item.generated_sql}
                    </code>
                  </div>
                  <div className="flex items-center space-x-6 shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-bold">{item.execution_ms}ms</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Latency</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                      <ArrowUpRight size={14} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Connections Quick View */}
        <div className="glass rounded-[2.5rem] p-10 flex flex-col">
          <h3 className="text-xl font-bold flex items-center space-x-3 mb-8">
            <Database className="text-emerald-400" size={24} />
            <span>Databases</span>
          </h3>
          <div className="space-y-4 flex-1">
            {connData?.map((conn: any) => (
              <div key={conn.id} className="p-5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500/20 to-emerald-500/20 flex items-center justify-center">
                    <Database size={18} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{conn.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase">{conn.database_name}</p>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${conn.last_test_ok ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'} animate-pulse`} />
              </div>
            ))}
            {!connData?.length && (
              <div className="text-center py-10">
                <p className="text-slate-500 text-sm italic">No databases connected</p>
              </div>
            )}
          </div>
          <Link to="/connections" className="mt-8 text-center bg-white/5 hover:bg-white/10 py-4 rounded-2xl text-sm font-bold transition-all">
            Manage Connections
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
