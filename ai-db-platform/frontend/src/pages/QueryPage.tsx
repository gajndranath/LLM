import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Editor from '@monaco-editor/react';
import { connectionsApi } from '../api/connections.api';
import { queryApi } from '../api/query.api';
import { useSchemaExtract } from '../hooks/useSchemaExtract';
import { useAppContext } from '../context/AppContext';
import {
  Terminal,
  Play,
  Zap,
  Loader2,
  Database,
  CheckCircle2,
  Table as TableIcon,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Layout,
  Layers,
  ChevronRight,
  ChevronDown,
  Info,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import ChartRenderer from '../components/ChartRenderer';
import MermaidChart from '../components/MermaidChart';
import TableDataInspector from '../components/TableDataInspector';

const QueryPage = () => {
  const { selectedConnectionId: selectedConn, setSelectedConnectionId: setSelectedConn } = useAppContext();
  const [naturalQuery, setNaturalQuery] = useState('');
  const [inspectingTable, setInspectingTable] = useState<string | null>(null);
  const [generatedSql, setGeneratedSql] = useState('');
  const [results, setResults] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');
  const [viewMode, setViewMode] = useState<'table' | 'chart' | 'diagrams'>('table');
  const [diagramTab, setDiagramTab] = useState<'erd' | 'dfd' | 'flow'>('erd');
  const [chartRec, setChartRec] = useState<any>(null);
  const [expandedTables, setExpandedTables] = useState<string[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [confirmWriteModal, setConfirmWriteModal] = useState<{ show: boolean; sql: string } | null>(null);

  const queryClient = useQueryClient();

  // Fetch connections for the dropdown
  const { data: connections, isLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => {
      const res = await connectionsApi.getConnections();
      return res.data || [];
    }
  });

  // Fetch schema for the selected connection
  const { data: schema, isLoading: schemaLoading } = useSchemaExtract(selectedConn);

  // Fetch History
  const { data: history } = useQuery({
    queryKey: ['history', selectedConn],
    queryFn: async () => {
      const res = await queryApi.getHistory(selectedConn || undefined);
      return res.data || [];
    }
  });

  // 1. Generate SQL Mutation
  const generateMutation = useMutation({
    mutationFn: (data: any) => queryApi.generateQuery(data),
    onSuccess: (res) => {
      setGeneratedSql(res.data.sql);
      setChartRec(res.data.chart_recommendation);
      toast.success('SQL Generated successfully');
      res.data.warnings?.forEach((w: string) => toast.warning(w));
    },
    onError: (err: any) => toast.error(err.message || 'Failed to generate SQL')
  });

  // 2. Execute SQL Mutation
  const executeMutation = useMutation({
    mutationFn: (data: any) => queryApi.executeQuery(data),
    onSuccess: async (res) => {
      const data = res.data;
      if (data && data.requiresConfirmation) {
        setConfirmWriteModal({ show: true, sql: generatedSql });
        return;
      }
      setResults(data);
      setCurrentPage(1);
      toast.success(`Query executed: ${data.rowCount || 0} rows returned`);
      queryClient.invalidateQueries({ queryKey: ['history'] });

      // Automatically trigger insights if we have data
      if (data.rows && data.rows.length > 0) {
        setIsGeneratingInsights(true);
        try {
          const insRes = await queryApi.getInsights({
            query: naturalQuery,
            results: data.rows.slice(0, 50),
            connectionId: selectedConn!
          });
          setInsights(insRes.data);
          setViewMode('chart');
        } catch (error) {
          console.error("Insights generation failed", error);
        } finally {
          setIsGeneratingInsights(false);
        }
      }
    },
    onError: (err: any) => toast.error(err.message || 'Query failed')
  });

  // 3. Optimize SQL Mutation
  const optimizeMutation = useMutation({
    mutationFn: (data: any) => queryApi.optimizeQuery(data),
    onSuccess: (res) => {
      setGeneratedSql(res.data.optimizedSql);
      toast.success('SQL Optimized by AI');
    },
    onError: (err: any) => toast.error(err.message || 'Optimization failed')
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConn) return toast.error('Select a data source first');
    if (!naturalQuery.trim()) return toast.error('Enter a query description');
    generateMutation.mutate({ naturalQuery, connectionId: selectedConn });
  };

  const handleExecute = () => {
    if (!selectedConn) return toast.error('Select a data source');
    if (!generatedSql.trim()) return toast.error('No SQL to execute');
    executeMutation.mutate({ sql: generatedSql, connectionId: selectedConn });
  };

  const handleOptimize = () => {
    if (!selectedConn) return toast.error('Select a data source');
    if (!generatedSql.trim()) return toast.error('No SQL to optimize');
    optimizeMutation.mutate({ sql: generatedSql, connectionId: selectedConn });
  };

  const totalRows = results?.rows?.length || 0;
  const totalPages = Math.ceil(totalRows / pageSize);
  const paginatedRows = results?.rows ? results.rows.slice((currentPage - 1) * pageSize, currentPage * pageSize) : [];

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI SQL Copilot</h2>
          <p className="text-slate-400 mt-2 font-medium">Conversational interface for complex database operations</p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="glass px-6 py-3 rounded-2xl flex items-center space-x-3 min-w-[240px]">
            <Database size={18} className="text-blue-400" />
            <select
              className="bg-transparent border-none focus:ring-0 text-sm font-bold w-full text-white cursor-pointer"
              value={selectedConn}
              onChange={(e) => setSelectedConn(e.target.value)}
            >
              <option value="" className="bg-slate-900">
                {isLoading ? 'Loading sources...' : 'Select Data Source'}
              </option>
              {Array.isArray(connections) && connections.map((conn: any) => (
                <option key={conn.id} value={conn.id} className="bg-slate-900">
                  {conn.name} ({conn.database_name})
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
        {/* Left: Schema Explorer (3 cols) */}
        <aside className="lg:col-span-3 glass rounded-[2.5rem] overflow-hidden flex flex-col border border-white/5">
          <div className="px-6 py-5 border-b border-white/5 flex items-center space-x-3 bg-white/2">
            <Layers className="text-blue-400" size={18} />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Schema Explorer</span>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-4 custom-scrollbar">
            {!selectedConn ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40 p-6">
                <Info size={24} className="mb-3" />
                <p className="text-xs font-medium">Select a connection to explore schema</p>
              </div>
            ) : schemaLoading ? (
              <div className="flex items-center justify-center p-10">
                <Loader2 size={24} className="animate-spin text-blue-500" />
              </div>
            ) : (
              schema?.tables.map((table: any, idx: number) => {
                const isExpanded = expandedTables.includes(table.table_name);
                return (
                  <div key={`${table.table_name}-${idx}`} className="space-y-1">
                    <div className="flex items-center justify-between w-full group/table">
                      <button
                        onClick={() => setExpandedTables(prev =>
                          isExpanded ? prev.filter(t => t !== table.table_name) : [...prev, table.table_name]
                        )}
                        className="flex items-center space-x-2 text-slate-300 hover:text-white text-left transition-all truncate flex-1"
                      >
                        {isExpanded ? <ChevronDown size={14} className="text-blue-400" /> : <ChevronRight size={14} className="text-slate-600" />}
                        <TableIcon size={14} className="text-blue-400/60" />
                        <span className="text-sm font-bold truncate">{table.table_name}</span>
                      </button>
                      <button
                        onClick={() => setInspectingTable(table.table_name)}
                        className="opacity-0 group-hover/table:opacity-100 transition-all p-1 hover:bg-white/10 text-slate-400 hover:text-blue-400 rounded-lg flex items-center justify-center"
                        title="Browse Table Records"
                      >
                        <Eye size={12} />
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="ml-6 space-y-3 border-l border-white/5 pl-3 animate-in slide-in-from-top-2 duration-200">
                        {/* Columns */}
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest block mb-1">Columns</span>
                          {table.columns.map((col: any, cIdx: number) => (
                            <div key={`${table.table_name}-${col.column_name}-${cIdx}`} className="flex items-center justify-between text-[11px] text-slate-500 py-0.5 group/col">
                              <span className="truncate group-hover/col:text-slate-300 transition-colors">{col.column_name}</span>
                              <span className="text-[9px] uppercase opacity-50 bg-white/5 px-1 rounded">{col.data_type}</span>
                            </div>
                          ))}
                        </div>

                        {/* Indexes */}
                        {table.indexes && table.indexes.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-blue-500/50 uppercase tracking-widest block mb-1">Indexes</span>
                            {table.indexes.map((idx: any, iIdx: number) => (
                              <div key={`${table.table_name}-${idx.index_name}-${iIdx}`} className="flex items-center justify-between text-[10px] text-slate-500 py-0.5 group/idx">
                                <div className="flex items-center space-x-2 truncate">
                                  <div className="w-1 h-1 rounded-full bg-blue-500/50" />
                                  <span className="truncate group-hover/idx:text-blue-300 transition-colors">{idx.index_name}</span>
                                </div>
                                {idx.is_unique && <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-1 rounded border border-emerald-500/20">UNIQUE</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Middle: AI Input & Editor (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-6 min-h-0">
          <div className="glass p-6 rounded-[2rem] flex flex-col shadow-xl border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Zap className="text-emerald-400" size={18} />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Query Intent</span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('editor')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'editor' ? 'bg-blue-500 text-white' : 'text-slate-500 hover:bg-white/5'}`}
                >
                  EDITOR
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'history' ? 'bg-blue-500 text-white' : 'text-slate-500 hover:bg-white/5'}`}
                >
                  HISTORY
                </button>
              </div>
            </div>

            {activeTab === 'editor' ? (
              <form onSubmit={handleGenerate} className="relative">
                <textarea
                  className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-h-[100px] resize-none text-sm font-medium"
                  placeholder="Ask me anything about your data..."
                  value={naturalQuery}
                  onChange={(e) => setNaturalQuery(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={generateMutation.isPending}
                  className="absolute bottom-3 right-3 bg-blue-600 hover:bg-blue-500 p-3 rounded-xl text-white transition-all shadow-lg shadow-blue-600/20 active:scale-90"
                >
                  {generateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                </button>
              </form>
            ) : (
              <div className="space-y-2 max-h-[100px] overflow-auto pr-2">
                {history?.length === 0 ? (
                  <p className="text-xs text-slate-600 text-center py-4 italic">No history yet</p>
                ) : (
                  history?.slice(0, 5).map((h: any) => (
                    <div
                      key={h.id}
                      onClick={() => { setGeneratedSql(h.generated_sql); setActiveTab('editor'); }}
                      className="p-2 rounded-lg bg-white/5 border border-white/5 hover:border-blue-500/50 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <span className="text-[11px] text-slate-400 truncate max-w-[80%] italic">"{h.natural_query || h.generated_sql.substring(0, 30)}..."</span>
                      <ChevronRight size={12} className="text-slate-600 group-hover:text-blue-400" />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex-1 glass rounded-[2.5rem] overflow-hidden flex flex-col relative border border-white/5">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div className="flex items-center space-x-3">
                <Terminal className="text-blue-400" size={18} />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">SQL Lab</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleOptimize}
                  disabled={optimizeMutation.isPending || !generatedSql}
                  className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all border border-blue-500/20 active:scale-95"
                >
                  {optimizeMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>Optimize</span>
                </button>
                <button
                  onClick={handleExecute}
                  disabled={executeMutation.isPending || !generatedSql}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                >
                  {executeMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
                  <span>Run</span>
                </button>
              </div>
            </div>
            <div className="flex-1">
              <Editor
                height="100%"
                defaultLanguage="sql"
                theme="vs-dark"
                value={generatedSql}
                onChange={(val) => setGeneratedSql(val || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  padding: { top: 15 },
                  automaticLayout: true
                }}
              />
            </div>
          </div>
        </div>

        {/* Right: Results (4 cols) */}
        <div className="lg:col-span-4 glass rounded-[2.5rem] overflow-hidden flex flex-col border border-white/5">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/2">
            <div className="flex items-center space-x-3">
              <TableIcon className="text-purple-400" size={18} />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Insights</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${viewMode === 'table' ? 'bg-purple-500 text-white' : 'text-slate-500 hover:bg-white/5'}`}
              >
                TABLE
              </button>
              <button
                onClick={() => setViewMode('chart')}
                disabled={(!chartRec || chartRec.type === 'none') && !insights}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${viewMode === 'chart' ? 'bg-purple-500 text-white' : 'text-slate-500 hover:bg-white/5 disabled:opacity-20'}`}
              >
                VISUALIZE
              </button>
              <button
                onClick={() => setViewMode('diagrams')}
                disabled={!insights?.erd_mermaid && !insights?.dfd_mermaid && !insights?.flow_mermaid && !schema?.erd_mermaid}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${viewMode === 'diagrams' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-slate-500 hover:bg-white/5 disabled:opacity-20'}`}
              >
                DIAGRAMS
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {viewMode === 'diagrams' ? (
              <div className="h-full flex flex-col min-h-0 overflow-hidden">
                <div className="flex items-center space-x-6 px-6 py-4 border-b border-white/5 bg-white/2">
                  {(['erd', 'dfd', 'flow'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setDiagramTab(t)}
                      className={`text-[10px] font-bold uppercase tracking-widest transition-all pb-1 border-b-2 ${diagramTab === t ? 'text-blue-400 border-blue-400' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                    >
                      {t === 'erd' ? 'Schema ERD' : t === 'dfd' ? 'Logic Flow (DFD)' : 'Operational Flow'}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-auto p-8 custom-scrollbar bg-slate-950/20">
                  {diagramTab === 'erd' && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-white uppercase tracking-wider">Entity Relationship Diagram</h4>
                          <p className="text-[10px] text-slate-500 uppercase font-medium">Complete schema architecture and table relations</p>
                        </div>
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 font-bold">MERMAID ERD</span>
                      </div>
                      <div className="bg-slate-900/40 rounded-3xl p-8 border border-white/5 shadow-2xl">
                        <MermaidChart chart={insights?.erd_mermaid || schema?.erd_mermaid || ''} />
                      </div>
                    </div>
                  )}

                  {diagramTab === 'dfd' && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-white uppercase tracking-wider">Data Flow Diagram</h4>
                          <p className="text-[10px] text-slate-500 uppercase font-medium">Logical movement of data and transformation steps</p>
                        </div>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">MERMAID DFD</span>
                      </div>
                      <div className="bg-slate-900/40 rounded-3xl p-8 border border-white/5 shadow-2xl">
                        <MermaidChart chart={insights?.dfd_mermaid || schema?.dfd_mermaid || ''} />
                      </div>
                    </div>
                  )}

                  {diagramTab === 'flow' && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-white uppercase tracking-wider">Operational Business Flow</h4>
                          <p className="text-[10px] text-slate-500 uppercase font-medium">Real-world sequence and interaction story</p>
                        </div>
                        <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20 font-bold">MERMAID SEQUENCE</span>
                      </div>
                      <div className="bg-slate-900/40 rounded-3xl p-8 border border-white/5 shadow-2xl">
                        <MermaidChart chart={insights?.flow_mermaid || ''} />
                      </div>
                    </div>
                  )}

                  {((diagramTab === 'erd' && !insights?.erd_mermaid && !schema?.erd_mermaid) ||
                    (diagramTab === 'dfd' && !insights?.dfd_mermaid && !schema?.dfd_mermaid) ||
                    (diagramTab === 'flow' && !insights?.flow_mermaid)) && (
                      <div className="h-full flex flex-col items-center justify-center opacity-30 text-center py-20">
                        <Info size={40} className="mb-4" />
                        <p className="text-xs font-bold uppercase tracking-[0.2em]">Visualizing System... Please wait</p>
                      </div>
                    )}
                </div>
              </div>
            ) : !results ? (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center opacity-30">
                <Layout size={32} className="mb-4" />
                <p className="text-xs font-bold">No Data Loaded</p>
              </div>
            ) : viewMode === 'table' ? (
              <div className="flex flex-col h-full justify-between">
                <div className="flex-1 overflow-auto">
                  {results && results.fields && results.fields.length > 0 ? (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white/5 sticky top-0 z-10">
                        <tr>
                          {results.fields.map((f: any) => (
                            <th key={f.name} className="px-4 py-3 border-b border-white/5 font-bold text-slate-400 uppercase tracking-wider">{f.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {paginatedRows.map((row: any, i: number) => (
                          <tr key={i} className="hover:bg-white/2 transition-colors">
                            {results.fields.map((f: any) => (
                              <td key={f.name} className="px-4 py-3 text-slate-300 truncate max-w-[150px]">{row[f.name]?.toString() || 'null'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-35 text-center py-20 px-6 space-y-3">
                      <CheckCircle2 size={32} className="text-emerald-500" />
                      <p className="text-xs font-bold uppercase tracking-wider">{results?.message || 'Query executed successfully with no records returned'}</p>
                    </div>
                  )}
                </div>

                {totalRows > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 bg-slate-900/60 backdrop-blur-md text-[11px] select-none">
                    <div className="flex items-center space-x-2 text-slate-400">
                      <span>Show</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white font-bold cursor-pointer focus:outline-none"
                      >
                        {[5, 10, 20, 50, 100].map(sz => (
                          <option key={sz} value={sz} className="bg-slate-900">{sz}</option>
                        ))}
                      </select>
                      <span>rows of {totalRows}</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all font-bold"
                      >
                        First
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all font-bold"
                      >
                        Prev
                      </button>
                      <span className="px-3 py-1.5 text-slate-400 font-medium">
                        Page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages || 1}</strong>
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all font-bold"
                      >
                        Next
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all font-bold"
                      >
                        Last
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : viewMode === 'chart' ? (
              <div className="h-full p-6 space-y-6">
                {chartRec && chartRec.type !== 'none' && results?.rows && (
                  <>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{chartRec?.label || 'AI Recommended Chart'}</h4>
                      <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 uppercase font-bold">{chartRec?.type}</span>
                    </div>

                    <div className="h-[200px]">
                      <ChartRenderer
                        type={chartRec.type}
                        data={results?.rows || []}
                        xAxis={chartRec.x_axis}
                        yAxis={chartRec.y_axis}
                        label={chartRec.label}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-4 mt-8">
                  <div className="flex items-center space-x-2">
                    <Sparkles size={16} className="text-purple-400" />
                    <h5 className="text-xs font-bold uppercase tracking-widest text-slate-400">AI Data Story</h5>
                  </div>

                  {isGeneratingInsights ? (
                    <div className="flex items-center space-x-3 text-slate-500 py-4 italic animate-pulse">
                      <Loader2 size={14} className="animate-spin" />
                      <span className="text-xs">AI is analyzing results...</span>
                    </div>
                  ) : insights ? (
                    <div className="space-y-4">
                      <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                        <p className="text-sm text-slate-300 leading-relaxed font-medium">
                          {insights.summary}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">Key Findings</span>
                          <ul className="space-y-1">
                            {insights.key_findings.map((f: string, i: number) => (
                              <li key={i} className="flex items-start space-x-2 text-[11px] text-slate-400">
                                <CheckCircle2 size={12} className="mt-0.5 text-emerald-500/50 flex-shrink-0" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {insights.anomalies.length > 0 && insights.anomalies[0] !== 'None detected' && (
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-tighter">Anomalies</span>
                            <ul className="space-y-1">
                              {insights.anomalies.map((f: string, i: number) => (
                                <li key={i} className="flex items-start space-x-2 text-[11px] text-slate-400">
                                  <ShieldAlert size={12} className="mt-0.5 text-amber-500/50 flex-shrink-0" />
                                  <span>{f}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 italic">No insights generated for this query.</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600 italic text-center py-20">No visualization available for these results.</p>
            )}
          </div>
        </div>
      </div>

      {inspectingTable && selectedConn && (
        <TableDataInspector
          connectionId={selectedConn}
          tableName={inspectingTable}
          onClose={() => setInspectingTable(null)}
        />
      )}

      {confirmWriteModal?.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass w-full max-w-md p-10 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center animate-pulse">
              <ShieldAlert size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white uppercase tracking-wider">Confirm Write Query</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                This query contains database write or mutation statements (INSERT, UPDATE, DELETE, CREATE, ALTER, etc.). Are you sure you want to execute it?
              </p>
            </div>
            <div className="flex flex-col space-y-3 pt-4">
              <button
                onClick={() => {
                  const sql = confirmWriteModal.sql;
                  setConfirmWriteModal(null);
                  executeMutation.mutate({ sql, connectionId: selectedConn, confirmWrite: true });
                }}
                className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-amber-600/20 transition-all uppercase tracking-wider"
              >
                Confirm and Execute
              </button>
              <button
                onClick={() => setConfirmWriteModal(null)}
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
};

export default QueryPage;
