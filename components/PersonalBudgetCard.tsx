import React from 'react';
import { BudgetCategory } from '../types';
import { Sparkles, Pencil, ArrowUpRight, TrendingDown, Target, Wallet, CheckCircle2, AlertCircle } from 'lucide-react';
import { MONTH_NAMES } from '../constants';

interface PersonalBudgetCardProps {
  budgetData: BudgetCategory[];
  onEdit: () => void;
}

export const PersonalBudgetCard: React.FC<PersonalBudgetCardProps> = ({ budgetData, onEdit }) => {
  const totalSpent = budgetData.reduce((acc, curr) => acc + curr.spent, 0);
  const totalPlanned = budgetData.reduce((acc, curr) => acc + curr.limit, 0);
  const remaining = Math.max(0, totalPlanned - totalSpent);
  
  // AI Insight Logic
  const overBudgetCategories = budgetData.filter(c => c.spent > c.limit);
  const insight = overBudgetCategories.length > 0 
    ? `Heads up: Your ${overBudgetCategories[0].category} spending is $${(overBudgetCategories[0].spent - overBudgetCategories[0].limit).toFixed(0)} over your expected limit.` 
    : totalPlanned > 0 
      ? `You're doing great! You still have $${remaining.toLocaleString()} left in your expected monthly budget.`
      : "Initialize your financial plan by setting your expected monthly expenses.";
  
  const date = new Date();
  const monthLabel = MONTH_NAMES[date.getMonth()];
  const yearLabel = date.getFullYear();

  if (budgetData.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-3xl p-8 shadow-xl animate-slide-up mb-6 text-center transition-all">
        <div className="w-16 h-16 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <Target size={32} />
        </div>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">No Budget Plan Active</h3>
        <p className="text-zinc-500 text-sm mb-6 max-w-xs mx-auto">
          Start tracking your expected vs actual expenses to gain financial clarity.
        </p>
        <button 
          onClick={onEdit}
          className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-all inline-flex items-center gap-2 shadow-lg shadow-violet-500/20 active:scale-95"
        >
          <Plus size={18} /> Define Monthly Plan
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-3xl p-5 sm:p-7 shadow-xl animate-slide-up mb-6 relative overflow-hidden transition-all">
      {/* Visual Accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

      <div className="flex justify-between items-center mb-8 relative z-10">
        <div>
            <h3 className="text-zinc-900 dark:text-white font-black text-xl flex items-center gap-2 tracking-tight">
                Monthly Financial Plan
            </h3>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                {monthLabel} {yearLabel} Breakdown
            </p>
        </div>
        <button 
          onClick={onEdit} 
          className="p-3 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all shadow-sm border border-zinc-200 dark:border-white/5 active:scale-90"
        >
            <Pencil size={18} />
        </button>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 relative z-10">
         <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/5 shadow-sm">
             <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1.5">Expected Spend</p>
             <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">${totalPlanned.toLocaleString()}</p>
         </div>
         <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/5 shadow-sm">
             <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1.5">Actual Spent</p>
             <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">${totalSpent.toLocaleString()}</p>
         </div>
         <div className="p-4 rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-500/20 border border-violet-500/20">
             <p className="text-[10px] text-violet-100/70 uppercase font-black tracking-widest mb-1.5">Remaining Plan</p>
             <p className="text-2xl font-black tracking-tighter">${remaining.toLocaleString()}</p>
         </div>
      </div>

      {/* Detailed Categories */}
      <div className="space-y-7 relative z-10">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Category Progress</span>
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Actual / Expected</span>
        </div>
        
        {budgetData.map((item) => {
          let ratio = 0;
          if (item.limit > 0) {
              ratio = Math.min((item.spent / item.limit) * 100, 100);
          } else if (item.spent > 0) {
              ratio = 100;
          }
          
          const isOver = item.spent > item.limit;
          const isNear = !isOver && ratio > 85;
          
          return (
            <div key={item.category} className="group">
              <div className="flex justify-between items-end mb-2.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-zinc-900 dark:text-zinc-100 font-bold text-sm">
                    {item.category}
                  </h4>
                  {isOver && <AlertCircle size={14} className="text-rose-500" />}
                  {ratio < 100 && !isNear && item.spent > 0 && <CheckCircle2 size={14} className="text-emerald-500" />}
                </div>
                <div className="text-right">
                   <div className="flex items-center gap-2 justify-end">
                      <span className={`text-base font-black ${isOver ? 'text-rose-500' : 'text-zinc-900 dark:text-white'}`}>
                        ${item.spent.toLocaleString()}
                      </span>
                      <span className="text-xs text-zinc-400 font-bold uppercase">/ ${item.limit.toLocaleString()}</span>
                   </div>
                </div>
              </div>
              
              <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden border border-zinc-200 dark:border-white/5 shadow-inner">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${
                    isOver ? 'bg-rose-500' : 
                    isNear ? 'bg-amber-500' :
                    'bg-violet-600'
                  }`} 
                  style={{ width: `${ratio}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Smart Insight */}
      <div className="mt-10 pt-6 border-t border-zinc-100 dark:border-white/5 flex gap-4 items-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/20">
             <Sparkles size={20} className="text-white" />
        </div>
        <div className="flex-1">
            <p className="text-[10px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-0.5">AI Planner Insight</p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 font-semibold leading-relaxed">{insight}</p>
        </div>
      </div>
    </div>
  );
};

const Plus = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);