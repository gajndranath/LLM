import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryApi } from '../api/query.api';
import { Loader2, X, RefreshCw, ChevronLeft, ChevronRight, Search, Table, Info } from 'lucide-react';

interface TableDataInspectorProps {
  connectionId: string;
  tableName: string;
  onClose: () => void;
}

export default function TableDataInspector({ connectionId, tableName, onClose }: TableDataInspectorProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input to prevent query overload
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset page on new search
    }, 400);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  const offset = (currentPage - 1) * pageSize;

  const { data: tablePayload, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['table-data', connectionId, tableName, pageSize, offset, debouncedSearch],
    queryFn: async () => {
      const res = await queryApi.getTableData(connectionId, tableName, {
        limit: pageSize,
        offset,
        search: debouncedSearch || undefined,
      });
      return res.data;
    },
    enabled: !!connectionId && !!tableName,
  });

  const rows = tablePayload?.rows || [];
  const fields = tablePayload?.fields || [];
  const total = tablePayload?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const filteredRows = rows; // Already filtered by server

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl h-full glass border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <header className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/2">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Table size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>Inspect Table:</span>
                <span className="text-blue-400 font-mono text-sm">{tableName}</span>
              </h3>
              <p className="text-xs text-slate-400">Live records from connected database source</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => refetch()}
              disabled={isLoading || isFetching}
              className="p-2 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white/5 text-slate-400 hover:text-white hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-all"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* Search Bar */}
        <div className="px-6 py-3.5 border-b border-white/5 bg-slate-950/20 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
            <input
              type="text"
              placeholder="Search current page rows..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-xs text-white placeholder-slate-500"
            />
          </div>
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            Total Database Records: <span className="text-white">{total}</span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 relative">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3">
              <Loader2 size={36} className="text-blue-500 animate-spin" />
              <p className="text-xs text-slate-500">Querying database catalog...</p>
            </div>
          ) : isError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="p-4 bg-red-500/10 text-red-500 rounded-full border border-red-500/20">
                <Info size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Database Error</h4>
                <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                  {error instanceof Error ? error.message : 'Unable to retrieve rows from this table.'}
                </p>
              </div>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/5"
              >
                Retry Request
              </button>
            </div>
          ) : rows.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center opacity-40 space-y-2">
              <Table size={36} />
              <h4 className="text-sm font-bold">Table is Empty</h4>
              <p className="text-xs max-w-xs">No records were returned for this query selection.</p>
            </div>
          ) : (
            <div className="border border-white/5 rounded-2xl overflow-hidden bg-slate-900/10">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-white/5">
                    {fields.map((f: any) => (
                      <th
                        key={f.name}
                        className="px-4 py-3.5 border-b border-white/5 text-[10px] font-black uppercase tracking-wider text-slate-400"
                      >
                        {f.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRows.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-white/2 transition-colors">
                      {fields.map((f: any) => (
                        <td key={f.name} className="px-4 py-3 text-slate-300 font-medium font-mono text-[11px] truncate max-w-[200px]">
                          {row[f.name] === null || row[f.name] === undefined ? (
                            <span className="text-slate-600 italic font-sans text-xs">null</span>
                          ) : typeof row[f.name] === 'object' ? (
                            JSON.stringify(row[f.name])
                          ) : (
                            String(row[f.name])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer / Pagination */}
        {!isLoading && !isError && total > 0 && (
          <footer className="px-6 py-4 border-t border-white/5 bg-slate-950/40 flex items-center justify-between text-xs select-none">
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
                {[10, 15, 30, 50, 100].map(sz => (
                  <option key={sz} value={sz} className="bg-slate-900">{sz}</option>
                ))}
              </select>
              <span>rows per page</span>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-3 py-1.5 text-slate-400">
                Page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages || 1}</strong>
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center"
              >
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                Last
              </button>
            </div>
          </footer>
        )}

      </div>
    </div>
  );
}
