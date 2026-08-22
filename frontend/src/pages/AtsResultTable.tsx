import React, { useState, useMemo } from 'react';
import { Search, Filter, SortAsc, SortDesc, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

export interface KeywordAnalysis {
    keyword: string;
    target_frequency: number;
    actual_frequency: number;
    match_percentage: number;
}

interface AtsResultTableProps {
    keywords: KeywordAnalysis[];
}

type SortField = 'keyword' | 'target_frequency' | 'actual_frequency' | 'match_percentage';
type SortOrder = 'asc' | 'desc';

export const AtsResultTable: React.FC<AtsResultTableProps> = ({ keywords }) => {
    const [search, setSearch] = useState('');
    const [sortField, setSortField] = useState<SortField>('target_frequency');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [filterStatus, setFilterStatus] = useState<'all' | 'optimized' | 'needs_work'>('all');
    const [page, setPage] = useState(1);
    const itemsPerPage = 8;

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const processedData = useMemo(() => {
        let data = [...keywords];

        // Search
        if (search.trim()) {
            const s = search.toLowerCase();
            data = data.filter(k => k.keyword.toLowerCase().includes(s));
        }

        // Filter
        if (filterStatus === 'optimized') {
            data = data.filter(k => k.match_percentage >= 100);
        } else if (filterStatus === 'needs_work') {
            data = data.filter(k => k.match_percentage < 100);
        }

        // Sort
        data.sort((a, b) => {
            let aVal = a[sortField];
            let bVal = b[sortField];

            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = (bVal as string).toLowerCase();
            }

            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return data;
    }, [keywords, search, sortField, sortOrder, filterStatus]);

    const totalPages = Math.ceil(processedData.length / itemsPerPage);
    const currentData = processedData.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return null;
        return sortOrder === 'asc' ? <SortAsc size={14} className="ml-1" /> : <SortDesc size={14} className="ml-1" />;
    };

    return (
        <div className="bg-slate-800/80 rounded-2xl p-6 border border-white/5 flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-xl font-bold text-white">Actionable Missing Keywords</h3>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search keyword..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="bg-slate-900 border border-slate-700 text-sm text-slate-200 rounded-lg pl-9 pr-3 py-2 w-48 focus:border-blue-500 focus:outline-none transition-colors"
                        />
                    </div>

                    <div className="flex bg-slate-900 rounded-lg border border-slate-700 p-1">
                        <button
                            onClick={() => { setFilterStatus('all'); setPage(1); }}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filterStatus === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => { setFilterStatus('optimized'); setPage(1); }}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filterStatus === 'optimized' ? 'bg-green-500/20 text-green-400' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Optimized
                        </button>
                        <button
                            onClick={() => { setFilterStatus('needs_work'); setPage(1); }}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filterStatus === 'needs_work' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Needs Work
                        </button>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead className="bg-slate-900/50">
                        <tr className="border-b border-white/10 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                            <th className="py-4 pl-6 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => handleSort('keyword')}>
                                <div className="flex items-center gap-1">Keyword <SortIcon field="keyword" /></div>
                            </th>
                            <th className="py-4 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => handleSort('target_frequency')}>
                                <div className="flex items-center gap-1">Req. Frequency <SortIcon field="target_frequency" /></div>
                            </th>
                            <th className="py-4 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => handleSort('actual_frequency')}>
                                <div className="flex items-center gap-1">Your Frequency <SortIcon field="actual_frequency" /></div>
                            </th>
                            <th className="py-4 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => handleSort('match_percentage')}>
                                <div className="flex items-center gap-1">Match % <SortIcon field="match_percentage" /></div>
                            </th>
                            <th className="py-4 pr-6 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {currentData.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-500">No keywords match your filters.</td>
                            </tr>
                        ) : (
                            currentData.map((kw, idx) => (
                                <tr key={idx} className="hover:bg-white/5 transition-colors group">
                                    <td className="py-4 pl-6 font-mono text-blue-300 font-medium group-hover:text-blue-200">{kw.keyword}</td>
                                    <td className="py-4 text-slate-300 font-medium">{kw.target_frequency}</td>
                                    <td className="py-4 text-slate-300 font-medium">{kw.actual_frequency}</td>
                                    <td className="py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-24 bg-slate-900 rounded-full h-2 overflow-hidden border border-white/5">
                                                <div
                                                    className={`h-full transition-all duration-1000 ${kw.match_percentage >= 100 ? 'bg-green-500' : kw.match_percentage > 0 ? 'bg-blue-500' : 'bg-red-500'}`}
                                                    style={{ width: `${Math.min(100, kw.match_percentage)}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-slate-400 font-mono w-8">{kw.match_percentage}%</span>
                                        </div>
                                    </td>
                                    <td className="py-4 pr-6 flex justify-end">
                                        {kw.match_percentage >= 100 ? (
                                            <div className="text-green-400 bg-green-400/10 border border-green-400/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 w-fit">
                                                <CheckCircle size={14} /> Optimized
                                            </div>
                                        ) : (
                                            <div className="text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 w-fit shadow-md shadow-amber-500/5">
                                                <AlertCircle size={14} /> Add {kw.target_frequency - kw.actual_frequency} more
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-slate-400">
                    <div>Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, processedData.length)} of {processedData.length} entries</div>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                            className="px-3 py-1 rounded-md border border-slate-700 disabled:opacity-50 hover:bg-slate-700 transition-colors"
                        >
                            Prev
                        </button>
                        <span className="px-3 py-1 bg-slate-900 rounded-md border border-slate-600 text-slate-200">
                            {page} / {totalPages}
                        </span>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(page + 1)}
                            className="px-3 py-1 rounded-md border border-slate-700 disabled:opacity-50 hover:bg-slate-700 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
