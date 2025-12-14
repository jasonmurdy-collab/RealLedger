import React, { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { LedgerType, Transaction } from '../types';
import { MONTH_NAMES } from '../constants';

interface MetricsCardProps {
  mode: LedgerType;
  transactions: Transaction[];
}

export const MetricsCard: React.FC<MetricsCardProps> = ({ mode, transactions }) => {
  // Filter transactions for the current mode
  const modeTransactions = useMemo(() => 
    transactions.filter(t => t.type === mode), 
  [transactions, mode]);

  // Calculate Chart Data (Last 6 Months)
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

      // For charts, we usually want positive representation of magnitude or specific net value
      let value = 0;
      if (mode === 'active') {
        // Revenue (positive amounts)
        value = monthTx.reduce((acc, t) => t.amount > 0 ? acc + t.amount : acc, 0);
      } else if (mode === 'passive') {
        // Net Income (Sum of all)
        value = monthTx.reduce((acc, t) => acc + t.amount, 0);
      } else {
        // Personal Spend (absolute value of negative amounts)
        value = monthTx.reduce((acc, t) => t.amount < 0 ? acc + Math.abs(t.amount) : acc, 0);
      }

      data.push({ month: monthLabel, value });
    }
    return data;
  }, [modeTransactions, mode]);

  let color, label1, val1, label2, val2, sub1, sub2;

  // Calculate Summary Metrics
  if (mode === 'active') {
    color = '#f43f5e'; // rose-500
    // Gross Commission Income (Sum of positive transactions)
    const gci = modeTransactions.reduce((acc, t) => t.amount > 0 ? acc + t.amount : acc, 0);
    // Est Tax (Simplistic 20% of GCI)
    const estTax = gci * 0.2; // roughly 20% effective tax rate

    label1 = 'YTD GCI'; 
    val1 = `$${(gci / 1000).toFixed(1)}k`;
    label2 = 'Est. Tax (T2125)'; 
    val2 = `$${(estTax / 1000).toFixed(1)}k`;
    sub2 = 'Approx. 20%';

  } else if (mode === 'passive') {
    color = '#06b6d4'; // cyan-500
    // Net Operating Income (Sum of all transactions)
    const noi = modeTransactions.reduce((acc, t) => acc + t.amount, 0);
    // Mock CCA for now as we don't have full asset depreciation engine yet
    const cca = 12100; 

    label1 = 'YTD Net Op Income'; 
    val1 = `$${(noi / 1000).toFixed(1)}k`;
    label2 = 'Portfolio CCA'; 
    val2 = `$${(cca / 1000).toFixed(1)}k`;
    sub2 = 'Class 1 Remaining';

  } else {
    color = '#8b5cf6'; // violet-500
    // Monthly Spend (Current Month)
    const currentMonth = new Date().getMonth();
    const monthlySpend = modeTransactions
      .filter(t => new Date(t.date).getMonth() === currentMonth && t.amount < 0)
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);
    
    // Mock Savings Rate
    const savingsRate = 18;

    label1 = 'Monthly Spend'; 
    val1 = `$${monthlySpend.toLocaleString()}`;
    label2 = 'Savings Rate'; 
    val2 = `${savingsRate}%`;
    sub2 = 'Target: 20%';
  }

  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      {/* Metric 1 */}
      <div className={`relative overflow-hidden rounded-2xl p-4 border border-white/5 bg-gradient-to-b from-${mode === 'personal' ? 'violet' : mode === 'active' ? 'rose' : 'cyan'}-900/20 to-zinc-900`}>
        <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-1">
          {label1}
        </p>
        <h3 className="text-2xl font-bold text-white mb-2">
          {val1}
        </h3>
        <div className="h-10 w-full opacity-60">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={`gradient-${mode}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={color} 
                strokeWidth={2}
                fillOpacity={1} 
                fill={`url(#gradient-${mode})`} 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Metric 2 */}
      <div className={`rounded-2xl p-4 border border-white/5 flex flex-col justify-between bg-zinc-900/50`}>
        <div>
          <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-1">
            {label2}
          </p>
          <h3 className="text-2xl font-bold text-white">
            {val2}
          </h3>
        </div>
        <div className="mt-2">
           <span className={`text-xs px-2 py-1 rounded-full ${
               mode === 'active' ? 'bg-rose-500/20 text-rose-300' : 
               mode === 'passive' ? 'bg-cyan-500/20 text-cyan-300' : 
               'bg-violet-500/20 text-violet-300'
           }`}>{sub2}</span>
        </div>
      </div>
    </div>
  );
};
