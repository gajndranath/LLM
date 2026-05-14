import { useRef, useEffect, useState } from 'react';
import { Loader2, Send, Sparkles, User, Search } from 'lucide-react';

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
  isAuditing = false
}: DesignStudioChatProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const renderMessageContent = (content: string) => {
    const actionRegex = /<ACTION>([\s\S]*?)<\/ACTION>/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = actionRegex.exec(content)) !== null) {
      // Text before action
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }

      // The action itself
      try {
        const actionData = JSON.parse(match[1].trim());
        parts.push(
          <div key={match.index} className="my-4 bg-white/10 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-blue-600/20 px-4 py-2 border-b border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Architectural Action</span>
              <Sparkles size={12} className="text-blue-400" />
            </div>
            <div className="p-4 space-y-3">
              <h4 className="text-sm font-bold text-white">{actionData.title}</h4>
              <pre className="text-[10px] font-mono bg-black/40 p-3 rounded-xl text-slate-400 overflow-x-auto whitespace-pre-wrap">{actionData.sql}</pre>
              <button
                onClick={() => onApplyAction?.(actionData)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20"
              >
                <Send size={12} />
                <span>Execute on Database</span>
              </button>
            </div>
          </div>
        );
      } catch (e) {
        console.error("Failed to parse action JSON", e);
        parts.push(<span className="text-red-400 text-xs italic">[Invalid Action Block]</span>);
      }

      lastIndex = actionRegex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-40 space-y-3">
            <Sparkles size={32} className="text-blue-400" />
            <p className="text-sm font-medium">ATLAS aapka intezaar kar raha hai...<br />{mode === 'new' ? 'Apne database ka vision share karo!' : 'Database modify karne ke liye command do!'}</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${msg.role === 'atlas' ? 'bg-blue-600' : 'bg-slate-700'}`}>
              {msg.role === 'atlas' ? <Sparkles size={14} className="text-white" /> : <User size={14} className="text-white" />}
            </div>
            <div className={`max-w-[90%] px-4 py-3 rounded-2xl text-sm font-medium leading-relaxed whitespace-pre-wrap ${msg.role === 'atlas' ? 'bg-white/5 border border-white/5 text-slate-200 rounded-tl-none' : 'bg-blue-600 text-white rounded-tr-none'}`}>
              {renderMessageContent(msg.content)}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Sparkles size={14} className="text-white" />
            </div>
            <div className="bg-white/5 border border-white/5 px-4 py-3 rounded-2xl rounded-tl-none">
              <Loader2 size={16} className="animate-spin text-blue-400" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Ready Banner */}
      {isReadyToGenerate && (
        <div className="mx-4 mb-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles size={16} className="text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400">ATLAS ne enough info gather kar li!</span>
          </div>
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center space-x-2 active:scale-95 shadow-lg shadow-emerald-600/20"
          >
            {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            <span>{isGenerating ? 'Generating...' : 'Generate Blueprint'}</span>
          </button>
        </div>
      )}

      {mode === 'existing' && onAudit && (
        <div className="mx-4 mb-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Search size={16} className="text-blue-400" />
            <span className="text-xs font-bold text-blue-400">Deep Architectural Review chahiye?</span>
          </div>
          <button
            onClick={onAudit}
            disabled={isAuditing}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center space-x-2 active:scale-95 shadow-lg shadow-blue-600/20"
          >
            {isAuditing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            <span>{isAuditing ? 'Auditing...' : 'Run Full Audit'}</span>
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-white/5">
        <div className="flex space-x-2">
          <input
            className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            placeholder={mode === 'new' ? "Apna database idea batao..." : "Database change karne ka command do..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            disabled={isLoading}
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white p-3 rounded-xl transition-all active:scale-95"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
