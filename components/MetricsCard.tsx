import React, { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { LedgerType, Transaction, Property } from '../types';
import { MONTH_NAMES } from '../constants';

interface MetricsCardProps {
  mode: LedgerType;
  transactions: Transaction[];
  properties: Property[];
}

export const MetricsCard: React.FC<MetricsCardProps> = ({ mode, transactions, properties }) => {
  const modeTransactions = useMemo(() => 
    transactions.filter(t => t.type === mode), 
  [transactions, mode]);

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

      let value = 0;
      if (mode === 'active') {
        value = monthTx.reduce((acc, t) => t.amount > 0 ? acc + t.amount : acc, 0);
      } else if (mode === 'passive') {
        value = monthTx.reduce((acc, t) => acc + t.amount, 0);
      } else {
        value = monthTx.reduce((acc, t) => t.amount < 0 ? acc + Math.abs(t.amount) : acc, 0);
      }

      data.push({ month: monthLabel, value });
    }
    return data;
  }, [modeTransactions, mode]);

  let color, label1, val1, label2, val2, sub1, sub2;

  if (mode === 'active') {
    color = '#f43f5e'; // rose-500
    const gci = modeTransactions.reduce((acc, t) => t.amount > 0 ? acc + t.amount : acc, 0);
    const estTax = gci * 0.2; 

    label1 = 'YTD GCI'; 
    val1 = `$${(gci / 1000).toFixed(1)}k`;
    label2 = 'Est. Tax (T2125)'; 
    val2 = `$${(estTax / 1000).toFixed(1)}k`;
    sub2 = 'Approx. 20%';

  } else if (mode === 'passive') {
    color = '#06b6d4'; // cyan-500
    const noi = modeTransactions.reduce((acc, t) => acc + t.amount, 0);
    const cca = properties.reduce((sum, p) => sum + (p.openingUcc * 0.04), 0);

    label1 = 'YTD Net Op Income'; 
    val1 = `$${(noi / 1000).toFixed(1)}k`;
    label2 = 'Est. Annual CCA'; 
    val2 = `$${(cca / 1000).toFixed(1)}k`;
    sub2 = 'Based on UCC';

  } else {
    color = '#8b5cf6'; // violet-500
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const currentMonthTx = modeTransactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const monthlySpend = currentMonthTx
      .filter(t => t.amount < 0)
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    const monthlyIncome = currentMonthTx
      .filter(t => t.amount > 0)
      .reduce((acc, t) => acc + t.amount, 0);
    
    const savingsRate = monthlyIncome > 0 ? Math.round(((monthlyIncome - monthlySpend) / monthlyIncome) * 100) : 0;

    label1 = 'Monthly Spend'; 
    val1 = `$${monthlySpend.toLocaleString()}`;
    label2 = 'Savings Rate'; 
    val2 = `${savingsRate}%`;
    sub2 = 'Target: 20%';
  }

  const gradientClass = mode === 'personal' ? 'from-violet-500/10' : mode === 'active' ? 'from-rose-500/10' : 'from-cyan-500/10';

  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className={`relative overflow-hidden rounded-2xl p-4 border border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-sm`}>
        <div className={`absolute inset-0 bg-gradient-to-b ${gradientClass} to-transparent opacity-50 pointer-events-none`}></div>
        <p className="text-zinc-500 dark:text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1 relative z-10">
          {label1}
        </p>
        <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-2 relative z-10">
          {val1}
        </h3>
        <div className="h-10 w-full opacity-60 relative z-10">
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
                strokeWidth={3}
                fillOpacity={1} 
                fill={`url(#gradient-${mode})`} 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={`rounded-2xl p-4 border border-zinc-200 dark:border-white/5 flex flex-col justify-between bg-white dark:bg-zinc-900 shadow-sm`}>
        <div>
          <p className="text-zinc-500 dark:text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1">
            {label2}
          </p>
          <h3 className="text-2xl font-black text-zinc-900 dark:text-white">
            {val2}
          </h3>
        </div>
        <div className="mt-2">
           <span className={`text-[10px] font-bold uppercase tracking-tight px-2 py-1 rounded-full ${
               mode === 'active' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-300' : 
               mode === 'passive' ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300' : 
               'bg-violet-500/10 text-violet-600 dark:text-violet-300'
           }`}>{sub2}</span>
        </div>
      </div>
    </div>
  );
};