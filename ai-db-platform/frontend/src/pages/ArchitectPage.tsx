import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/axiosInstance';
import { useApp } from '../context/AppContext';
import {

  Database,
  ShieldAlert,
  Zap,
  Loader2,
  CheckCircle2,
  AlertTriangle,

  Sparkles,
  Layers,

  Cpu,
  Layout,
  Box
} from 'lucide-react';
import { toast } from 'sonner';
import MermaidChart from '../components/MermaidChart';

const ArchitectPage = () => {
  const queryClient = useQueryClient();
  const { 
    selectedConnectionId: selectedConn, 
    setSelectedConnectionId: setSelectedConn,
    lastAuditReview: review,
    setLastAuditReview: setReview,
    activeScale: scale,
    setActiveScale: setScale
  } = useApp();

  const [activeView, setActiveView] = useState<'new' | 'history'>('new');
  const [requirements, setRequirements] = useState('');
  const [appliedFixes, setAppliedFixes] = useState<string[]>([]); // Track applied fix titles
  const [confirmModal, setConfirmModal] = useState<{ show: boolean, fix: any, isUndo: boolean }>({
    show: false,
    fix: null,
    isUndo: false
  });

  // Fetch connections
  const { data: connections, isLoading: connLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => {
      const { data } = await api.get('/connections');
      return data.data || [];
    }
  });

  // NEW: Fetch Audit History
  const { data: auditHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['architect-history', selectedConn],
    queryFn: async () => {
      const { data } = await api.get(`/architect/history${selectedConn ? `?connectionId=${selectedConn}` : ''}`);
      return data.data || [];
    }
  });

  const architectMutation = useMutation({
    mutationFn: (data: any) => api.post('/architect/review', data),
    onSuccess: (res) => {
      setReview(res.data.data);
      queryClient.invalidateQueries({ queryKey: ['architect-history'] });
      toast.success("Architectural Review Completed!");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Audit failed")
  });

  const handleRunAudit = () => {
    if (!selectedConn) return toast.error("Select a database to audit");
    architectMutation.mutate({
      connectionId: selectedConn,
      requirements: requirements.trim() || undefined,
      scale
    });
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI System Architect</h2>
          <p className="text-slate-400 mt-2 font-medium">Deep audit & design review by 20-year Senior Principal AI</p>
        </div>

        <div className="flex items-center space-x-6">
          {/* View Toggle */}
          <div className="bg-white/5 p-1 rounded-xl flex items-center border border-white/5">
            <button 
              onClick={() => setActiveView('new')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeView === 'new' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-white'}`}
            >
              NEW AUDIT
            </button>
            <button 
              onClick={() => setActiveView('history')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeView === 'history' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-white'}`}
            >
              HISTORY
            </button>
          </div>

          <div className="glass px-6 py-3 rounded-2xl flex items-center space-x-3 min-w-[240px]">
            <Database size={18} className="text-blue-400" />
            <select
              className="bg-transparent border-none focus:ring-0 text-sm font-bold w-full text-white cursor-pointer"
              value={selectedConn || ''}
              onChange={(e) => setSelectedConn(e.target.value)}
            >
              <option value="" className="bg-slate-900 text-slate-500">Select Database Workspace</option>
              {Array.isArray(connections) && connections.map((conn: any) => (
                <option key={conn.id} value={conn.id} className="bg-slate-900">
                  {conn.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
        {/* Left: Configuration or History List */}
        <div className="lg:col-span-4 flex flex-col space-y-6 overflow-auto pr-2">
          {activeView === 'new' ? (
            <div className="glass p-8 rounded-[2.5rem] border border-white/5 space-y-6">
              <div className="flex items-center space-x-3">
                <Zap className="text-emerald-400" size={20} />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Audit Parameters</span>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Expected Scale</label>
                  <select
                    className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 text-white text-sm font-bold focus:ring-2 focus:ring-blue-500/30"
                    value={scale}
                    onChange={(e) => setScale(e.target.value)}
                  >
                    <option value="1M rows">1M rows (Standard)</option>
                    <option value="10M rows">10M rows (Scale-Up)</option>
                    <option value="100M rows">100M+ rows (Enterprise)</option>
                    <option value="1B rows">1 Billion+ (Big Data)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Custom Requirements</label>
                  <textarea
                    className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-h-[120px] resize-none text-sm font-medium"
                    placeholder="e.g. Needs to handle real-time geo-tracking..."
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                  />
                </div>

                <button
                  onClick={handleRunAudit}
                  disabled={architectMutation.isPending || !selectedConn}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] flex items-center justify-center space-x-3"
                >
                  {architectMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Cpu size={18} />}
                  <span>Analyze Full Architecture</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 mb-2 px-2">
                <Layers className="text-blue-400" size={16} />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Past Reports</span>
              </div>
              
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center py-12 opacity-30">
                  <Loader2 className="animate-spin mb-4" size={24} />
                  <p className="text-xs font-bold">Loading history...</p>
                </div>
              ) : !auditHistory || auditHistory.length === 0 ? (
                <div className="glass p-8 rounded-[2rem] text-center border border-white/5 opacity-40">
                  <p className="text-xs font-bold">No audits found</p>
                </div>
              ) : (
                auditHistory.map((h: any) => (
                  <div 
                    key={h.id} 
                    onClick={() => {
                      setReview(h.review_data);
                      setAppliedFixes([]); // Reset session tracking
                      toast.info(`Loaded report for ${h.connection_name}`);
                    }}
                    className={`glass p-5 rounded-2xl border border-white/5 cursor-pointer hover:border-blue-500/50 transition-all group ${review?.executive_summary === h.review_data.executive_summary ? 'border-blue-500 bg-blue-500/5' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="text-[14px] font-bold text-white group-hover:text-blue-400 transition-colors">{h.connection_name}</div>
                      <div className="text-[14px] font-black text-blue-400">{h.scalability_score}%</div>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-slate-500 uppercase tracking-widest font-bold">
                      <span>{new Date(h.created_at).toLocaleDateString()}</span>
                      <span>Scale: {h.scale}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {review && (
            <div className="glass p-8 rounded-[2.5rem] border border-white/5 flex flex-col items-center justify-center text-center">
              <div className="text-[4rem] font-black text-white leading-none mb-2">{review.scalability_score}</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Scalability Score</div>
              <div className="w-full bg-white/5 h-1.5 rounded-full mt-6 overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${review.scalability_score > 70 ? 'bg-emerald-500' : review.scalability_score > 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${review.scalability_score}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Review Results & ERD */}
        <div className="lg:col-span-8 overflow-auto pr-4 space-y-6">
          {!review ? (
            <div className="h-full glass rounded-[3rem] border border-white/5 flex flex-col items-center justify-center p-12 text-center opacity-40">
              <Sparkles size={48} className="mb-6 text-blue-400" />
              <h3 className="text-xl font-bold">Ready for Audit</h3>
              <p className="text-sm max-w-sm mt-2 font-medium">Select a database and scale to begin a comprehensive architectural review.</p>
            </div>
          ) : (
            <div className="space-y-8 pb-12">
              {/* Executive Summary */}
              <div className="glass p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
                <h3 className="text-xl font-bold mb-4 flex items-center space-x-3">
                  <Sparkles className="text-blue-400" size={20} />
                  <span>Executive Review</span>
                </h3>
                <p className="text-slate-300 leading-relaxed font-medium">
                  {review.executive_summary}
                </p>
              </div>

              {/* Component Analysis */}
              <div className="glass p-8 rounded-[2.5rem] border border-white/5">
                <h3 className="text-xl font-bold mb-6 flex items-center space-x-3">
                  <Layout className="text-blue-400" size={20} />
                  <span>Component Health Card</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {review.component_analysis.map((comp: any, i: number) => (
                    <div key={i} className="bg-white/5 border border-white/5 p-5 rounded-2xl flex items-start space-x-4">
                      <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${comp.status === 'Good' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`} />
                      <div>
                        <h4 className="text-sm font-bold text-white mb-1">{comp.component}</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{comp.notes}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ERD Diagram */}
              <div className="glass p-8 rounded-[2.5rem] border border-white/5">
                <h3 className="text-xl font-bold mb-6 flex items-center space-x-3">
                  <Layers className="text-purple-400" size={20} />
                  <span>AI Suggested ERD</span>
                </h3>
                <MermaidChart chart={review.suggested_diagram_mermaid} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Critical Mistakes */}
                <div className="glass p-8 rounded-[2.5rem] border border-red-500/10 bg-red-500/2">
                  <h3 className="text-lg font-bold mb-4 flex items-center space-x-3 text-red-400">
                    <ShieldAlert size={20} />
                    <span>Architectural Faults</span>
                  </h3>
                  <ul className="space-y-3">
                    {review.critical_mistakes.map((m: string, i: number) => (
                      <li key={i} className="flex items-start space-x-3 text-sm text-slate-400">
                        <AlertTriangle size={14} className="mt-1 text-red-500/50 flex-shrink-0" />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Improvement Plan */}
                <div className="glass p-8 rounded-[2.5rem] border border-emerald-500/10 bg-emerald-500/2">
                  <h3 className="text-lg font-bold mb-4 flex items-center space-x-3 text-emerald-400">
                    <Zap size={20} />
                    <span>Improvement Plan</span>
                  </h3>
                  <ul className="space-y-3">
                    {review.improvement_plan.map((p: string, i: number) => (
                      <li key={i} className="flex items-start space-x-3 text-sm text-slate-400">
                        <CheckCircle2 size={14} className="mt-1 text-emerald-500/50 flex-shrink-0" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* NEW: Suggested SQL Fixes */}
              {review.suggested_fixes && review.suggested_fixes.length > 0 && (
                <div className="glass p-8 rounded-[2.5rem] border border-white/5">
                  <h3 className="text-xl font-bold mb-6 flex items-center space-x-3">
                    <Cpu className="text-orange-400" size={20} />
                    <span>AI Remediation Scripts</span>
                  </h3>
                  <div className="space-y-4">
                    {review.suggested_fixes.map((fix: any, i: number) => (
                      <div key={i} className="bg-white/5 border border-white/5 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-white mb-1 group-hover:text-orange-400 transition-colors">{fix.title}</h4>
                          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{fix.explanation}</p>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(fix.sql);
                              toast.success("SQL Fix copied to clipboard!");
                            }}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-white/10 flex items-center space-x-2 transition-all active:scale-95"
                          >
                            <Box size={14} />
                            <span>Copy SQL</span>
                          </button>
                          
                          <button 
                            onClick={() => {
                              setConfirmModal({
                                show: true,
                                fix: fix,
                                isUndo: appliedFixes.includes(fix.title)
                              });
                            }}
                            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white flex items-center space-x-2 shadow-lg transition-all active:scale-95 ${appliedFixes.includes(fix.title) ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'}`}
                          >
                            {appliedFixes.includes(fix.title) ? (
                              <>
                                <AlertTriangle size={14} />
                                <span>Undo Fix</span>
                              </>
                            ) : (
                              <>
                                <Zap size={14} />
                                <span>Apply Fix</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="glass w-full max-w-md p-10 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-6 scale-in-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${confirmModal.isUndo ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
              {confirmModal.isUndo ? <AlertTriangle size={32} /> : <ShieldAlert size={32} />}
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white">
                {confirmModal.isUndo ? 'Revert Changes?' : 'Confirm Application'}
              </h3>
              <p className="text-slate-400 font-medium leading-relaxed">
                You are about to {confirmModal.isUndo ? 'undo' : 'apply'} the following architectural fix:
                <span className="block mt-2 p-3 bg-white/5 rounded-xl border border-white/5 text-white italic">
                  "{confirmModal.fix?.title}"
                </span>
              </p>
            </div>

            <div className="flex flex-col space-y-3 pt-4">
              <button 
                onClick={async () => {
                  const { fix, isUndo } = confirmModal;
                  setConfirmModal(prev => ({ ...prev, show: false }));
                  
                  try {
                    toast.loading(isUndo ? "Reverting fix..." : "Applying architectural fix...");
                    await api.post('/query/execute', {
                      connectionId: selectedConn,
                      sql: isUndo ? fix.rollback_sql : fix.sql,
                      readOnly: false // CRITICAL: Allow writes for Architect fixes
                    });
                    
                    // Invalidate schema cache so user sees the change in Explorer
                    queryClient.invalidateQueries({ queryKey: ['schema', selectedConn] });
                    
                    toast.dismiss();
                    
                    if (isUndo) {
                      setAppliedFixes(prev => prev.filter(t => t !== fix.title));
                      toast.success(`Successfully reverted: ${fix.title}`);
                    } else {
                      setAppliedFixes(prev => [...prev, fix.title]);
                      toast.success(`Successfully applied: ${fix.title}`);
                    }
                  } catch (err: any) {
                    toast.dismiss();
                    toast.error(err.response?.data?.message || "Operation failed");
                  }
                }}
                className={`w-full py-4 rounded-2xl font-bold text-sm transition-all active:scale-95 ${confirmModal.isUndo ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
              >
                Confirm and Execute
              </button>
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                className="w-full py-4 rounded-2xl font-bold text-sm bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
              >
                No, Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchitectPage;
