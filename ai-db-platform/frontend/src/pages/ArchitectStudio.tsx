import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { connectionsApi } from '../api/connections.api';
import { architectApi } from '../api/architect.api';
import { designStudioApi } from '../api/designStudio.api';
import { useSchemaExtract } from '../hooks/useSchemaExtract';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useAuthStore } from '../store/authStore';
import {
  Sparkles, Database, Loader2, Plus, Wand2, History,
  MessageSquare, ShieldAlert, Eye, Trash2, RefreshCw,
  Cpu, PanelLeftClose, PanelLeftOpen, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import DesignStudioChat from '../components/DesignStudioChat';
import { BlueprintPanel, AuditPanel } from '../components/DesignStudioPanels';
import TableDataInspector from '../components/TableDataInspector';
import { io, Socket } from 'socket.io-client';

type Mode = 'new' | 'existing';
interface Message { role: 'user' | 'atlas'; content: string; }

export default function ArchitectStudio() {
  const { selectedConnectionId, setConnectionId: setSelectedConnectionId, aiProvider, aiModel, setAiConfig } = useWorkspaceStore();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<Mode>('new');
  const [view, setView] = useState<'chat' | 'history' | 'changelog'>('chat');
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem('last_architect_session'));
  const [messages, setMessages] = useState<Message[]>([]);
  const [isReadyToGenerate, setIsReadyToGenerate] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [blueprint, setBlueprint] = useState<any>(null);
  const [audit, setAudit] = useState<any>(null);
  const [isAuditRunning, setIsAuditRunning] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; fix: any }>({ show: false, fix: null });
  const [inspectingTable, setInspectingTable] = useState<string | null>(null);
  const [deployedSessionIds, setDeployedSessionIds] = useState<Set<string>>(new Set());
  const [showSessions, setShowSessions] = useState(true);
  const [showPanel, setShowPanel] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; type: 'session' | 'audit' | null; id: string | null; title: string }>({ show: false, type: null, id: null, title: '' });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const sessionIdRef = useRef<string | null>(sessionId);
  sessionIdRef.current = sessionId;
  const [streamingSessionId, setStreamingSessionId] = useState<string | null>(null);
  const isStreaming = !!(streamingSessionId && streamingSessionId === sessionId);

  const getStepStatus = (step: 'meghna' | 'sam' | 'victor' | 'postgres' | 'visualizer') => {
    const statusLower = (generationStatus || '').toLowerCase();
    if (statusLower.includes('complete') || statusLower.includes('ready')) return 'completed';
    if (step === 'meghna') {
      if (statusLower.includes('meghna')) return 'active';
      if (statusLower.includes('sam') || statusLower.includes('victor') || statusLower.includes('sandbox') || statusLower.includes('visualizer')) return 'completed';
      return isGenerating ? 'active' : 'pending';
    }
    if (step === 'sam') {
      if (statusLower.includes('sam') || statusLower.includes('ddl')) return 'active';
      if (statusLower.includes('victor') || statusLower.includes('sandbox') || statusLower.includes('visualizer')) return 'completed';
      return 'pending';
    }
    if (step === 'victor') {
      if (statusLower.includes('victor') || statusLower.includes('audit') || statusLower.includes('consensus')) return 'active';
      if (statusLower.includes('sandbox') || statusLower.includes('visualizer')) return 'completed';
      return 'pending';
    }
    if (step === 'postgres') {
      if (statusLower.includes('sandbox') || statusLower.includes('dry-run') || statusLower.includes('transaction')) return 'active';
      if (statusLower.includes('visualizer')) return 'completed';
      return 'pending';
    }
    if (step === 'visualizer') {
      if (statusLower.includes('visualizer') || statusLower.includes('mapping')) return 'active';
      return 'pending';
    }
    return 'pending';
  };

  const hasOutput = isGenerating || isAuditRunning || !!blueprint || !!audit;

  const { data: schema } = useSchemaExtract(selectedConnectionId);
  const { data: mutations, refetch: refetchMutations } = useQuery({
    queryKey: ['design-studio-mutations', selectedConnectionId],
    queryFn: async () => {
      if (!selectedConnectionId) return [];
      const res = await designStudioApi.getMutations(selectedConnectionId);
      return res.data || [];
    },
    enabled: !!selectedConnectionId || view === 'changelog'
  });

  const deployMutation = useMutation({
    mutationFn: (payload: { sessionId: string; connectionId: string }) => designStudioApi.deploySchema(payload),
    onSuccess: (_, variables) => {
      toast.success('Blueprint deployed!');
      setDeployedSessionIds(prev => new Set(prev).add(variables.sessionId));
      queryClient.invalidateQueries({ queryKey: ['schema', selectedConnectionId] });
      queryClient.invalidateQueries({ queryKey: ['design-studio-mutations', selectedConnectionId] });
      refetchMutations();
    },
    onError: (err: any) => toast.error(err.message || 'Deployment failed'),
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (id: string) => designStudioApi.deleteSession(id),
    onSuccess: (_, deletedId) => {
      toast.success('Session deleted');
      queryClient.invalidateQueries({ queryKey: ['ds-sessions'] });
      if (sessionId === deletedId) { setSessionId(null); setMessages([]); setBlueprint(null); setAudit(null); }
    },
    onError: (err: any) => toast.error(err.message || 'Delete failed'),
  });

  const deleteAuditMutation = useMutation({
    mutationFn: (id: string) => architectApi.deleteAudit(id),
    onSuccess: () => {
      toast.success('Audit deleted');
      queryClient.invalidateQueries({ queryKey: ['architect-history', selectedConnectionId] });
      setAudit(null); setSessionId(null);
    },
    onError: (err: any) => toast.error(err.message || 'Delete failed'),
  });

  const rollbackMutation = useMutation({
    mutationFn: (mutationId: string) => designStudioApi.rollbackMutation(mutationId, selectedConnectionId!),
    onSuccess: () => {
      toast.success('Rolled back ⏪');
      queryClient.invalidateQueries({ queryKey: ['schema', selectedConnectionId] });
      queryClient.invalidateQueries({ queryKey: ['design-studio-mutations', selectedConnectionId] });
      refetchMutations();
    },
    onError: (err: any) => toast.error(err.message || 'Rollback failed'),
  });

  const syncMutation = useMutation({
    mutationFn: () => designStudioApi.clearSchemaCache(selectedConnectionId!),
    onSuccess: () => {
      toast.success('Schema synced 🔄');
      queryClient.invalidateQueries({ queryKey: ['schema', selectedConnectionId] });
      queryClient.invalidateQueries({ queryKey: ['drift-report', selectedConnectionId] });
    },
    onError: (err: any) => toast.error(err.message || 'Sync failed'),
  });

  // Out-of-Band Schema Drift Detection Query
  const { data: driftResponse } = useQuery({
    queryKey: ['drift-report', selectedConnectionId],
    queryFn: () => connectionsApi.getDriftReport(selectedConnectionId!),
    enabled: !!selectedConnectionId,
    refetchInterval: 30000, // Background poll every 30s for zero-drag drift awareness
  });
  const driftReport = driftResponse?.data;

  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => { const res = await connectionsApi.getConnections(); return res.data || []; },
  });

  const { data: sessions, refetch: refetchSessions } = useQuery({
    queryKey: ['ds-sessions'],
    queryFn: async () => { const res = await designStudioApi.getSessions(); return res.data || []; },
  });

  const { data: auditHistory } = useQuery({
    queryKey: ['architect-history', selectedConnectionId],
    queryFn: async () => { const res = await architectApi.getHistory(selectedConnectionId || undefined); return res.data || []; },
    enabled: !!selectedConnectionId || view === 'history'
  });

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
        setMessages([{ role: 'atlas', content: "Hello! I'm ATLAS — your Senior Database Architect.\n\nTell me about your database requirements — what is the application about, how many users do you expect, and what features do you need? We'll build the perfect blueprint together!" }]);
      } else {
        handleAudit(session.id);
      }
    },
    onError: () => toast.error('Session create failed'),
  });

  useEffect(() => {
    if (sessionId) localStorage.setItem('last_architect_session', sessionId);
    else localStorage.removeItem('last_architect_session');
  }, [sessionId]);

  useEffect(() => {
    if (sessions && sessions.length > 0 && sessionId && !blueprint && !audit && messages.length === 0) {
      const s = sessions.find((session: any) => session.id === sessionId);
      if (s) {
        setMode(s.mode);
        if (s.current_design) {
          if (s.mode === 'new') setBlueprint(s.current_design);
          else setAudit(s.current_design);
        }
        const transcript = s.requirements_transcript || [];
        if (transcript.length === 0) {
          setMessages([{ role: 'atlas', content: "Hello! I'm ATLAS — your Senior Database Architect.\n\nTell me about your database requirements — what is the application about, how many users do you expect, and what features do you need? We'll build the perfect blueprint together!" }]);
        } else {
          setMessages(transcript.map((m: any) => ({ role: m.role, content: m.content })));
        }
      }
    }
  }, [sessions, sessionId, blueprint, audit, messages.length]);

  useEffect(() => {
    if (sessions && sessionId) {
      const s = sessions.find((session: any) => session.id === sessionId);
      if (s) {
        if ((s.status as string) === 'generating') {
          setIsGenerating(true);
          if (!generationStatus) setGenerationStatus('🔍 Meghna analyzing requirements...');
        } else if ((s.status as string) === 'completed' && isGenerating) {
          setIsGenerating(false);
          setGenerationStatus('');
          if (s.current_design) setBlueprint(s.current_design);
          toast.success('Blueprint ready! 🎉');
        }
      }
    }
  }, [sessions, sessionId, isGenerating, generationStatus]);

  useEffect(() => {
    let interval: any;
    if (isGenerating) interval = setInterval(() => refetchSessions(), 3000);
    return () => { if (interval) clearInterval(interval); };
  }, [isGenerating, refetchSessions]);

  const handleEditMessage = async (index: number, _content: string) => {
    if (!sessionId) return;
    const isDummyPresent = messages.length > 0 && messages[0].content.includes('Hello! I');
    const dbOffset = isDummyPresent ? Math.max(0, index - 1) : index;
    try {
      toast.loading('Rewinding...', { id: 'rewind' });
      await designStudioApi.truncateMessages(sessionId, dbOffset);
      setMessages(prev => prev.slice(0, index + 1));
      setEditingIndex(index);
      setBlueprint(null);
      setIsReadyToGenerate(false);
      toast.success('Rewound. Send your edited message.', { id: 'rewind' });
    } catch (err: any) {
      toast.error(err.message || 'Rewind failed', { id: 'rewind' });
    }
  };

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://llm-3qnu.onrender.com');
    const socketUrl = apiUrl.replace('/api', '');
    const socket = io(socketUrl, { withCredentials: true });
    socketRef.current = socket;

    socket.on('probe_chunk', (data: any) => {
      const textChunk = typeof data === 'string' ? data : data?.chunk;
      const targetSid = typeof data === 'object' ? data?.sessionId : null;
      if (targetSid && targetSid !== sessionIdRef.current) return;
      setMessages(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === 'atlas') last.content += textChunk;
        return next;
      });
    });

    socket.on('probe_end', (data: any) => {
      setStreamingSessionId(null);
      const targetSid = data?.sessionId;
      if (targetSid && targetSid !== sessionIdRef.current) return;
      if (data.isReadyToGenerate) setIsReadyToGenerate(true);
      setMessages(prev => {
        const next = [...prev];
        if (next.length > 0 && next[next.length - 1].role === 'atlas') {
          next[next.length - 1].content = data.fullReply;
        }
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['ds-sessions'] });
    });

    socket.on('probe_error', (data: any) => {
      setStreamingSessionId(null);
      const targetSid = typeof data === 'object' ? data?.sessionId : null;
      const errMsg = typeof data === 'string' ? data : (data?.error || 'Streaming error');
      if (targetSid && targetSid !== sessionIdRef.current) return;
      toast.error(errMsg);
      setMessages(prev => {
        const next = [...prev];
        if (next.length > 0 && next[next.length - 1].role === 'atlas' && !next[next.length - 1].content.trim()) {
          next.pop();
        }
        return next;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  const handleSend = (userMsg: string) => {
    if (!sessionId) return;
    if (editingIndex !== null) {
      setMessages(prev => { const next = prev.slice(0, editingIndex); next.push({ role: 'user', content: userMsg }); next.push({ role: 'atlas', content: '' }); return next; });
      setEditingIndex(null);
    } else {
      setMessages(prev => [...prev, { role: 'user', content: userMsg }, { role: 'atlas', content: '' }]);
    }
    setStreamingSessionId(sessionId);
    const userId = useAuthStore.getState().user?.id || '';
    socketRef.current?.emit('probe_requirements', { sessionId, userId, userMessage: userMsg, provider: aiProvider, model: aiModel });
  };

  const handleGenerateBlueprint = async () => {
    setIsGenerating(true);
    setGenerationStatus('Starting...');
    setShowSessions(false);
    setShowPanel(true);
    try {
      const finalSchema = await designStudioApi.generateSchema(
        { sessionId: sessionId!, provider: aiProvider, model: aiModel },
        (status) => setGenerationStatus(status)
      );
      setBlueprint(finalSchema);
      setIsReadyToGenerate(false);
      setDeployedSessionIds(prev => { const s = new Set(prev); s.delete(sessionId!); return s; });
      queryClient.invalidateQueries({ queryKey: ['ds-sessions'] });
      toast.success('Blueprint ready! 🎉');
    } catch (err: any) {
      toast.error(err.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
      setGenerationStatus('');
    }
  };

  const handleExecuteFix = async (fix: any) => {
    if (!selectedConnectionId) return toast.error('Select a connection first');
    try {
      toast.loading('Applying fix...');
      await architectApi.applyFix({ connectionId: selectedConnectionId, title: fix.title, description: fix.explanation || fix.detail || fix.description || '', sql: fix.sql, rollbackSql: fix.rollback_sql || fix.rollbackSql || null, confirmWrite: true });
      queryClient.invalidateQueries({ queryKey: ['schema', selectedConnectionId] });
      toast.dismiss();
      toast.success(`Applied: ${fix.title}`);
      setConfirmModal({ show: false, fix: null });
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || 'Fix failed');
    }
  };

  const handleAudit = async (sid?: string) => {
    if (!selectedConnectionId) return toast.error('Select a database connection');
    setIsAuditRunning(true);
    setAudit(null);
    try {
      const activeSessionId = sid || (sessionId === 'historical' ? undefined : sessionId || undefined);
      const response = await designStudioApi.auditExisting({ connectionId: selectedConnectionId, sessionId: activeSessionId!, provider: aiProvider, model: aiModel });
      setAudit(response.data);
      toast.success('Audit complete! 🔍');
    } catch (err: any) {
      toast.error(err.message || 'Audit failed');
    } finally {
      setIsAuditRunning(false);
    }
  };


  const loadSession = (s: any) => {
    setSessionId(s.id);
    setMode(s.mode);
    setAudit(null); setBlueprint(null);
    if (s.current_design) {
      if (s.mode === 'new') setBlueprint(s.current_design);
      else setAudit(s.current_design);
    }
    const transcript = s.requirements_transcript || [];
    if (transcript.length === 0) {
      setMessages([{ role: 'atlas', content: "Hello! I'm ATLAS — your Senior Database Architect.\n\nTell me about your database requirements — what is the application about, how many users do you expect, and what features do you need? We'll build the perfect blueprint together!" }]);
    } else {
      setMessages(transcript.map((m: any) => ({ role: m.role, content: m.content })));
    }
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex-1 h-full min-h-0 flex flex-col overflow-hidden">

        {/* ── TOP BAR ── */}
        <header className="flex-shrink-0 flex flex-wrap items-center justify-between gap-2 px-3 md:px-4 py-2 border-b border-white/5 bg-[#0B0E18]/90 backdrop-blur-md pl-14 md:pl-4">
          {/* Left: Brand + Section Indicator */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowSessions(v => !v)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
              title={showSessions ? "Hide Sessions Rail" : "Show Sessions Rail"}
            >
              {showSessions ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
            </button>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-bold text-white tracking-wide truncate max-w-[110px] sm:max-w-none">Schemio Studio</span>
              <span className="hidden sm:inline text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                {mode === 'new' ? 'Architect' : 'Auditor'}
              </span>
            </div>
          </div>

          {/* Center: Action View Tabs */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/8 p-0.5 rounded-xl">
            {(['chat', 'history', 'changelog'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  view === v 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {v === 'chat' ? <MessageSquare size={12} /> : v === 'history' ? <History size={12} /> : <Database size={12} />}
                <span>{v === 'changelog' ? 'Changelog' : v.charAt(0).toUpperCase() + v.slice(1)}</span>
              </button>
            ))}
          </div>

          {/* Right: Controls & Settings */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Mode Switcher */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/8 p-0.5 rounded-xl">
              {(['new', 'existing'] as Mode[]).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setSessionId(null); setMessages([]); setBlueprint(null); setAudit(null); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    mode === m 
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {m === 'new' ? '⚡ Builder' : '🔧 Auditor'}
                </button>
              ))}
            </div>

            {/* DB Connection Selector */}
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/8 rounded-xl px-2.5 py-1">
              <Database size={12} className="text-blue-400 flex-shrink-0" />
              <select
                className="bg-transparent border-none focus:ring-0 text-xs font-semibold text-white cursor-pointer max-w-[130px]"
                value={selectedConnectionId || ''}
                onChange={(e) => setSelectedConnectionId(e.target.value)}
              >
                <option value="" className="bg-slate-900 text-slate-400">Select DB</option>
                {connections?.map((c: any) => <option key={c.id} value={c.id} className="bg-slate-900 text-white">{c.name}</option>)}
              </select>
              {selectedConnectionId && (
                <button 
                  onClick={() => syncMutation.mutate()} 
                  disabled={syncMutation.isPending} 
                  className="text-slate-500 hover:text-white transition-colors"
                  title="Sync Cache"
                >
                  <RefreshCw size={11} className={syncMutation.isPending ? 'animate-spin text-blue-400' : ''} />
                </button>
              )}
            </div>

            {/* AI Model Selector */}
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/8 rounded-xl px-2.5 py-1">
              <Cpu size={12} className="text-purple-400 flex-shrink-0" />
              <select
                className="bg-transparent border-none focus:ring-0 text-xs font-semibold text-white cursor-pointer max-w-[120px]"
                value={`${aiProvider}|${aiModel}`}
                onChange={(e) => { const [p, m] = e.target.value.split('|'); setAiConfig(p, m); }}
              >
                <optgroup label="OpenRouter" className="bg-slate-900">
                  <option value="openrouter|google/gemini-2.5-flash" className="bg-slate-900">Gemini 2.5 Flash</option>
                  <option value="openrouter|meta-llama/llama-3.3-70b-instruct" className="bg-slate-900">Llama 3.3 70B</option>
                  <option value="openrouter|google/gemini-2.5-pro" className="bg-slate-900">Gemini 2.5 Pro</option>
                </optgroup>
                <optgroup label="OpenAI" className="bg-slate-900">
                  <option value="openai|gpt-4o" className="bg-slate-900">GPT-4o</option>
                  <option value="openai|gpt-4o-mini" className="bg-slate-900">GPT-4o Mini</option>
                </optgroup>
                <optgroup label="Google" className="bg-slate-900">
                  <option value="gemini|gemini-1.5-pro-latest" className="bg-slate-900">Gemini 1.5 Pro</option>
                  <option value="gemini|gemini-1.5-flash-latest" className="bg-slate-900">Gemini 1.5 Flash</option>
                </optgroup>
              </select>
            </div>

            {/* View Mode Toggle & Regenerate Button when Blueprint / Audit is available */}
            {hasOutput && (
              <div className="flex items-center gap-2">
                {blueprint && mode === 'new' && (
                  <button
                    onClick={handleGenerateBlueprint}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 px-3 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                    title="Re-run 4-Agent Consensus Pipeline"
                  >
                    <RefreshCw size={11} className={isGenerating ? 'animate-spin' : ''} />
                    <span>Regenerate</span>
                  </button>
                )}

                <div className="flex items-center gap-1 bg-white/5 border border-white/8 p-0.5 rounded-xl">
                  <button
                    onClick={() => { setShowPanel(true); }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      showPanel ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                    title="Split View (Chat + Blueprint Canvas)"
                  >
                    Split View
                  </button>
                  <button
                    onClick={() => { setShowPanel(false); }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      !showPanel ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                    title="Focus Chat"
                  >
                    Chat Only
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ── LIVE OUT-OF-BAND SCHEMA DRIFT ALERT BANNER ── */}
        {driftReport?.hasDrift && (
          <div className="flex-shrink-0 flex items-center justify-between gap-4 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 backdrop-blur-md animate-in fade-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <AlertTriangle size={15} className="text-amber-400 flex-shrink-0" />
              <span className="text-xs font-bold text-amber-200">
                Out-of-Band Schema Drift Detected:
              </span>
              <span className="text-xs text-amber-300/80">
                Live database was modified externally ({driftReport.summary.addedTables} added, {driftReport.summary.removedTables} dropped, {driftReport.summary.modifiedTables} modified).
              </span>
              <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${
                driftReport.riskLevel === 'HIGH' 
                  ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                  : driftReport.riskLevel === 'MEDIUM'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                Risk: {driftReport.riskLevel}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                <RefreshCw size={11} className={syncMutation.isPending ? 'animate-spin' : ''} />
                <span>Sync Blueprint with Live DB</span>
              </button>
            </div>
          </div>
        )}

        {/* ── BODY: sessions + chat + panel ── */}
        <div className="flex-1 min-h-0 flex overflow-hidden">

          {/* Sessions sidebar */}
          {showSessions && (
            <aside className="w-60 flex-shrink-0 flex flex-col border-r border-white/5 bg-[#0B0E18]/60 overflow-hidden">
              {/* New session button */}
              <div className="p-3 border-b border-white/5">
                <button
                  onClick={() => {
                    if (mode === 'existing' && !selectedConnectionId) return toast.error('Select a connection first');
                    createSession.mutate({ mode, connectionId: selectedConnectionId || undefined });
                  }}
                  disabled={createSession.isPending}
                  className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-purple-600/20 active:scale-[0.97]"
                >
                  {createSession.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  {mode === 'new' ? 'New Blueprint' : 'New Audit'}
                </button>
              </div>

              {/* Session list */}
              <div className="flex-1 overflow-y-auto scrollbar-none">
                {view === 'chat' && (
                  <div className="p-2 space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 px-2 py-1">Recent</p>
                    {!sessions || sessions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center opacity-30 space-y-2">
                        <Wand2 size={20} />
                        <p className="text-[10px]">No sessions yet</p>
                      </div>
                    ) : sessions.map((s: any) => (
                      <div
                        key={s.id}
                        onClick={() => loadSession(s)}
                        className={`group flex items-center gap-2 px-2.5 py-2 rounded-xl cursor-pointer transition-all ${s.id === sessionId ? 'bg-purple-600/15 border border-purple-500/30' : 'hover:bg-white/5 border border-transparent'}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.mode === 'new' ? 'bg-blue-400' : 'bg-orange-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-slate-300 truncate leading-tight">
                            {(s.requirements_transcript?.[0]?.content ?? '').slice(0, 35) || 'New session'}
                          </p>
                          <p className="text-[9px] text-slate-600 mt-0.5">{new Date(s.created_at).toLocaleDateString()}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteModal({ show: true, type: 'session', id: s.id, title: s.requirements_transcript?.[0]?.content?.slice(0, 60) || 'Session' }); }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-all flex-shrink-0"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {view === 'history' && (
                  <div className="p-2 space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 px-2 py-1">Audit History</p>
                    {auditHistory?.map((h: any) => (
                      <div
                        key={h.id}
                        onClick={() => { setAudit(h.review_data); setMode('existing'); setSessionId('historical'); }}
                        className="group flex items-center gap-2 px-2.5 py-2 rounded-xl cursor-pointer hover:bg-white/5 border border-transparent transition-all"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-slate-300 truncate">{h.connection_name}</p>
                          <p className="text-[9px] text-slate-600">{new Date(h.created_at).toLocaleDateString()} · {h.scalability_score}%</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteModal({ show: true, type: 'audit', id: h.id, title: h.connection_name }); }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-all flex-shrink-0"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {view === 'changelog' && (
                  <div className="p-2 space-y-1.5">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 px-2 py-1">Schema Changes</p>
                    {!selectedConnectionId ? (
                      <p className="text-[10px] text-slate-600 px-2 italic">Select a connection</p>
                    ) : !mutations || mutations.length === 0 ? (
                      <p className="text-[10px] text-slate-600 px-2 italic">No changes yet</p>
                    ) : mutations.map((m: any) => (
                      <div key={m.id} className="bg-white/3 border border-white/5 rounded-xl p-2.5 space-y-1.5">
                        <div className="flex justify-between items-start gap-1">
                          <p className="text-[10px] font-semibold text-slate-300 leading-snug flex-1">{m.title}</p>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase flex-shrink-0 ${m.status === 'APPLIED' ? 'bg-emerald-500/10 text-emerald-400' : m.status === 'ROLLED_BACK' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'}`}>{m.status}</span>
                        </div>
                        {m.description && <p className="text-[9px] text-slate-500 leading-normal">{m.description}</p>}
                        <p className="text-[8px] text-slate-600">{new Date(m.created_at).toLocaleString()}</p>
                        {m.status === 'APPLIED' && m.rollback_sql && (
                          <button onClick={() => { if (confirm(`Rollback "${m.title}"?`)) rollbackMutation.mutate(m.id); }} disabled={rollbackMutation.isPending} className="w-full mt-1 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-all">Rollback</button>
                        )}
                      </div>
                    ))}
                    {/* Live Table Inspector */}
                    {selectedConnectionId && schema?.tables && (
                      <div className="pt-3 border-t border-white/5 space-y-1">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 px-2 py-1">Live Tables</p>
                        {schema.tables.map((t: any) => (
                          <div key={t.table_name} className="group flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/5 transition-all">
                            <Database size={10} className="text-blue-400/70 flex-shrink-0" />
                            <span className="text-[10px] font-semibold text-slate-400 truncate flex-1">{t.table_name}</span>
                            <button onClick={() => setInspectingTable(t.table_name)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all">
                              <Eye size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </aside>
          )}

          {/* ── Chat area ── */}
          <div className={`flex flex-col overflow-hidden ${hasOutput && showPanel ? 'w-[42%] flex-shrink-0 border-r border-white/5' : 'flex-1'}`}>
            {!sessionId ? (
              /* Empty state */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-40 space-y-4">
                <Wand2 size={48} className="text-purple-400" />
                <div>
                  <h3 className="text-lg font-bold">ATLAS Architect Studio</h3>
                  <p className="text-sm text-slate-500 mt-1">Create a new session or load from history</p>
                </div>
              </div>
            ) : (
              <DesignStudioChat
                messages={messages}
                onSendMessage={handleSend}
                isLoading={isStreaming}
                isReadyToGenerate={isReadyToGenerate}
                onGenerate={handleGenerateBlueprint}
                isGenerating={isGenerating}
                mode={mode}
                onApplyAction={handleExecuteFix}
                onAudit={() => handleAudit()}
                isAuditing={isAuditRunning}
                onEditMessage={handleEditMessage}
              />
            )}
          </div>

          {/* ── Blueprint / Visualizer Panel ── */}
          {hasOutput && showPanel && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {isAuditRunning ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-6 p-8">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto text-blue-400 animate-pulse" size={20} />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-bold uppercase tracking-wider text-white">Multi-Agent Audit Board is Reviewing...</p>
                    <p className="text-[11px] text-slate-500 max-w-[280px]">Deep scanning active tables, security policies, and indexes</p>
                  </div>
                  <div className="w-full max-w-[340px] space-y-3 pt-4 border-t border-white/5">
                    {[
                      { name: 'Agent 1: Security & Multi-Tenant Specialist', desc: 'Scanning unencrypted PII & missing RLS' },
                      { name: 'Agent 2: Query Optimizer & Index Engineer', desc: 'Detecting missing FK indexes & table scans' },
                      { name: 'Agent 3: ACID & Normalization Architect', desc: 'Checking 3NF relations & CHECK constraints' },
                      { name: 'Remediation Compiler', desc: 'Generating copy-paste SQL migration fixes' }
                    ].map((step, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-md flex items-center justify-center border border-blue-500/30 bg-blue-500/10 text-blue-400 text-[9px] font-bold">
                            ▶
                          </div>
                          <div>
                            <p className="text-slate-200 font-semibold text-[11px]">{step.name}</p>
                            <p className="text-[9px] text-slate-500">{step.desc}</p>
                          </div>
                        </div>
                        <Loader2 size={11} className="animate-spin text-blue-400 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : isGenerating ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-6 p-8">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto text-purple-400 animate-pulse" size={20} />
                  </div>
                  <div className="text-center space-y-1.5">
                    <p className="text-sm font-bold uppercase tracking-wider">ATLAS is compiling...</p>
                    <p className="text-[11px] text-slate-500 max-w-[260px]">Tab can be closed. Generation continues in background.</p>
                  </div>
                  <div className="w-full max-w-[320px] space-y-3 pt-4 border-t border-white/5">
                    {(['meghna', 'sam', 'victor', 'postgres', 'visualizer'] as const).map((step, idx) => {
                      const labels = [
                        'Meghna: 3NF & Integrity Planner',
                        'Sam: Production DDL Compiler',
                        'Victor: RLS & Index Hardening Auditor',
                        'Postgres: Dry-Run Sandbox Test',
                        'Visualizer: Layout & Topology Planner'
                      ];
                      const status = getStepStatus(step);
                      return (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center border text-[9px] font-bold ${status === 'completed' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : status === 'active' ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'border-white/8 text-slate-700'}`}>
                              {status === 'completed' ? '✓' : status === 'active' ? '▶' : ''}
                            </div>
                            <span className={status === 'active' ? 'text-white font-bold animate-pulse' : status === 'completed' ? 'text-slate-500' : 'text-slate-700'}>{labels[idx]}</span>
                          </div>
                          {status === 'active' && <Loader2 size={11} className="animate-spin text-purple-400" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : blueprint ? (
                <BlueprintPanel
                  schema={blueprint}
                  sessionId={sessionId!}
                  connectionId={selectedConnectionId}
                  onDeploy={(payload) => deployMutation.mutate(payload)}
                  isDeploying={deployMutation.isPending}
                  isDeployed={sessions?.find((s: any) => s.id === sessionId)?.status === 'deployed' || deployedSessionIds.has(sessionId!)}
                />
              ) : audit ? (
                <AuditPanel
                  audit={audit}
                  onApplyFix={(fix: any) => setConfirmModal({ show: true, fix })}
                  appliedMutations={mutations}
                />
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* ── MODALS ── */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#0F1420] border border-white/10 rounded-3xl p-8 shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <ShieldAlert size={24} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Execute Architectural Fix</h3>
              <p className="text-slate-400 text-sm mt-1 leading-relaxed">This will modify your live database:</p>
              <div className="mt-2 p-3 bg-white/5 rounded-xl border border-white/8 text-sm text-white italic">"{confirmModal.fix?.title}"</div>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => handleExecuteFix(confirmModal.fix)} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-sm transition-all">Confirm & Execute</button>
              <button onClick={() => setConfirmModal({ show: false, fix: null })} className="w-full py-3 bg-white/5 text-slate-400 hover:text-white rounded-2xl font-bold text-sm transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {inspectingTable && selectedConnectionId && (
        <TableDataInspector connectionId={selectedConnectionId} tableName={inspectingTable} onClose={() => setInspectingTable(null)} />
      )}

      {deleteModal.show && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#0F1420] border border-white/10 rounded-3xl p-8 shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <Trash2 size={24} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Confirm Delete</h3>
              <p className="text-slate-400 text-sm mt-1">This cannot be undone.</p>
              {deleteModal.title && <div className="mt-2 p-2.5 bg-white/5 rounded-xl text-xs text-slate-500 font-mono">{deleteModal.title}</div>}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  if (deleteModal.type === 'session' && deleteModal.id) deleteSessionMutation.mutate(deleteModal.id);
                  else if (deleteModal.type === 'audit' && deleteModal.id) deleteAuditMutation.mutate(deleteModal.id);
                  setDeleteModal({ show: false, type: null, id: null, title: '' });
                }}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold text-sm transition-all"
              >
                Delete Permanently
              </button>
              <button onClick={() => setDeleteModal({ show: false, type: null, id: null, title: '' })} className="w-full py-3 bg-white/5 text-slate-400 hover:text-white rounded-2xl font-bold text-sm transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
