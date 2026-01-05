import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell, Legend } from 'recharts';
import { LedgerType, Transaction } from '../types';
import { TrendingUp, TrendingDown, DollarSign, Calendar, FileText, Download, PieChart as PieIcon, BarChart3, History, ArrowRight } from 'lucide-react';
import { MONTH_NAMES } from '../constants';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 p-3 rounded-lg shadow-xl">
        <p className="text-zinc-500 dark:text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
        {payload.map((p: any, index: number) => (
          <p key={index} className="text-sm font-black" style={{ color: p?.color || p?.fill }}>
            {p?.name}: ${(p?.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface AnalyticsViewProps {
  mode: LedgerType;
  transactions: Transaction[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ mode, transactions }) => {
  const [viewMode, setViewMode] = useState<'chart' | 'composition' | 'history' | 'pnl'>('chart');
  
  const isAgent = mode === 'active';
  const isPassive = mode === 'passive';
  const primaryColor = isAgent ? '#f43f5e' : isPassive ? '#06b6d4' : '#8b5cf6';
  
  const palette = isAgent 
    ? ['#f43f5e', '#fb7185', '#fda4af', '#fecdd3', '#e11d48', '#9f1239'] 
    : isPassive 
    ? ['#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc', '#0891b2', '#155e75']
    : ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#7c3aed', '#5b21b6'];

  const modeTransactions = useMemo(() => 
    (transactions || []).filter(t => t.type === mode), 
  [transactions, mode]);

  const compositionData = useMemo(() => {
    const expenses = modeTransactions.filter(t => (t.amount || 0) < 0);
    const categoryTotals: Record<string, number> = {};
    
    expenses.forEach(t => {
      const cat = t.category || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(t.amount || 0);
    });

    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value: value || 0 }))
      .sort((a, b) => b.value - a.value);
  }, [modeTransactions]);

  const historicalCategoricalData = useMemo(() => {
    const today = new Date();
    const history: any[] = [];
    const categories = Array.from(new Set<string>(modeTransactions.map(t => t.category || 'Uncategorized')));

    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthLabel = MONTH_NAMES[d.getMonth()];
        const monthTx = modeTransactions.filter(t => {
            const parts = t.date?.split('-').map(Number) || [];
            return (parts[1] - 1) === d.getMonth() && parts[0] === d.getFullYear();
        });

        const entry: any = { month: monthLabel };
        categories.forEach(cat => {
            entry[cat] = monthTx
                .filter(t => (t.category || 'Uncategorized') === cat && (t.amount || 0) < 0)
                .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
        });
        history.push(entry);
    }
    return { history, categories };
  }, [modeTransactions]);

  const chartData = useMemo(() => {
    const today = new Date();
    const data = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthLabel = MONTH_NAMES[d.getMonth()];
        const monthTx = modeTransactions.filter(t => {
            const parts = t.date?.split('-').map(Number) || [];
            return (parts[1] - 1) === d.getMonth() && parts[0] === d.getFullYear();
        });

        const revenue = monthTx.reduce((acc, t) => (t.amount || 0) > 0 ? acc + (t.amount || 0) : acc, 0);
        const expense = monthTx.reduce((acc, t) => (t.amount || 0) < 0 ? acc + Math.abs(t.amount || 0) : acc, 0);
        data.push({ month: monthLabel, value: revenue || 0, expense: expense || 0 });
    }
    return data;
  }, [modeTransactions]);

  const topCategory = compositionData[0];
  const totalExpenses = compositionData.reduce((sum, item) => sum + (item.value || 0), 0);

  return (
    <div className="space-y-6 animate-slide-up pb-24">
      <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-2xl border border-zinc-200 dark:border-white/5">
          <button onClick={() => setViewMode('chart')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${viewMode === 'chart' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
            <BarChart3 size={14} /> Trends
          </button>
          <button onClick={() => setViewMode('composition')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${viewMode === 'composition' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
            <PieIcon size={14} /> Composition
          </button>
          <button onClick={() => setViewMode('history')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${viewMode === 'history' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
            <History size={14} /> Category History
          </button>
          <button onClick={() => setViewMode('pnl')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${viewMode === 'pnl' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
            <FileText size={14} /> P&L
          </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-3xl p-6 shadow-sm min-h-[400px] flex flex-col">
        {viewMode === 'chart' && (
            <div className="flex-1 flex flex-col animate-slide-up">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="font-black text-zinc-900 dark:text-white text-lg uppercase tracking-tighter">Performance Explorer</h3>
                        <p className="text-xs text-zinc-500">6-Month Cash Flow Analysis</p>
                    </div>
                </div>
                <div className="flex-1 min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} opacity={0.1} />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 10, fontWeight: 'bold'}} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(120,120,120,0.05)'}} />
                            <Bar dataKey="value" name="Revenue" fill={primaryColor} radius={[4, 4, 0, 0]} barSize={24} />
                            <Bar dataKey="expense" name="Expense" fill="#71717a" fillOpacity={0.3} radius={[4, 4, 0, 0]} barSize={24} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        )}

        {viewMode === 'composition' && (
            <div className="flex-1 flex flex-col animate-slide-up">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="font-black text-zinc-900 dark:text-white text-lg uppercase tracking-tighter">Allocation Composition</h3>
                        <p className="text-xs text-zinc-500">Where your capital is deployed</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center flex-1">
                    <div className="h-[250px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={compositionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {compositionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={palette[index % palette.length]} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total</span>
                            <span className="text-xl font-black text-zinc-900 dark:text-white">${((totalExpenses || 0)/1000).toFixed(1)}k</span>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        {compositionData.slice(0, 5).map((item, index) => (
                            <div key={item.name} className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: palette[index % palette.length] }} />
                                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{item.name}</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-zinc-900 dark:text-white">${(item.value || 0).toLocaleString()}</p>
                                    <p className="text-[10px] text-zinc-500 font-bold">{totalExpenses > 0 ? ((item.value / totalExpenses) * 100).toFixed(0) : 0}%</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {viewMode === 'history' && (
            <div className="flex-1 flex flex-col animate-slide-up">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="font-black text-zinc-900 dark:text-white text-lg uppercase tracking-tighter">Category Trajectory</h3>
                        <p className="text-xs text-zinc-500">How specific costs fluctuate over time</p>
                    </div>
                </div>

                <div className="flex-1 min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={historicalCategoricalData.history}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} opacity={0.1} />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 10, fontWeight: 'bold'}} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase'}} />
                            {historicalCategoricalData.categories.map((cat, index) => (
                                <Line 
                                    key={cat} 
                                    type="monotone" 
                                    dataKey={cat} 
                                    stroke={palette[index % palette.length]} 
                                    strokeWidth={3} 
                                    dot={{r: 4, fill: palette[index % palette.length], strokeWidth: 0}} 
                                    activeDot={{r: 6, strokeWidth: 0}}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        )}

        {viewMode === 'pnl' && (
            <div className="flex-1 flex flex-col animate-slide-up">
                <div className="flex justify-between items-center mb-6">
                     <h3 className="font-black text-zinc-900 dark:text-white text-lg uppercase tracking-tighter">Profit & Loss Statement</h3>
                     <button className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-zinc-500 hover:text-rose-500 transition-colors bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/5">
                        <Download size={12} /> Export CSV
                     </button>
                </div>
                <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900/50">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400">
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest">Account / Category</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Net Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-white/5">
                            <tr className="group">
                                <td className="p-4 font-bold text-emerald-600 dark:text-emerald-500 flex items-center gap-2">
                                    <DollarSign size={14} /> Gross Revenue
                                </td>
                                <td className="p-4 font-black text-right text-emerald-600 dark:text-emerald-500">
                                    ${chartData.reduce((s, d) => s + (d.value || 0), 0).toLocaleString()}
                                </td>
                            </tr>
                            {compositionData.map((item) => (
                                <tr key={item.name} className="hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors">
                                    <td className="p-4 pl-8 text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                                        <ArrowRight size={10} className="text-zinc-400" /> {item.name}
                                    </td>
                                    <td className="p-4 text-right font-bold text-zinc-900 dark:text-white">
                                        (${(item.value || 0).toLocaleString()})
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-zinc-200/50 dark:bg-white/5 font-black">
                                <td className="p-4 text-zinc-900 dark:text-white">Operating Income (NOI)</td>
                                <td className="p-4 text-right border-t-2 border-zinc-300 dark:border-white/20 text-zinc-900 dark:text-white">
                                    ${(chartData.reduce((s, d) => s + (d.value || 0), 0) - totalExpenses).toLocaleString()}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};