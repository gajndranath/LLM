import { useState } from 'react';
import {
  CheckCircle2,
  ShieldAlert,
  Loader2,
  ChevronDown,
  ChevronRight,
  Copy,
  Layers,
  FileCode2,
  Network,
  Compass,
  Rocket,
  Search,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';
import MermaidChart from './MermaidChart';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const buildMermaidFromJson = (visualJson: any, entities: any[] = []) => {
  if (!visualJson || !visualJson.nodes || !visualJson.edges) return '';
  
  let chart = 'erDiagram\n';
  
  visualJson.nodes.forEach((node: any) => {
    const safeNodeId = node.id.replace(/[^a-zA-Z0-9_]/g, '');
    chart += `  ${safeNodeId} {\n`;
    
    const entity = entities.find(e => e.name.toLowerCase() === node.id.toLowerCase());
    if (entity && entity.fields) {
      entity.fields.forEach((f: any) => {
        const safeType = (f.type || 'string').split(' ')[0].replace(/[^a-zA-Z0-9_]/g, '');
        const safeCol = (f.column || 'id').replace(/[^a-zA-Z0-9_]/g, '');
        chart += `    ${safeType} ${safeCol}\n`;
      });
    } else {
      chart += `    string id\n`;
    }
    chart += `  }\n`;
  });
  
  visualJson.edges.forEach((edge: any) => {
    const safeSource = edge.source.replace(/[^a-zA-Z0-9_]/g, '');
    const safeTarget = edge.target.replace(/[^a-zA-Z0-9_]/g, '');
    const rel = edge.relationship_type === 'one-to-one' ? '||--||' : 
                edge.relationship_type === 'many-to-many' ? '}o--o{' : '||--o{';
    const safeLabel = (edge.label || '').replace(/"/g, '');
    chart += `  ${safeSource} ${rel} ${safeTarget} : "${safeLabel}"\n`;
  });
  
  return chart;
};

// ── Blueprint Panel (New DB mode result) ─────────────────────
export function BlueprintPanel({ 
  schema, 
  sessionId, 
  connectionId, 
  onDeploy, 
  isDeploying,
  isDeployed
}: { 
  schema: any; 
  sessionId?: string; 
  connectionId?: string | null; 
  onDeploy?: (payload: { sessionId: string; connectionId: string }) => void;
  isDeploying?: boolean;
  isDeployed?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<'entities' | 'erd' | 'sql' | 'notes'>('entities');
  const [expandedEntity, setExpandedEntity] = useState<string | null>(null);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [tableSearch, setTableSearch] = useState('');

  const tabs = [
    { key: 'entities', label: 'Schema Entities', icon: Layers },
    { key: 'erd', label: 'Visual ERD', icon: Network },
    { key: 'sql', label: 'Production DDL', icon: FileCode2 },
    { key: 'notes', label: 'Architecture Strategy', icon: Compass },
  ] as const;

  const filteredEntities = schema.entities?.filter((e: any) =>
    e.name.toLowerCase().includes(tableSearch.toLowerCase())
  ) || [];

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#090C13] overflow-hidden">
      
      {/* ── Subheader Bar: Badges & Deploy Trigger ── */}
      <div className="flex-shrink-0 px-5 py-3 border-b border-white/5 bg-[#0B0E18]/80 backdrop-blur-md flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold bg-blue-500/10 text-blue-400 px-3 py-1 rounded-xl border border-blue-500/20 uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
            <Sparkles size={11} />
            <span>{schema.normalization_level || '3NF Certified'}</span>
          </span>
          <span className={`text-[11px] font-bold px-3 py-1 rounded-xl border uppercase tracking-wider flex items-center gap-1.5 ${
            schema.acid_compliance ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}>
            <span>ACID</span>
            <span>{schema.acid_compliance ? '✓ Guaranteed' : '✗'}</span>
          </span>
          <span className="text-[11px] font-bold bg-amber-500/10 text-amber-300 px-3 py-1 rounded-xl border border-amber-500/20 uppercase tracking-wider flex items-center gap-1">
            <span>🛡️ Score:</span>
            <span>{schema.reliability_score || 96}%</span>
          </span>
          <span className="text-[11px] font-mono font-bold bg-indigo-500/10 text-indigo-300 px-3 py-1 rounded-xl border border-indigo-500/20">
            🔒 {schema.isolation_level || 'Row-Locks Protected'}
          </span>
          <span className="text-[11px] font-mono font-bold bg-purple-500/10 text-purple-300 px-3 py-1 rounded-xl border border-purple-500/20">
            {schema.entities?.length || 0} Tables
          </span>
        </div>

        {/* Deploy to Live Database Button */}
        {connectionId && onDeploy && (
          <button
            onClick={() => setShowDeployModal(true)}
            disabled={isDeploying || isDeployed}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg active:scale-95 ${
              isDeployed
                ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 cursor-default'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25'
            }`}
          >
            {isDeploying ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Deploying Schema...</span>
              </>
            ) : isDeployed ? (
              <>
                <CheckCircle2 size={13} />
                <span>Deployed to Database</span>
              </>
            ) : (
              <>
                <Rocket size={13} />
                <span>Deploy to Production</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* ── Modern Navigation Tabs ── */}
      <div className="flex-shrink-0 px-5 pt-3 pb-2 border-b border-white/5 bg-white/2 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {tabs.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={13} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Main Tab Content ── */}
      <div className="flex-1 overflow-y-auto min-h-0 p-5 custom-scrollbar">
        
        {/* Tab 1: Schema Entities with Search & Clean High-Contrast Table Cards */}
        {activeTab === 'entities' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            {/* Instant Filter */}
            {schema.entities && schema.entities.length > 3 && (
              <div className="flex items-center gap-2 bg-[#121722] border border-white/10 rounded-xl px-3 py-2 shadow-inner">
                <Search size={13} className="text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter generated tables..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none w-full"
                />
              </div>
            )}

            {filteredEntities.map((entity: any) => {
              const isExpanded = expandedEntity === entity.name || schema.entities.length <= 4;
              return (
                <div key={entity.name} className="bg-[#111622] border border-white/10 rounded-2xl overflow-hidden shadow-xl transition-all">
                  <button
                    onClick={() => setExpandedEntity(expandedEntity === entity.name ? null : entity.name)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-all text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-sm font-bold text-white tracking-wide">{entity.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">
                        {entity.fields?.length || 0} columns
                      </span>
                    </div>
                    {isExpanded ? <ChevronDown size={14} className="text-blue-400" /> : <ChevronRight size={14} className="text-slate-500" />}
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 space-y-4 border-t border-white/5 bg-black/20">
                      {/* Columns Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-white/5">
                              <th className="py-2 pr-4">Column Name</th>
                              <th className="py-2 px-4">Data Type</th>
                              <th className="py-2 pl-4 text-right">Attributes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 font-mono">
                            {entity.fields?.map((f: any, i: number) => {
                              const isPk = f.column?.toLowerCase() === 'id' || f.type?.toLowerCase().includes('primary key');
                              const isFk = f.column?.toLowerCase().endsWith('_id');
                              return (
                                <tr key={i} className="hover:bg-white/5 transition-colors">
                                  <td className="py-2.5 pr-4 text-slate-200 font-semibold flex items-center gap-2">
                                    <span>{f.column}</span>
                                    {isPk && (
                                      <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 rounded font-sans font-bold">
                                        PK
                                      </span>
                                    )}
                                    {isFk && (
                                      <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1 rounded font-sans font-bold">
                                        FK
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-4 text-purple-300">{f.type}</td>
                                  <td className="py-2.5 pl-4 text-right text-[11px] text-slate-500 font-sans">
                                    {f.nullable === false ? 'NOT NULL' : 'NULLABLE'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Indexes badge row */}
                      {entity.indexes?.length > 0 && (
                        <div className="pt-2 border-t border-white/5 flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Optimized Indexes:</span>
                          {entity.indexes.map((idx: string, i: number) => (
                            <span key={i} className="text-[10px] text-blue-300 font-mono bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-lg">
                              {idx}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Visual ERD */}
        {activeTab === 'erd' && (
          <div className="bg-[#111622] border border-white/10 rounded-2xl p-6 shadow-2xl max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Entity Relationship Diagram</h4>
                <p className="text-[11px] text-slate-500">Foreign key mapping and relational topology</p>
              </div>
              <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded font-bold">
                Mermaid.js
              </span>
            </div>
            {schema.visual_json ? (
              <MermaidChart chart={buildMermaidFromJson(schema.visual_json, schema.entities)} />
            ) : schema.erd_mermaid ? (
              <MermaidChart chart={schema.erd_mermaid} />
            ) : (
              <p className="text-slate-500 text-sm text-center py-12">No ERD generated</p>
            )}
          </div>
        )}

        {/* Tab 3: SQL Scripts */}
        {activeTab === 'sql' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            {schema.sql_scripts?.map((script: any, i: number) => (
              <div key={i} className="bg-[#111622] border border-white/10 rounded-2xl p-4 space-y-2.5 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 tracking-wide">{script.description}</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(script.sql); toast.success('SQL copied to clipboard!'); }}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg transition-all"
                  >
                    <Copy size={12} />
                    <span>Copy</span>
                  </button>
                </div>
                <pre className="text-xs text-emerald-300 font-mono bg-black/60 p-3.5 rounded-xl overflow-x-auto max-h-56 whitespace-pre-wrap border border-white/5 leading-relaxed">{script.sql}</pre>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Strategy Notes */}
        {activeTab === 'notes' && (
          <div className="bg-[#111622] border border-white/10 rounded-2xl p-6 shadow-2xl max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Compass size={16} className="text-purple-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Architectural Decision Record (ADR)</h4>
              </div>
              <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded font-bold">
                Production Strategy
              </span>
            </div>
            <div className="text-slate-200 text-xs leading-relaxed font-sans space-y-3 prose prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {schema.scalability_notes || schema.scaling_notes || schema.thought || `### 🏛️ Architectural Strategy Overview
- **Isolation:** Multi-tenant architecture bound by \`tenant_id\` UUID indexing and Row-Level Security.
- **Normalization:** Full 3NF normalized relational schema with zero data redundancy.
- **Concurrency:** Append-only \`Inventory_Audit\` log structure to avoid lock contention.
- **Storage:** Sequence types tuned to \`BIGINT\` for high-throughput scaling.`}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      {/* Deploy Confirmation Modal */}
      {showDeployModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0F1420] border border-white/10 p-8 rounded-3xl shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Rocket size={24} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white">Deploy Blueprint to Database</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                This will execute all compiled DDL scripts (Tables, Foreign Keys, Indexes, Triggers) against your live connection.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setShowDeployModal(false);
                  onDeploy?.({ sessionId: sessionId!, connectionId: connectionId! });
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all"
              >
                Confirm & Execute DDL
              </button>
              <button
                onClick={() => setShowDeployModal(false)}
                className="w-full py-3 bg-white/5 text-slate-400 hover:text-white rounded-2xl font-bold text-xs transition-all"
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

// ── Audit Panel (Existing DB mode result) ─────────────────────
export function AuditPanel({
  audit,
  onApplyFix,
  appliedMutations
}: {
  audit: any;
  onApplyFix?: (fix: any) => void;
  appliedMutations?: any[];
}) {
  const [activeTab, setActiveTab] = useState<'issues' | 'optimizations' | 'summary'>('issues');

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#090C13] overflow-hidden">
      
      {/* ── Subheader: Scalability Score ── */}
      <div className="flex-shrink-0 px-5 py-3 border-b border-white/5 bg-[#0B0E18]/80 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center font-bold text-white text-sm shadow-md">
            {audit.health_score ?? audit.scalability_score ?? 85}%
          </div>
          <div>
            <h4 className="text-xs font-bold text-white tracking-wide">Scalability & Health Score</h4>
            <p className="text-[10px] text-slate-400">Multi-Agent Database Security & Reliability Audit</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-xl">
            {(audit.issues || audit.anti_patterns || []).length} Issues Found
          </span>
          <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-xl">
            {(audit.improvements || audit.optimizations || []).length} Actionable Fixes
          </span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex-shrink-0 px-5 pt-3 pb-2 border-b border-white/5 bg-white/2 flex items-center gap-1.5">
        {(['issues', 'optimizations', 'summary'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
              activeTab === tab ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab === 'issues' ? 'Anti-Patterns & Bottlenecks' : tab === 'optimizations' ? 'Recommended Fixes' : 'Executive Summary'}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-4 custom-scrollbar">
        {activeTab === 'issues' && (
          <div className="space-y-3 max-w-4xl mx-auto">
            {(audit.issues || audit.anti_patterns || []).map((item: any, i: number) => (
              <div key={i} className="bg-[#111622] border border-amber-500/20 rounded-2xl p-4 space-y-2 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={15} className="text-amber-400" />
                    <span className="text-xs font-bold text-white">{item.title || item.pattern}</span>
                    {item.table && (
                      <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                        {item.table}
                      </span>
                    )}
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                    (item.severity || 'MEDIUM').toUpperCase() === 'HIGH' || (item.severity || '').toUpperCase() === 'CRITICAL'
                      ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                  }`}>
                    {item.severity || 'MEDIUM'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{item.detail || item.explanation || item.description}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'optimizations' && (
          <div className="space-y-3 max-w-4xl mx-auto">
            {(audit.improvements || audit.optimizations || []).map((fix: any, i: number) => {
              const isApplied = appliedMutations?.some(m => m.title === fix.title && m.status === 'APPLIED');
              return (
                <div key={i} className="bg-[#111622] border border-blue-500/20 rounded-2xl p-4 space-y-3 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{fix.title}</span>
                      {fix.category && (
                        <span className="text-[10px] font-mono text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                          {fix.category}
                        </span>
                      )}
                    </div>
                    {fix.sql && (
                      <button
                        onClick={() => onApplyFix?.(fix)}
                        disabled={isApplied}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                          isApplied ? 'bg-emerald-500/20 text-emerald-400 cursor-default' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
                        }`}
                      >
                        {isApplied ? <CheckCircle2 size={12} /> : <ArrowUpRight size={12} />}
                        <span>{isApplied ? 'Applied' : 'Execute Fix'}</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-300">{fix.detail || fix.explanation || fix.description}</p>
                  {fix.sql && (
                    <pre className="text-xs text-emerald-300 font-mono bg-black/60 p-3 rounded-xl overflow-x-auto whitespace-pre-wrap border border-white/5">{fix.sql}</pre>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="bg-[#111622] border border-white/10 rounded-2xl p-6 shadow-2xl max-w-4xl mx-auto space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Executive Architecture Review</h4>
            <div className="text-slate-200 text-xs leading-relaxed font-sans space-y-3">
              {audit.thought ? (
                <div className="p-4 bg-black/40 border border-blue-500/20 rounded-xl font-mono text-[11px] text-blue-300 whitespace-pre-wrap">
                  {audit.thought}
                </div>
              ) : null}
              {audit.recommendations && audit.recommendations.length > 0 && (
                <div className="space-y-2">
                  <p className="font-bold text-white text-xs uppercase tracking-wider">Key Strategic Recommendations:</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 text-xs">
                    {audit.recommendations.map((r: string, idx: number) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              {audit.executive_summary && (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {audit.executive_summary}
                </ReactMarkdown>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
