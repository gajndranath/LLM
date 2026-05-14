import { useState } from 'react';
import { CheckCircle2, AlertTriangle, ShieldAlert, Zap, ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { toast } from 'sonner';
import MermaidChart from './MermaidChart';

// ── Blueprint Panel (New DB mode result) ─────────────────────
export function BlueprintPanel({ schema }: { schema: any }) {
  const [activeTab, setActiveTab] = useState<'entities' | 'erd' | 'sql' | 'notes'>('entities');
  const [expandedEntity, setExpandedEntity] = useState<string | null>(null);

  const tabs = [
    { key: 'entities', label: 'Schema' },
    { key: 'erd', label: 'ERD' },
    { key: 'sql', label: 'SQL Scripts' },
    { key: 'notes', label: 'Strategy' },
  ] as const;

  return (
    <div className="flex flex-col h-full">
      {/* Badges */}
      <div className="flex items-center space-x-3 mb-4 flex-wrap gap-2">
        <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20 uppercase tracking-wider">
          {schema.normalization_level}
        </span>
        <span className={`text-[10px] font-bold px-3 py-1 rounded-full border uppercase tracking-wider ${schema.acid_compliance ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
          ACID {schema.acid_compliance ? '✓' : '✗'}
        </span>
        <span className="text-[10px] font-bold bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full border border-purple-500/20 uppercase tracking-wider">
          {schema.entities?.length || 0} Tables
        </span>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-4 bg-white/5 p-1 rounded-xl">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === t.key ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
          >
            {t.label.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto space-y-3">
        {/* Entities tab */}
        {activeTab === 'entities' && schema.entities?.map((entity: any) => (
          <div key={entity.name} className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
            <button
              onClick={() => setExpandedEntity(expandedEntity === entity.name ? null : entity.name)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-all"
            >
              <span className="text-sm font-bold text-blue-400">{entity.name}</span>
              {expandedEntity === entity.name ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {expandedEntity === entity.name && (
              <div className="px-4 pb-4 space-y-3 border-t border-white/5">
                <div className="space-y-1 mt-3">
                  {entity.fields?.map((f: any, i: number) => (
                    <div key={i} className="flex items-start justify-between text-[11px] py-1">
                      <span className="text-slate-300 font-medium">{f.column}</span>
                      <span className="text-slate-500 ml-2 text-right max-w-[60%] truncate">{f.type}</span>
                    </div>
                  ))}
                </div>
                {entity.indexes?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <span className="text-[9px] font-bold text-blue-500/60 uppercase tracking-widest">Indexes</span>
                    {entity.indexes.map((idx: string, i: number) => (
                      <div key={i} className="text-[10px] text-slate-500 font-mono bg-black/20 px-2 py-1 rounded-lg truncate">{idx}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* ERD tab */}
        {activeTab === 'erd' && (
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
            {schema.erd_mermaid ? <MermaidChart chart={schema.erd_mermaid} /> : <p className="text-slate-500 text-sm text-center py-8">No ERD generated</p>}
          </div>
        )}

        {/* SQL tab */}
        {activeTab === 'sql' && schema.sql_scripts?.map((script: any, i: number) => (
          <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">{script.description}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(script.sql); toast.success('SQL copied!'); }}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <Copy size={14} />
              </button>
            </div>
            <pre className="text-[10px] text-slate-400 font-mono bg-black/30 p-3 rounded-xl overflow-auto max-h-48 whitespace-pre-wrap">{script.sql}</pre>
          </div>
        ))}

        {/* Strategy tab */}
        {activeTab === 'notes' && (
          <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
            <p className="text-sm text-slate-300 leading-relaxed font-medium">{schema.scalability_notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Audit Panel (Existing DB mode result) ────────────────────
export function AuditPanel({ audit, onApplyFix }: { audit: any; onApplyFix?: (fix: any) => void }) {
  const [activeTab, setActiveTab] = useState<'insights' | 'architecture'>('insights');
  const severityColor: Record<string, string> = {
    CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/20',
    HIGH: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    MEDIUM: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    LOW: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  };

  const score = audit.health_score ?? 0;

  return (
    <div className="space-y-6 overflow-auto h-full pb-4 custom-scrollbar">
      {/* Health Score & Tabs */}
      <div className="bg-white/5 border border-white/5 rounded-[2rem] p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-5xl font-black text-white">{score}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">DB Health Score</div>
          </div>
          <div className="w-32">
            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 rounded-full ${score > 70 ? 'bg-emerald-500' : score > 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex space-x-1 bg-black/20 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('insights')}
            className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'insights' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
          >
            CRITICAL INSIGHTS
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'architecture' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-white'}`}
          >
            ARCHITECTURE MAPS
          </button>
        </div>
      </div>

      {activeTab === 'architecture' ? (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="space-y-3">
             <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 ml-1">Entity Relationship Diagram</h4>
             <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
               {audit.erd_mermaid ? <MermaidChart chart={audit.erd_mermaid} /> : <div className="py-10 text-center text-slate-600 text-xs italic">Diagram not available for this audit</div>}
             </div>
          </div>
          <div className="space-y-3">
             <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400 ml-1">Logical Data Flow</h4>
             <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
               {audit.dfd_mermaid ? <MermaidChart chart={audit.dfd_mermaid} /> : <div className="py-10 text-center text-slate-600 text-xs italic">Data flow not available for this audit</div>}
             </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

      {/* Issues */}
      {audit.issues?.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-red-400 flex items-center space-x-2">
            <ShieldAlert size={14} /><span>Issues Found ({audit.issues.length})</span>
          </h4>
          {audit.issues.map((issue: any, i: number) => (
            <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">{issue.title}</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${severityColor[issue.severity] || severityColor.MEDIUM}`}>{issue.severity}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[9px] bg-white/5 text-slate-500 px-2 py-0.5 rounded uppercase font-bold">{issue.category}</span>
                {issue.table && <span className="text-[9px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded uppercase font-bold">{issue.table}</span>}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{issue.detail}</p>
            </div>
          ))}
        </div>
      )}

      {/* Improvements */}
      {audit.improvements?.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-400 flex items-center space-x-2">
            <Zap size={14} /><span>Improvements ({audit.improvements.length})</span>
          </h4>
          {audit.improvements.map((imp: any, i: number) => (
            <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2 group">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">{imp.title}</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${severityColor[imp.priority] || severityColor.MEDIUM}`}>{imp.priority}</span>
              </div>
              <span className="text-[9px] bg-white/5 text-slate-500 px-2 py-0.5 rounded uppercase font-bold">{imp.category}</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">{imp.detail}</p>
              {imp.sql && (
                <div className="space-y-2">
                  <div className="relative">
                    <pre className="text-[10px] text-slate-400 font-mono bg-black/30 p-3 rounded-xl overflow-auto max-h-32 whitespace-pre-wrap">{imp.sql}</pre>
                    <button
                      onClick={() => { navigator.clipboard.writeText(imp.sql); toast.success('SQL copied!'); }}
                      className="absolute top-2 right-2 text-slate-500 hover:text-white"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                  {onApplyFix && (
                    <button
                      onClick={() => onApplyFix(imp)}
                      className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center space-x-2 active:scale-95"
                    >
                      <Zap size={12} />
                      <span>Apply Fix via ATLAS</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bottlenecks + Security + Recommendations */}
      {[
        { key: 'performance_bottlenecks', label: 'Performance Bottlenecks', icon: AlertTriangle, color: 'text-amber-400' },
        { key: 'security_concerns', label: 'Security Concerns', icon: ShieldAlert, color: 'text-red-400' },
        { key: 'recommendations', label: 'Recommendations', icon: CheckCircle2, color: 'text-blue-400' },
      ].map(({ key, label, icon: Icon, color }) => (
        audit[key]?.length > 0 && (
          <div key={key} className="space-y-2">
            <h4 className={`text-xs font-bold uppercase tracking-widest ${color} flex items-center space-x-2`}>
              <Icon size={14} /><span>{label}</span>
            </h4>
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2">
              {audit[key].map((item: string, i: number) => (
                <div key={i} className="flex items-start space-x-2 text-[11px] text-slate-400">
                  <div className="w-1 h-1 rounded-full bg-slate-600 mt-1.5 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )
      ))}
        </div>
      )}
    </div>
  );
}
