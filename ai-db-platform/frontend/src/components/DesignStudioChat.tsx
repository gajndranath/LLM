import { useRef, useEffect, useState, useCallback } from 'react';
import { Loader2, Send, Sparkles, User, Edit2, Copy, RefreshCw, ChevronDown, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

interface Message { role: 'user' | 'atlas'; content: string; }

interface DesignStudioChatProps {
  messages: Message[];
  onSendMessage: (msg: string) => void;
  isLoading: boolean;
  isReadyToGenerate: boolean;
  onGenerate: () => void;
  isGenerating?: boolean;
  mode?: 'new' | 'existing';
  onApplyAction?: (action: any) => void;
  onAudit?: () => void;
  isAuditing?: boolean;
  onEditMessage?: (index: number, content: string) => void;
}

export default function DesignStudioChat({
  messages,
  onSendMessage,
  isLoading,
  isReadyToGenerate,
  onGenerate,
  isGenerating = false,
  mode = 'new',
  onApplyAction,
  onAudit,
  isAuditing = false,
  onEditMessage
}: DesignStudioChatProps) {
  const [input, setInput] = useState('');
  const [isAtBottom, setIsAtBottom] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages only if already near bottom
  useEffect(() => {
    if (isAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isAtBottom]);

  // Detect scroll position
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setIsAtBottom(scrollHeight - scrollTop - clientHeight < 60);
  }, []);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsAtBottom(true);
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
  };

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsAtBottom(true);
  };

  const renderMessageContent = (content: string) => {
    // 1. Extract <think> reasoning blocks if present (Claude / Antigravity Style)
    let processedContent = content;
    const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
    let thinkMatch;
    const thinkParts: React.ReactNode[] = [];

    while ((thinkMatch = thinkRegex.exec(content)) !== null) {
      const thinkingText = thinkMatch[1].trim();
      if (thinkingText) {
        thinkParts.push(
          <details key={`think-${thinkMatch.index}`} className="mb-3.5 group/think bg-[#090D18]/90 border border-blue-500/25 rounded-2xl overflow-hidden text-xs shadow-xl backdrop-blur-md" open>
            <summary className="px-4 py-2.5 cursor-pointer font-semibold text-blue-300 flex items-center justify-between hover:bg-white/5 transition-all select-none border-b border-blue-500/10">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shadow-sm shadow-blue-400" />
                <span className="tracking-wider uppercase text-[10.5px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-indigo-200 to-purple-300">
                  Architectural Reasoning & Evaluation
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono group-open/think:rotate-180 transition-transform duration-200">▼</span>
            </summary>
            <div className="p-3.5 text-slate-300 font-mono text-[11.5px] leading-relaxed bg-black/40 whitespace-pre-wrap max-h-64 overflow-y-auto custom-scrollbar border-t border-white/5">
              {thinkingText}
            </div>
          </details>
        );
      }
    }
    processedContent = processedContent.replace(thinkRegex, '').trim();

    const actionRegex = /<ACTION>([\s\S]*?)<\/ACTION>/g;
    const parts: React.ReactNode[] = [...thinkParts];
    let lastIndex = 0;
    let match;

    while ((match = actionRegex.exec(processedContent)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <div key={`text-pre-${match.index}`} className="markdown-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {processedContent.substring(lastIndex, match.index)}
            </ReactMarkdown>
          </div>
        );
      }
      try {
        const actionData = JSON.parse(match[1].trim());
        parts.push(
          <div key={match.index} className="my-3.5 bg-gradient-to-b from-blue-950/30 to-slate-900/60 border border-blue-500/20 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
            <div className="bg-blue-600/20 px-4 py-2 border-b border-blue-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300">Suggested Action</span>
              </div>
              <Sparkles size={13} className="text-blue-400" />
            </div>
            <div className="p-4 space-y-3">
              <h4 className="text-sm font-bold text-white tracking-tight">{actionData.title}</h4>
              <pre className="text-xs font-mono bg-black/60 p-3.5 rounded-xl text-emerald-300 overflow-x-auto whitespace-pre-wrap border border-white/5">{actionData.sql}</pre>
              <button
                onClick={() => onApplyAction?.(actionData)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/25"
              >
                <Send size={12} />
                <span>Execute on Database</span>
              </button>
            </div>
          </div>
        );
      } catch {
        parts.push(<span key={`err-${match.index}`} className="text-red-400 text-xs italic">[Invalid Action Block]</span>);
      }
      lastIndex = actionRegex.lastIndex;
    }

    if (lastIndex < processedContent.length) {
      parts.push(
        <div key={`text-${lastIndex}`} className="markdown-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {processedContent.substring(lastIndex)}
          </ReactMarkdown>
        </div>
      );
    }
    return parts;
  };

  const mdComponents = {
    h1: ({ node, ...props }: any) => <h1 className="text-base font-bold mt-3 mb-1.5 text-white" {...props} />,
    h2: ({ node, ...props }: any) => <h2 className="text-sm font-bold mt-2.5 mb-1 text-white" {...props} />,
    h3: ({ node, ...props }: any) => <h3 className="text-xs font-bold mt-2 mb-1 text-white" {...props} />,
    p: ({ node, ...props }: any) => <p className="mb-2 last:mb-0 leading-relaxed text-[13.5px]" {...props} />,
    ul: ({ node, ...props }: any) => <ul className="list-disc list-inside mb-2 space-y-1 text-[13.5px]" {...props} />,
    ol: ({ node, ...props }: any) => <ol className="list-decimal list-inside mb-2 space-y-1 text-[13.5px]" {...props} />,
    li: ({ node, ...props }: any) => <li className="ml-1" {...props} />,
    strong: ({ node, ...props }: any) => <strong className="font-semibold text-blue-200" {...props} />,
    em: ({ node, ...props }: any) => <em className="italic opacity-90" {...props} />,
    pre: ({ node, ...props }: any) => <pre className="bg-black/50 p-3 rounded-xl overflow-x-auto my-2 border border-white/5 text-xs font-mono" {...props} />,
    code: ({ node, inline, ...props }: any) =>
      inline
        ? <code className="bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded font-mono text-[11px] border border-blue-500/20" {...props} />
        : <code className="text-slate-200 font-mono text-xs" {...props} />,
  };

  const userMessages = messages.filter(m => m.role === 'user');

  return (
    <div className="flex flex-col h-full min-h-0 relative overflow-hidden bg-gradient-to-b from-transparent via-black/10 to-black/30">

      {/* Messages scroll area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 custom-scrollbar px-4 sm:px-10 py-6"
      >
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 border border-blue-500/30 flex items-center justify-center shadow-xl shadow-blue-500/10">
                <Bot size={26} className="text-blue-400" />
              </div>
              <div className="space-y-1.5">
                <p className="text-base font-bold text-white tracking-wide">ATLAS Database Architect</p>
                <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                  {mode === 'new'
                    ? 'Tell ATLAS about your application data model, expected traffic, and features to generate an enterprise-grade schema.'
                    : 'Analyze performance bottlenecks, audit schema normalization, or inspect tables.'}
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => {
            if (msg.role === 'atlas' && !msg.content.trim()) return null;
            const isUser = msg.role === 'user';
            const isLastAtlas = !isUser && i === messages.length - 1;

            return (
              <div key={i} id={`msg-${i}`} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group transition-all`}>
                {/* Avatar + Bubble row */}
                <div className={`flex items-start gap-3 max-w-[88%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar with distinctive Agent / User icons */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-md ${
                    isUser 
                      ? 'bg-slate-700/80 border border-slate-600/60 shadow-slate-900/50' 
                      : 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 border border-blue-400/40 shadow-blue-600/30'
                  }`}>
                    {isUser ? <User size={14} className="text-slate-200" /> : <Bot size={15} className="text-white" />}
                  </div>

                  {/* Professional Message Bubble */}
                  <div className={`px-4 py-3 rounded-2xl leading-relaxed shadow-lg ${
                    isUser
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-tr-sm border border-blue-400/20'
                      : 'bg-[#111622] border border-white/10 text-slate-100 rounded-tl-sm backdrop-blur-md'
                  }`}>
                    {renderMessageContent(msg.content)}
                  </div>
                </div>

                {/* Action Bar (hover triggered) */}
                <div className={`flex items-center gap-2 mt-1.5 px-11 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ${isUser ? 'flex-row-reverse' : ''}`}>
                  {isUser ? (
                    <button
                      onClick={() => { setInput(msg.content); onEditMessage?.(i, msg.content); textareaRef.current?.focus(); }}
                      className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-white transition-colors py-0.5 px-1.5 rounded hover:bg-white/5"
                    >
                      <Edit2 size={10} />
                      <span>Edit & Rewind</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => navigator.clipboard.writeText(msg.content).then(() => toast.success('Copied to clipboard'))}
                        className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-white transition-colors py-0.5 px-1.5 rounded hover:bg-white/5"
                      >
                        <Copy size={10} />
                        <span>Copy</span>
                      </button>
                      {isLastAtlas && (
                        <button
                          onClick={() => {
                            const prevUserIdx = [...messages].slice(0, i).reverse().findIndex(m => m.role === 'user');
                            if (prevUserIdx !== -1) {
                              const realIdx = i - 1 - prevUserIdx;
                              onEditMessage?.(realIdx, messages[realIdx].content);
                            }
                          }}
                          className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-white transition-colors py-0.5 px-1.5 rounded hover:bg-white/5"
                        >
                          <RefreshCw size={10} />
                          <span>Regenerate</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Claude / Antigravity Style Thinking Indicator */}
          {isLoading && (
            <div className="flex items-start gap-3 animate-in fade-in duration-300">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 border border-blue-400/40 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/30">
                <Bot size={15} className="text-white animate-pulse" />
              </div>
              <div className="bg-[#111622] border border-blue-500/20 px-4 py-3 rounded-2xl rounded-tl-sm shadow-xl flex items-center gap-3">
                <div className="relative flex items-center justify-center">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-500/30 border-t-blue-400 animate-spin" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-blue-300 animate-pulse">
                    ATLAS is analyzing requirements & architecture...
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Evaluating scale, multi-tenant isolation, and schema constraints
                  </p>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} className="h-1" />
        </div>
      </div>

      {/* Floating Jump to Latest Button */}
      {!isAtBottom && messages.length > 0 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={scrollToBottom}
            className="flex items-center gap-1.5 bg-blue-600/90 hover:bg-blue-600 backdrop-blur-md border border-blue-400/40 text-white text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-2xl transition-all active:scale-95"
          >
            <ChevronDown size={14} />
            <span>Jump to latest</span>
          </button>
        </div>
      )}

      {/* Smart Conversation Quick-Jump Navigator (Anchored Right with max-h and scroll) */}
      {userMessages.length > 1 && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-center gap-1 z-20 bg-[#0B0E18]/85 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl shadow-2xl max-h-[60vh]">
          <div className="flex items-center justify-between w-full px-1 pb-1 mb-0.5 border-b border-white/10">
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Steps</span>
            <span className="text-[8px] font-mono text-blue-400 font-bold ml-1.5">{userMessages.length}</span>
          </div>

          <div className="flex flex-col items-center gap-1.5 overflow-y-auto scrollbar-none py-0.5 max-h-[50vh]">
            {userMessages.map((_, stepIdx) => {
              const msgIdx = messages.findIndex((m, i) => m.role === 'user' && messages.slice(0, i + 1).filter(x => x.role === 'user').length === stepIdx + 1);
              const userMsgText = messages[msgIdx]?.content || '';
              return (
                <button
                  key={stepIdx}
                  onClick={() => document.getElementById(`msg-${msgIdx}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  className="group relative w-6 h-6 rounded-lg bg-white/5 border border-white/8 hover:bg-blue-600 hover:border-blue-500 flex items-center justify-center text-[10px] font-bold text-slate-400 hover:text-white transition-all flex-shrink-0"
                  title={`Jump to message ${stepIdx + 1}`}
                >
                  {stepIdx + 1}
                  <div className="absolute right-8 hidden group-hover:flex bg-slate-900 border border-white/10 px-2.5 py-1.5 rounded-xl text-[11px] text-slate-200 shadow-2xl whitespace-nowrap pointer-events-none max-w-[220px] truncate z-30">
                    <span className="font-semibold text-blue-400 mr-1.5">#{stepIdx + 1}</span>
                    {userMsgText.slice(0, 45)}…
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Action / Input Container */}
      <div className="flex-shrink-0 border-t border-white/5 bg-[#0B0E18]/80 backdrop-blur-md px-4 sm:px-8 py-3">
        <div className="max-w-3xl mx-auto space-y-2">

          {/* Ready to generate banner */}
          {isReadyToGenerate && (
            <div className="px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-emerald-300">Requirements gathered! Ready to compile blueprint.</span>
              </div>
              <button
                onClick={onGenerate}
                disabled={isGenerating}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 active:scale-95"
              >
                {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                <span>{isGenerating ? 'Compiling…' : 'Generate Blueprint'}</span>
              </button>
            </div>
          )}

          {/* Audit banner */}
          {mode === 'existing' && onAudit && (
            <div className="px-4 py-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-blue-300">Live Database Architectural Audit</span>
              <button
                onClick={onAudit}
                disabled={isAuditing}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 active:scale-95 shadow-md shadow-blue-600/20"
              >
                {isAuditing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                <span>{isAuditing ? 'Auditing…' : 'Run Audit'}</span>
              </button>
            </div>
          )}

          {/* Professional Compact Input Box */}
          <div className="flex items-center gap-2 bg-[#111622] border border-white/10 rounded-xl px-3.5 py-2.5 focus-within:border-blue-500/60 focus-within:ring-1 focus-within:ring-blue-500/30 transition-all shadow-inner">
            <textarea
              ref={textareaRef}
              rows={1}
              className="flex-1 bg-transparent text-[13.5px] text-white placeholder:text-slate-500 focus:outline-none resize-none leading-normal min-h-[24px] max-h-[120px] scrollbar-none"
              placeholder={mode === 'new' ? 'Describe your database requirements or vision…' : 'Ask ATLAS to analyze, modify, or optimize schema…'}
              value={input}
              onChange={handleInput}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              disabled={isLoading}
            />
            <button
              onClick={handleSubmit}
              disabled={isLoading || !input.trim()}
              className="flex-shrink-0 w-8 h-8 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 text-white rounded-lg transition-all active:scale-90 flex items-center justify-center shadow-md shadow-blue-600/25"
              title="Send message"
            >
              {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
