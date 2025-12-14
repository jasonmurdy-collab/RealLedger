import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { LedgerType, Transaction } from '../types';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { MONTH_NAMES } from '../constants';

interface AnalyticsViewProps {
  mode: LedgerType;
  transactions: Transaction[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 border border-white/10 p-3 rounded-lg shadow-xl">
        <p className="text-zinc-400 text-xs mb-1">{label}</p>
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
  const isAgent = mode === 'active';
  const isPassive = mode === 'passive';
  const primaryColor = isAgent ? '#f43f5e' : isPassive ? '#06b6d4' : '#8b5cf6';

  // Filter transactions for mode
  const modeTransactions = useMemo(() => 
    transactions.filter(t => t.type === mode), 
  [transactions, mode]);

  // Aggregate Data by Month (Last 6 Months)
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
            // Revenue vs Expenses
            const revenue = monthTx.reduce((acc, t) => t.amount > 0 ? acc + t.amount : acc, 0);
            const expense = monthTx.reduce((acc, t) => t.amount < 0 ? acc + Math.abs(t.amount) : acc, 0);
            data.push({ month: monthLabel, value: revenue, expense });
        } else {
            // Personal Spend
            const spend = monthTx.reduce((acc, t) => t.amount < 0 ? acc + Math.abs(t.amount) : acc, 0);
            data.push({ month: monthLabel, value: spend });
        }
    }
    return data;
  }, [modeTransactions, isAgent, isPassive]);
  
  // Calculations
  const totalRevenue = chartData.reduce((acc, curr) => acc + (isAgent || isPassive ? curr.value : 0), 0);
  const totalExpenses = chartData.reduce((acc, curr) => acc + (isAgent || isPassive ? (curr.expense || 0) : curr.value), 0);
  
  // For Personal, 'value' is actually expense/spend.
  // For Active/Passive: Value is Revenue, Expense is Expense.
  
  const netIncome = isAgent || isPassive ? totalRevenue - totalExpenses : 0;
  const margin = (isAgent || isPassive) && totalRevenue > 0 ? Math.round((netIncome / totalRevenue) * 100) : 0;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4">
           <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${isAgent ? 'bg-rose-500/10 text-rose-500' : 'bg-cyan-500/10 text-cyan-500'}`}>
                <TrendingUp size={16} />
              </div>
              <span className="text-xs text-zinc-400 font-medium">{isAgent || isPassive ? 'Net Profit' : 'Total Spent'}</span>
           </div>
           <p className="text-2xl font-bold text-white">${(isAgent || isPassive ? netIncome : totalExpenses).toLocaleString()}</p>
           {/* <p className="text-xs text-emerald-500 mt-1">+14% vs last period</p> */}
        </div>
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4">
           <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400">
                <TrendingDown size={16} />
              </div>
              <span className="text-xs text-zinc-400 font-medium">Expenses</span>
           </div>
           <p className="text-2xl font-bold text-white">${totalExpenses.toLocaleString()}</p>
           <p className="text-xs text-zinc-500 mt-1">Last 6 Months</p>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-white text-lg">
            {isAgent ? 'Cash Flow Analysis' : isPassive ? 'Net Operating Income' : 'Spending Trend'}
          </h3>
          <select className="bg-zinc-800 text-xs text-white px-2 py-1 rounded-lg border border-white/10 outline-none">
            <option>Last 6 Months</option>
          </select>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {isAgent || isPassive ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                <Bar dataKey="value" name="Revenue" fill={primaryColor} radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="expense" name="Expense" fill="#3f3f46" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="value" name="Spent" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, fill: '#8b5cf6', strokeWidth: 0}} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown / Insights - Only show margin for profit centers */}
      {(isAgent || isPassive) && (
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-white/5 rounded-3xl p-6">
         <h3 className="font-bold text-white mb-4">Profit Margin</h3>
         <div className="flex items-end gap-4">
            <div className="text-5xl font-bold text-white">{margin}%</div>
            <div className="pb-2 text-zinc-500 text-sm">Net margin this period</div>
         </div>
         <div className="mt-4 w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
             <div className="h-full bg-emerald-500" style={{ width: `${Math.max(0, margin)}%` }}></div>
         </div>
      </div>
      )}
    </div>
  );
};
