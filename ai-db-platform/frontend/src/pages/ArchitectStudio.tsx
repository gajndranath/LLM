import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/axiosInstance';
import { useApp } from '../context/AppContext';
import { Sparkles, Database, Loader2, Plus, Wand2, History, MessageSquare, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import DesignStudioChat from '../components/DesignStudioChat';
import { BlueprintPanel, AuditPanel } from '../components/DesignStudioPanels';

type Mode = 'new' | 'existing';
interface Message { role: 'user' | 'atlas'; content: string; };

export default function ArchitectStudio() {
  const { selectedConnectionId, setSelectedConnectionId } = useApp();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<Mode>('new');
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isReadyToGenerate, setIsReadyToGenerate] = useState(false);
  const [blueprint, setBlueprint] = useState<any>(null);
  const [audit, setAudit] = useState<any>(null);
  const [userConcerns, setUserConcerns] = useState('');
  const [isAuditRunning, setIsAuditRunning] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean, fix: any }>({ show: false, fix: null });

  // Connections list
  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => { const { data } = await api.get('/connections'); return data.data || []; },
  });

  // Sessions list (Chat)
  const { data: sessions } = useQuery({
    queryKey: ['ds-sessions'],
    queryFn: async () => { const { data } = await api.get('/design-studio/sessions'); return data.data || []; },
  });

  // Audit History (Deep Reports)
  const { data: auditHistory } = useQuery({
    queryKey: ['architect-history', selectedConnectionId],
    queryFn: async () => {
      const { data } = await api.get(`/architect/history${selectedConnectionId ? `?connectionId=${selectedConnectionId}` : ''}`);
      return data.data || [];
    },
    enabled: !!selectedConnectionId || view === 'history'
  });

  // Create session
  const createSession = useMutation({
    mutationFn: (payload: { mode: Mode; connectionId?: string }) => api.post('/design-studio/sessions', payload),
    onSuccess: (res) => {
      const session = res.data.data;
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
      }
    },
    onError: () => toast.error('Session create nahi ho saki'),
  });

  // Send message
  const probeMutation = useMutation({
    mutationFn: (payload: { sessionId: string; userMessage: string }) =>
      api.post('/design-studio/probe', payload),
    onSuccess: (res) => {
      const { reply, isReadyToGenerate: ready } = res.data.data;
      setMessages(prev => [...prev, { role: 'atlas', content: reply }]);
      if (ready) setIsReadyToGenerate(true);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'ATLAS se connect nahi ho saka'),
  });

  // Generate blueprint
  const generateMutation = useMutation({
    mutationFn: () => api.post('/design-studio/generate-schema', { sessionId }),
    onSuccess: (res) => {
      setBlueprint(res.data.data);
      setIsReadyToGenerate(false);
      toast.success('Blueprint ready hai! 🎉');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Blueprint generation failed'),
  });

  // Execute SQL Fix
  const handleExecuteFix = async (fix: any) => {
    if (!selectedConnectionId) return toast.error("Connection lost. Please re-select.");
    try {
      toast.loading("ATLAS is applying the fix...");
      await api.post('/query/execute', {
        connectionId: selectedConnectionId,
        sql: fix.sql,
        readOnly: false
      });
      queryClient.invalidateQueries({ queryKey: ['schema', selectedConnectionId] });
      toast.dismiss();
      toast.success(`Successfully applied: ${fix.title}`);
      setConfirmModal({ show: false, fix: null });
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.response?.data?.message || "Operation failed");
    }
  };

  const handleAudit = async () => {
    if (!selectedConnectionId) return toast.error('Database connection select karo');
    setIsAuditRunning(true);
    setAudit(null);
    try {
      const response = await api.post('/design-studio/audit-existing', {
        connectionId: selectedConnectionId,
        sessionId,
        userConcerns: userConcerns.trim() || undefined,
      });
      setAudit(response.data.data);
      toast.success('A-to-Z Audit complete! 🔍');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Audit failed');
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
            {(['chat', 'history'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${view === v ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
              >
                {v === 'chat' ? <MessageSquare size={14} /> : <History size={14} />}
                <span>{v.toUpperCase()}</span>
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
                  className={`glass p-3 rounded-xl border cursor-pointer transition-all hover:border-purple-500/50 ${s.id === sessionId ? 'border-purple-500 bg-purple-500/5' : 'border-white/5'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${s.mode === 'new' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'}`}>{s.mode}</span>
                    <span className="text-[9px] text-slate-500">{new Date(s.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 overflow-auto space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 px-1">Audit History</p>
              {auditHistory?.map((h: any) => (
                <div
                  key={h.id}
                  onClick={() => { setAudit(h.review_data); setMode('existing'); setSessionId('historical'); }}
                  className="glass p-3 rounded-xl border border-white/5 cursor-pointer hover:border-blue-500/50 transition-all"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-white">{h.connection_name}</span>
                    <span className="text-[10px] font-black text-blue-400">{h.scalability_score}%</span>
                  </div>
                  <p className="text-[9px] text-slate-500">{new Date(h.created_at).toLocaleDateString()} • {h.scale}</p>
                </div>
              ))}
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
          {!audit && !blueprint ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 space-y-3">
              <Sparkles size={36} />
              <p className="text-sm font-medium">ATLAS is ready to build or audit.</p>
            </div>
          ) : (
            <>
              {blueprint && <BlueprintPanel schema={blueprint} />}
              {audit && <AuditPanel audit={audit} onApplyFix={(fix: any) => setConfirmModal({ show: true, fix })} />}
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
    </div>
  );
}
