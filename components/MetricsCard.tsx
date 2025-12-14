import React from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { LedgerType } from '../types';
import { CHART_DATA_ACTIVE, CHART_DATA_PASSIVE, CHART_DATA_PERSONAL } from '../constants';

interface MetricsCardProps {
  mode: LedgerType;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({ mode }) => {
  let data, color, label1, val1, label2, val2, sub1, sub2;

  switch (mode) {
    case 'active':
        data = CHART_DATA_ACTIVE;
        color = '#f43f5e'; // rose-500
        label1 = 'YTD GCI'; val1 = '$142.5k';
        label2 = 'Est. Tax (T2125)'; val2 = '$38.4k';
        sub1 = ''; sub2 = '+12% vs LY';
        break;
    case 'passive':
        data = CHART_DATA_PASSIVE;
        color = '#06b6d4'; // cyan-500
        label1 = 'YTD Net Op Income'; val1 = '$48.2k';
        label2 = 'Portfolio CCA'; val2 = '$12.1k';
        sub1 = ''; sub2 = 'Class 1 Remaining';
        break;
    case 'personal':
        data = CHART_DATA_PERSONAL;
        color = '#8b5cf6'; // violet-500
        label1 = 'Monthly Spend'; val1 = '$3,720';
        label2 = 'Savings Rate'; val2 = '18%';
        sub1 = ''; sub2 = 'Target: 20%';
        break;
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
            <AreaChart data={data}>
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
            