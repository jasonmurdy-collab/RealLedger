import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { LedgerType } from '../types';
import { CHART_DATA_ACTIVE, CHART_DATA_PASSIVE, CHART_DATA_PERSONAL } from '../constants';
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';

interface AnalyticsViewProps {
  mode: LedgerType;
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

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ mode }) => {
  const isAgent = mode === 'active';
  const isPassive = mode === 'passive';
  
  const data = isAgent ? CHART_DATA_ACTIVE : isPassive ? CHART_DATA_PASSIVE : CHART_DATA_PERSONAL;
  const primaryColor = isAgent ? '#f43f5e' : isPassive ? '#06b6d4' : '#8b5cf6';
  
  // Calculations
  const totalRevenue = data.reduce((acc, curr) => acc + curr.value, 0);
  const totalExpenses = data.reduce((acc, curr) => acc + (curr.expense || 0), 0);
  const netIncome = totalRevenue - totalExpenses;
  const margin = Math.round((netIncome / totalRevenue) * 100);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4">
           <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${isAgent ? 'bg-rose-500/10 text-rose-500' : 'bg-cyan-500/10 text-cyan-500'}`}>
                <TrendingUp size={16} />
              </div>
              <span className="text-xs text-zinc-400 font-medium">Net Profit</span>
           </div>
           <p className="text-2xl font-bold text-white">${netIncome.toLocaleString()}</p>
           <p className="text-xs text-emerald-500 mt-1">+14% vs last period</p>
        </div>
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4">
           <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400">
                <TrendingDown size={16} />
              </div>
              <span className="text-xs text-zinc-400 font-medium">Expenses</span>
           </div>
           <p className="text-2xl font-bold text-white">${totalExpenses.toLocaleString()}</p>
           <p className="text-xs text-zinc-500 mt-1">Avg $1.2k / month</p>
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
            <option>YTD</option>
            <option>All Time</option>
          </select>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {isAgent || isPassive ? (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                <Bar dataKey="value" name="Revenue" fill={primaryColor} radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="expense" name="Expense" fill="#3f3f46" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            ) : (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="value" name="Spent" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, fill: '#8b5cf6', strokeWidth: 0}} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown / Insights */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-white/5 rounded-3xl p-6">
         <h3 className="font-bold text-white mb-4">Profit Margin</h3>
         <div className="flex items-end gap-4">
            <div className="text-5xl font-bold text-white">{margin}%</div>
            <div className="pb-2 text-zinc-500 text-sm">Net margin this period</div>
         </div>
         <div className="mt-4 w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
             <div className="h-full bg-emerald-500" style={{ width: `${margin}%` }}></div>
         </div>
      </div>
    </div>
  );
};
