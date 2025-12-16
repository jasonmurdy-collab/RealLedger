import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, AreaChart, Area } from 'recharts';
import { LedgerType, Transaction } from '../types';
import { TrendingUp, TrendingDown, DollarSign, Calendar, FileText, Download } from 'lucide-react';
import { MONTH_NAMES } from '../constants';

interface AnalyticsViewProps {
  mode: LedgerType;
  transactions: Transaction[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 p-3 rounded-lg shadow-xl">
        <p className="text-zinc-500 dark:text-zinc-400 text-xs mb-1">{label}</p>
        {payload.map((p: any, index: number) => (
          <p key={index} className="text-sm font-bold" style={{ color: p.color }}>
            {p.name}: ${p.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ mode, transactions }) => {
  const [viewMode, setViewMode] = useState<'chart' | 'pnl' | 'forecast'>('chart');
  const [timeFrame, setTimeFrame] = useState<'6m' | 'ytd'>('6m');
  
  const isAgent = mode === 'active';
  const isPassive = mode === 'passive';
  const primaryColor = isAgent ? '#f43f5e' : isPassive ? '#06b6d4' : '#8b5cf6';

  // Filter transactions for mode
  const modeTransactions = useMemo(() => 
    transactions.filter(t => t.type === mode), 
  [transactions, mode]);

  // --- Chart Data Logic ---
  const chartData = useMemo(() => {
    const today = new Date();
    const data = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthLabel = MONTH_NAMES[d.getMonth()];
        
        const monthTx = modeTransactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate.getMonth() === d.getMonth() && tDate.getFullYear() === d.getFullYear();
        });

        if (isAgent || isPassive) {
            const revenue = monthTx.reduce((acc, t) => t.amount > 0 ? acc + t.amount : acc, 0);
            const expense = monthTx.reduce((acc, t) => t.amount < 0 ? acc + Math.abs(t.amount) : acc, 0);
            data.push({ month: monthLabel, value: revenue, expense });
        } else {
            const spend = monthTx.reduce((acc, t) => t.amount < 0 ? acc + Math.abs(t.amount) : acc, 0);
            data.push({ month: monthLabel, value: spend });
        }
    }
    return data;
  }, [modeTransactions, isAgent, isPassive]);

  // --- Forecasting Logic (Phase 2) ---
  const forecastData = useMemo(() => {
      // Calculate averages from history
      const avgIncome = chartData.reduce((acc, d) => acc + d.value, 0) / 6;
      const avgExpense = chartData.reduce((acc, d) => acc + (d.expense || 0), 0) / 6;
      
      const forecast = [];
      const today = new Date();
      // Add current month as start
      forecast.push({...chartData[chartData.length-1], type: 'Actual'});
      
      // Project next 5 months
      for (let i = 1; i <= 5; i++) {
          const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
          forecast.push({
              month: MONTH_NAMES[d.getMonth()],
              value: avgIncome, 
              expense: avgExpense,
              type: 'Forecast'
          });
      }
      return forecast;
  }, [chartData]);
  
  // --- P&L Logic (Phase 1) ---
  const pnlCategories = useMemo(() => {
      const categories: {[key: string]: number} = {};
      let totalRev = 0;
      modeTransactions.forEach(t => {
          if (t.amount > 0) totalRev += t.amount;
          else {
              const cat = t.category || 'Uncategorized';
              categories[cat] = (categories[cat] || 0) + Math.abs(t.amount);
          }
      });
      return { revenue: totalRev, expenses: categories };
  }, [modeTransactions]);

  const pnlExpensesTotal = useMemo(() => {
    return (Object.values(pnlCategories.expenses) as number[]).reduce((a, b) => a + b, 0);
  }, [pnlCategories.expenses]);

  // --- HST Logic (Phase 2) ---
  const hstData = useMemo(() => {
      const collected = modeTransactions.filter(t => t.amount > 0).reduce((acc, t) => acc + (t.amount * 0.13), 0); // Est collected
      const itcs = modeTransactions.filter(t => t.amount < 0 && t.hstIncluded).reduce((acc, t) => acc + (t.hstAmount || 0), 0);
      return { collected, itcs, net: collected - itcs };
  }, [modeTransactions]);

  const totalRevenue = chartData.reduce((acc, curr) => acc + (isAgent || isPassive ? curr.value : 0), 0);
  const totalExpenses = chartData.reduce((acc, curr) => acc + (isAgent || isPassive ? (curr.expense || 0) : curr.value), 0);
  const netIncome = isAgent || isPassive ? totalRevenue - totalExpenses : 0;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-2xl p-4 shadow-sm">
           <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${isAgent ? 'bg-rose-500/10 text-rose-500' : 'bg-cyan-500/10 text-cyan-500'}`}>
                <TrendingUp size={16} />
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{isAgent || isPassive ? 'Net Profit' : 'Total Spent'}</span>
           </div>
           <p className="text-2xl font-bold text-zinc-900 dark:text-white">${(isAgent || isPassive ? netIncome : totalExpenses).toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-2xl p-4 shadow-sm">
           <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                <TrendingDown size={16} />
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Expenses</span>
           </div>
           <p className="text-2xl font-bold text-zinc-900 dark:text-white">${totalExpenses.toLocaleString()}</p>
        </div>
      </div>

      {/* View Selector */}
      <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
          <button onClick={() => setViewMode('chart')} className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${viewMode === 'chart' ? 'bg-white dark:bg-zinc-700 shadow text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>Charts</button>
          <button onClick={() => setViewMode('forecast')} className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${viewMode === 'forecast' ? 'bg-white dark:bg-zinc-700 shadow text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>Forecast</button>
          <button onClick={() => setViewMode('pnl')} className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${viewMode === 'pnl' ? 'bg-white dark:bg-zinc-700 shadow text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>P&L Table</button>
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-3xl p-6 shadow-sm">
        
        {/* CHART VIEW */}
        {viewMode === 'chart' && (
            <>
                <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-zinc-900 dark:text-white text-lg">
                    {isAgent ? 'Cash Flow' : isPassive ? 'NOI Trend' : 'Spending'}
                </h3>
                </div>
                <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    {isAgent || isPassive ? (
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} opacity={0.2} />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
                        <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(120,120,120,0.1)'}} />
                        <Bar dataKey="value" name="Revenue" fill={primaryColor} radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="expense" name="Expense" fill="#71717a" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                    ) : (
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} opacity={0.2} />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="value" name="Spent" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, fill: '#8b5cf6', strokeWidth: 0}} />
                    </LineChart>
                    )}
                </ResponsiveContainer>
                </div>
            </>
        )}

        {/* FORECAST VIEW (Phase 2) */}
        {viewMode === 'forecast' && (
            <>
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-zinc-900 dark:text-white text-lg flex items-center gap-2">
                    <TrendingUp size={18} className="text-emerald-500" /> 6-Month Projection
                </h3>
             </div>
             <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={forecastData}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={primaryColor} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} opacity={0.2} />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="value" stroke={primaryColor} fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} name="Est. Income" />
                        <Area type="monotone" dataKey="expense" stroke="#71717a" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" name="Est. Expense" />
                    </AreaChart>
                </ResponsiveContainer>
             </div>
             <p className="text-xs text-zinc-500 mt-4 text-center">Projection based on 6-month historical average.</p>
            </>
        )}

        {/* P&L TABLE VIEW (Phase 1) */}
        {viewMode === 'pnl' && (
            <div className="animate-slide-up">
                <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-zinc-900 dark:text-white text-lg">Profit & Loss</h3>
                     <button className="text-xs flex items-center gap-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
                        <Download size={12} /> Export PDF
                     </button>
                </div>
                <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-white/10">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                            <tr>
                                <th className="p-3 font-medium">Category</th>
                                <th className="p-3 font-medium text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-white/5 text-zinc-700 dark:text-zinc-300">
                            <tr>
                                <td className="p-3 font-bold text-emerald-600 dark:text-emerald-500">Total Revenue</td>
                                <td className="p-3 font-bold text-right text-emerald-600 dark:text-emerald-500">${pnlCategories.revenue.toLocaleString()}</td>
                            </tr>
                            {Object.entries(pnlCategories.expenses).map(([cat, amount]) => (
                                <tr key={cat}>
                                    <td className="p-3 pl-6">{cat}</td>
                                    <td className="p-3 text-right">${amount.toLocaleString()}</td>
                                </tr>
                            ))}
                            <tr className="bg-zinc-50 dark:bg-white/5 font-bold">
                                <td className="p-3">Net Income</td>
                                <td className="p-3 text-right border-t-2 border-zinc-300 dark:border-white/20">${(pnlCategories.revenue - pnlExpensesTotal).toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        )}
      </div>

      {/* HST Module (Active Mode Phase 2) */}
      {isAgent && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                      <FileText size={18} />
                  </div>
                  <h3 className="font-bold text-zinc-900 dark:text-white">HST Tracker</h3>
              </div>
              <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500">Collected (Revenue)</span>
                      <span className="font-bold text-zinc-900 dark:text-white">${hstData.collected.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500">ITCs (Expenses)</span>
                      <span className="font-bold text-zinc-900 dark:text-white">-${hstData.itcs.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                  </div>
                  <div className="h-px bg-zinc-200 dark:bg-white/10" />
                  <div className="flex justify-between items-center">
                      <span className="font-bold text-zinc-900 dark:text-white">Est. Net Remittance</span>
                      <span className={`font-bold text-lg ${hstData.net > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                          ${Math.abs(hstData.net).toLocaleString(undefined, {maximumFractionDigits:0})} {hstData.net < 0 ? 'Refund' : 'Due'}
                      </span>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};