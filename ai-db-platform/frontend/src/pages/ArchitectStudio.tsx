import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { connectionsApi } from '../api/connections.api';
import { architectApi } from '../api/architect.api';
import { designStudioApi } from '../api/designStudio.api';
import { useSchemaExtract } from '../hooks/useSchemaExtract';
import { useAppContext } from '../context/AppContext';
import { Sparkles, Database, Loader2, Plus, Wand2, History, MessageSquare, ShieldAlert, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import DesignStudioChat from '../components/DesignStudioChat';
import { BlueprintPanel, AuditPanel } from '../components/DesignStudioPanels';
import TableDataInspector from '../components/TableDataInspector';

type Mode = 'new' | 'existing';
interface Message { role: 'user' | 'atlas'; content: string; };

export default function ArchitectStudio() {
  const { selectedConnectionId, setSelectedConnectionId } = useAppContext();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<Mode>('new');
  const [view, setView] = useState<'chat' | 'history' | 'changelog'>('chat');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isReadyToGenerate, setIsReadyToGenerate] = useState(false);
  const [blueprint, setBlueprint] = useState<any>(null);
  const [audit, setAudit] = useState<any>(null);
  const [isAuditRunning, setIsAuditRunning] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean, fix: any }>({ show: false, fix: null });
  const [inspectingTable, setInspectingTable] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    show: boolean;
    type: 'session' | 'audit' | null;
    id: string | null;
    title: string;
  }>({
    show: false,
    type: null,
    id: null,
    title: ''
  });

  // Fetch schema for the selected connection
  const { data: schema } = useSchemaExtract(selectedConnectionId);

  // Applied Mutations Change Log
  const { data: mutations, refetch: refetchMutations } = useQuery({
    queryKey: ['schema-mutations', selectedConnectionId],
    queryFn: async () => {
      if (!selectedConnectionId) return [];
      const res = await architectApi.getMutations(selectedConnectionId);
      return res.data || [];
    },
    enabled: !!selectedConnectionId
  });

  // Deploy blueprint
  const deployMutation = useMutation({
    mutationFn: (payload: { sessionId: string; connectionId: string }) => designStudioApi.deploySchema(payload),
    onSuccess: () => {
      toast.success('Blueprint successfully deployed to Live Database!');
      queryClient.invalidateQueries({ queryKey: ['schema', selectedConnectionId] });
      queryClient.invalidateQueries({ queryKey: ['schema-mutations', selectedConnectionId] });
      refetchMutations();
    },
    onError: (err: any) => toast.error(err.message || 'Deployment failed'),
  });

  // Delete chat session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: (id: string) => designStudioApi.deleteSession(id),
    onSuccess: (_, deletedId) => {
      toast.success("Session deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['ds-sessions'] });
      if (sessionId === deletedId) {
        setSessionId(null);
        setMessages([]);
        setBlueprint(null);
        setAudit(null);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Delete failed");
    }
  });

  // Delete audit history mutation
  const deleteAuditMutation = useMutation({
    mutationFn: (id: string) => architectApi.deleteAudit(id),
    onSuccess: () => {
      toast.success("Audit history deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['architect-history', selectedConnectionId] });
      setAudit(null);
      setSessionId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Delete failed");
    }
  });

  // Rollback mutation
  const rollbackMutation = useMutation({
    mutationFn: (mutationId: string) => architectApi.rollbackFix(mutationId),
    onSuccess: () => {
      toast.success("Change rolled back successfully! ⏪");
      queryClient.invalidateQueries({ queryKey: ['schema', selectedConnectionId] });
      queryClient.invalidateQueries({ queryKey: ['schema-mutations', selectedConnectionId] });
      refetchMutations();
    },
    onError: (err: any) => {
      toast.error(err.message || "Rollback failed");
    }
  });

  // Connections list
  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => {
      const res = await connectionsApi.getConnections();
      return res.data || [];
    },
  });

  // Sessions list (Chat)
  const { data: sessions } = useQuery({
    queryKey: ['ds-sessions'],
    queryFn: async () => {
      const res = await designStudioApi.getSessions();
      return res.data || [];
    },
  });

  // Audit History (Deep Reports)
  const { data: auditHistory } = useQuery({
    queryKey: ['architect-history', selectedConnectionId],
    queryFn: async () => {
      const res = await architectApi.getHistory(selectedConnectionId || undefined);
      return res.data || [];
    },
    enabled: !!selectedConnectionId || view === 'history'
  });

  // Create session
  const createSession = useMutation({
    mutationFn: (payload: { mode: Mode; connectionId?: string }) => designStudioApi.createSession(payload),
    onSuccess: (res) => {
      const session = res.data;
      setSessionId(session.id);
      setMessages([]);
      setBlueprint(null);
      setAudit(null);
      setIsReadyToGenerate(false);
      queryClient.invalidateQueries({ queryKey: ['ds-sessions'] });
      if (mode === 'new') {
        setMessages([{
          role: 'atlas',
          content: "Namaste! Main ATLAS hoon — aapka Senior Database Architect. 🙏\n\nAapka database idea batao — app kaisa hai, kitne users honge, kya features chahiye? Hum milke ek perfect blueprint banayenge!"
        }]);
      } else {
        handleAudit(session.id);
      }
    },
    onError: () => toast.error('Session create nahi ho saki'),
  });

  // Send message
  const probeMutation = useMutation({
    mutationFn: (payload: { sessionId: string; userMessage: string }) =>
      designStudioApi.probeSession({ sessionId: payload.sessionId, userMessage: payload.userMessage }),
    onSuccess: (res) => {
      const { reply, isReadyToGenerate: ready } = res.data;
      setMessages(prev => [...prev, { role: 'atlas', content: reply }]);
      if (ready) setIsReadyToGenerate(true);
    },
    onError: (err: any) => toast.error(err.message || 'ATLAS se connect nahi ho saka'),
  });

  // Generate blueprint
  const generateMutation = useMutation({
    mutationFn: () => designStudioApi.generateSchema(sessionId!),
    onSuccess: (res) => {
      setBlueprint(res.data);
      setIsReadyToGenerate(false);
      toast.success('Blueprint ready hai! 🎉');
    },
    onError: (err: any) => toast.error(err.message || 'Blueprint generation failed'),
  });

  // Execute SQL Fix
  const handleExecuteFix = async (fix: any) => {
    if (!selectedConnectionId) return toast.error("Connection lost. Please re-select.");
    try {
      toast.loading("ATLAS is applying the fix...");
      await architectApi.applyFix({
        connectionId: selectedConnectionId,
        title: fix.title,
        description: fix.explanation || fix.detail || fix.description || '',
        sql: fix.sql,
        rollbackSql: fix.rollback_sql || fix.rollbackSql || null,
        confirmWrite: true
      });
      queryClient.invalidateQueries({ queryKey: ['schema', selectedConnectionId] });
      queryClient.invalidateQueries({ queryKey: ['schema-mutations', selectedConnectionId] });
      refetchMutations();
      toast.dismiss();
      toast.success(`Successfully applied: ${fix.title}`);
      setConfirmModal({ show: false, fix: null });
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Operation failed");
    }
  };

  const handleAudit = async (sid?: string) => {
    if (!selectedConnectionId) return toast.error('Database connection select karo');
    setIsAuditRunning(true);
    setAudit(null);
    try {
      const activeSessionId = sid || (sessionId === 'historical' ? undefined : sessionId || undefined);
      const response = await designStudioApi.auditExisting({
        connectionId: selectedConnectionId,
        sessionId: activeSessionId!,
      });
      setAudit(response.data);
      queryClient.invalidateQueries({ queryKey: ['architect-history', selectedConnectionId] });
      toast.success('A-to-Z Audit complete! 🔍');
    } catch (err: any) {
      toast.error(err.message || 'Audit failed');
    } finally {
      setIsAuditRunning(false);
    }
  };

  const handleSend = (userMsg: string) => {
    if (!sessionId) return;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    probeMutation.mutate({ sessionId, userMessage: userMsg });
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center space-x-3">
            <span className="text-blue-400 mr-2">/</span>
            <span>ATLAS Architect Studio</span>
          </h2>
          <p className="text-slate-400 mt-1 font-medium">Conversational AI Database Architect — Zero to Production</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="bg-white/5 p-1 rounded-xl flex border border-white/5">
            {(['chat', 'history', 'changelog'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${view === v ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
              >
                {v === 'chat' ? <MessageSquare size={14} /> : v === 'history' ? <History size={14} /> : <Database size={14} />}
                <span>{v === 'changelog' ? 'CHANGE LOG' : v.toUpperCase()}</span>
              </button>
            ))}
          </div>
          <div className="bg-white/5 p-1 rounded-xl flex border border-white/5">
            {(['new', 'existing'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setSessionId(null); setMessages([]); setBlueprint(null); setAudit(null); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${mode === m ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'text-slate-500 hover:text-white'}`}
              >
                {m === 'new' ? '🆕 Builder' : '🔧 Auditor'}
              </button>
            ))}
          </div>
          <div className="glass px-4 py-2.5 rounded-2xl flex items-center space-x-2 min-w-[200px]">
            <Database size={16} className="text-blue-400" />
            <select
              className="bg-transparent border-none focus:ring-0 text-sm font-bold w-full text-white cursor-pointer"
              value={selectedConnectionId || ''}
              onChange={(e) => setSelectedConnectionId(e.target.value)}
            >
              <option value="" className="bg-slate-900">Select Database Source</option>
              {connections?.map((c: any) => (
                <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        <div className="lg:col-span-3 flex flex-col space-y-4">
          <button
            onClick={() => {
              if (mode === 'existing' && !selectedConnectionId) return toast.error('Connection select karo');
              createSession.mutate({ mode, connectionId: selectedConnectionId || undefined });
            }}
            disabled={createSession.isPending}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-3 rounded-2xl transition-all shadow-lg shadow-purple-600/20 active:scale-[0.98] flex items-center justify-center space-x-2"
          >
            {createSession.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            <span>{mode === 'new' ? 'New Blueprint' : 'New Audit'}</span>
          </button>

          {view === 'chat' ? (
            <div className="flex-1 overflow-auto space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 px-1">Recent Sessions</p>
              {sessions?.map((s: any) => (
                <div
                  key={s.id}
                  onClick={() => {
                    setSessionId(s.id);
                    setMode(s.mode);
                    setAudit(null); setBlueprint(null);
                    if (s.current_design) {
                      if (s.mode === 'new') setBlueprint(s.current_design);
                      else setAudit(s.current_design);
                    }
                    setMessages((s.requirements_transcript || []).map((m: any) => ({ role: m.role, content: m.content })));
                  }}
                  className={`glass p-3 rounded-xl border cursor-pointer transition-all hover:border-purple-500/50 flex items-center justify-between group/session ${s.id === sessionId ? 'border-purple-500 bg-purple-500/5' : 'border-white/5'}`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${s.mode === 'new' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'}`}>{s.mode}</span>
                      <span className="text-[9px] text-slate-500">{new Date(s.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteModal({
                        show: true,
                        type: 'session',
                        id: s.id,
                        title: `Session: ${s.mode.toUpperCase()} (${new Date(s.created_at).toLocaleDateString()})`
                      });
                    }}
                    className="opacity-0 group-hover/session:opacity-100 transition-all p-1 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg flex items-center justify-center shrink-0"
                    title="Delete Session"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : view === 'history' ? (
            <div className="flex-1 overflow-auto space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 px-1">Audit History</p>
              {auditHistory?.map((h: any) => (
                <div
                  key={h.id}
                  onClick={() => { setAudit(h.review_data); setMode('existing'); setSessionId('historical'); }}
                  className="glass p-3 rounded-xl border border-white/5 cursor-pointer hover:border-blue-500/50 transition-all flex items-center justify-between group/audit"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-white truncate">{h.connection_name}</span>
                      <span className="text-[10px] font-black text-blue-400">{h.scalability_score}%</span>
                    </div>
                    <p className="text-[9px] text-slate-500">{new Date(h.created_at).toLocaleDateString()} • {h.scale}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteModal({
                        show: true,
                        type: 'audit',
                        id: h.id,
                        title: `Audit: ${h.connection_name} (${new Date(h.created_at).toLocaleDateString()})`
                      });
                    }}
                    className="opacity-0 group-hover/audit:opacity-100 transition-all p-1 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg flex items-center justify-center shrink-0"
                    title="Delete Audit Log"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 overflow-auto space-y-3 pr-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 px-1 mb-1">Schema Change Log</p>
              {!selectedConnectionId ? (
                <p className="text-xs text-slate-500 italic px-1">Select a database to view changes</p>
              ) : !mutations || mutations.length === 0 ? (
                <p className="text-xs text-slate-500 italic px-1">No schema changes applied yet</p>
              ) : (
                mutations.map((m: any) => (
                  <div
                    key={m.id}
                    className="glass p-3.5 rounded-xl border border-white/5 space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-white leading-snug">{m.title}</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ml-2 ${
                          m.status === 'APPLIED' ? 'bg-emerald-500/10 text-emerald-400' :
                          m.status === 'ROLLED_BACK' ? 'bg-blue-500/10 text-blue-400' :
                          'bg-red-500/10 text-red-400'
                        }`}>{m.status}</span>
                      </div>
                      {m.description && <p className="text-[10px] text-slate-400 leading-normal">{m.description}</p>}
                      <p className="text-[8px] text-slate-500 mt-1">{new Date(m.created_at).toLocaleString()}</p>
                    </div>
                    {m.status === 'APPLIED' && m.rollback_sql && (
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to rollback "${m.title}"?`)) {
                            rollbackMutation.mutate(m.id);
                          }
                        }}
                        disabled={rollbackMutation.isPending}
                        className="w-full mt-1 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 disabled:opacity-50 text-blue-400 border border-blue-500/20 rounded-lg text-[9px] font-bold tracking-wider transition-all uppercase flex items-center justify-center space-x-1"
                      >
                        {rollbackMutation.isPending && rollbackMutation.variables === m.id ? (
                          <Loader2 size={10} className="animate-spin mr-1" />
                        ) : null}
                        <span>Rollback Change</span>
                      </button>
                    )}
                    {m.status === 'APPLIED' && !m.rollback_sql && (
                      <div className="text-[9px] text-slate-500 bg-white/5 p-2 rounded-lg leading-normal mt-1 border border-white/5 space-y-1">
                        <span className="text-amber-400/90 font-bold block">⚠️ Manual Rollback Required</span>
                        <span>This change was applied before the rollback tracker was fixed. You can rollback manually by executing SQL in SQL Lab.</span>
                        <details className="mt-1">
                          <summary className="cursor-pointer text-slate-400 hover:text-white font-medium select-none">View Executed SQL</summary>
                          <code className="block bg-slate-950 p-1.5 rounded mt-1 text-slate-300 font-mono select-all whitespace-pre-wrap">{m.sql_executed}</code>
                        </details>
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* Database Tables Section */}
              {selectedConnectionId && schema?.tables && (
                <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 px-1 mb-2">Live Table Inspector</p>
                  <div className="space-y-1.5">
                    {schema.tables.map((t: any) => (
                      <div key={t.table_name} className="glass p-2.5 rounded-xl border border-white/5 flex items-center justify-between group/live-table hover:border-blue-500/25 transition-all">
                        <div className="flex items-center space-x-2 truncate">
                          <Database size={12} className="text-blue-400/70" />
                          <span className="text-xs font-bold text-white truncate">{t.table_name}</span>
                        </div>
                        <button
                          onClick={() => setInspectingTable(t.table_name)}
                          className="opacity-0 group-hover/live-table:opacity-100 transition-all p-1 hover:bg-white/10 text-slate-400 hover:text-blue-400 rounded-lg flex items-center justify-center"
                          title="Inspect Live Records"
                        >
                          <Eye size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-4 glass rounded-[2rem] border border-white/5 overflow-hidden flex flex-col">
          {!sessionId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-40 space-y-4">
              <Wand2 size={40} className="text-purple-400" />
              <h3 className="text-lg font-bold">ATLAS Architect Studio</h3>
              <p className="text-sm">Session start karo ya history se load karo</p>
            </div>
          ) : (
            <DesignStudioChat
              messages={messages}
              onSendMessage={handleSend}
              isLoading={probeMutation.isPending}
              isReadyToGenerate={mode === 'new' && isReadyToGenerate}
              onGenerate={() => generateMutation.mutate()}
              isGenerating={generateMutation.isPending}
              mode={mode}
              onApplyAction={(fix: any) => setConfirmModal({ show: true, fix })}
              onAudit={() => handleAudit()}
              isAuditing={isAuditRunning}
            />
          )}
        </div>

        <div className="lg:col-span-5 glass rounded-[2rem] border border-white/5 p-6 flex flex-col overflow-hidden relative">
          {isAuditRunning ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                <Sparkles className="absolute inset-0 m-auto text-blue-400 animate-pulse" size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">ATLAS is auditing...</h3>
                <p className="text-sm text-slate-400 max-w-[250px]">Performing deep architectural review and identifying bottlenecks.</p>
              </div>
            </div>
          ) : !audit && !blueprint ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 space-y-3">
              <Sparkles size={36} />
              <p className="text-sm font-medium">ATLAS is ready to build or audit.</p>
            </div>
          ) : (
            <>
              {blueprint && <BlueprintPanel 
                schema={blueprint} 
                sessionId={sessionId!} 
                connectionId={selectedConnectionId} 
                onDeploy={(payload) => deployMutation.mutate(payload)}
                isDeploying={deployMutation.isPending}
              />}
              {audit && (
                <AuditPanel
                  audit={audit}
                  onApplyFix={(fix: any) => setConfirmModal({ show: true, fix })}
                  appliedMutations={mutations}
                />
              )}
            </>
          )}
        </div>
      </div>

      {confirmModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
          <div className="glass w-full max-w-md p-10 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <ShieldAlert size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white">Execute Architectural Fix</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Atlas is suggesting a direct change to your production database:
                <span className="block mt-2 p-3 bg-white/5 rounded-xl border border-white/5 text-white italic">"{confirmModal.fix?.title}"</span>
              </p>
            </div>
            <div className="flex flex-col space-y-3 pt-4">
              <button
                onClick={() => handleExecuteFix(confirmModal.fix)}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-600/20"
              >
                Confirm and Execute
              </button>
              <button
                onClick={() => setConfirmModal({ show: false, fix: null })}
                className="w-full py-4 bg-white/5 text-slate-400 hover:text-white rounded-2xl font-bold text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {inspectingTable && selectedConnectionId && (
        <TableDataInspector
          connectionId={selectedConnectionId}
          tableName={inspectingTable}
          onClose={() => setInspectingTable(null)}
        />
      )}

      {deleteModal.show && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass w-full max-w-md p-10 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
              <ShieldAlert size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white uppercase tracking-wider">Confirm Delete</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Aap is {deleteModal.type === 'session' ? 'chat session' : 'audit history log'} ko permanently delete karna chahte hain? Yeh operation undo nahi kiya ja sakta.
              </p>
              {deleteModal.title && (
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-slate-400 text-xs font-mono break-all leading-normal">
                  {deleteModal.title}
                </div>
              )}
            </div>
            <div className="flex flex-col space-y-3 pt-4">
              <button
                onClick={() => {
                  if (deleteModal.type === 'session' && deleteModal.id) {
                    deleteSessionMutation.mutate(deleteModal.id);
                  } else if (deleteModal.type === 'audit' && deleteModal.id) {
                    deleteAuditMutation.mutate(deleteModal.id);
                  }
                  setDeleteModal({ show: false, type: null, id: null, title: '' });
                }}
                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-red-600/20 transition-all uppercase tracking-wider"
              >
                Permanently Delete
              </button>
              <button
                onClick={() => setDeleteModal({ show: false, type: null, id: null, title: '' })}
                className="w-full py-4 bg-white/5 text-slate-400 hover:text-white rounded-2xl font-bold text-sm transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
