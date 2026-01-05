import React from 'react';
import { BudgetCategory, LedgerType } from '../types';
import { Sparkles, Pencil, ArrowUpRight, TrendingDown, Target, Wallet, CheckCircle2, AlertCircle, Briefcase, Building2, UserCircle, Plus, Loader2 } from 'lucide-react';
import { MONTH_NAMES } from '../constants';

interface LedgerBudgetCardProps {
  mode: LedgerType;
  budgetData: BudgetCategory[];
  onEdit: (mode: LedgerType) => void;
}

export const LedgerBudgetCard: React.FC<LedgerBudgetCardProps> = ({ mode, budgetData, onEdit }) => {
  const data = budgetData || [];
  const totalSpent = data.reduce((acc, curr) => acc + (curr.spent || 0), 0);
  const totalPlanned = data.reduce((acc, curr) => acc + (curr.limit || 0), 0);
  const remaining = Math.max(0, totalPlanned - totalSpent);
  
  const overBudgetCategories = data.filter(c => (c.spent || 0) > (c.limit || 0));
  
  const date = new Date();
  const monthLabel = MONTH_NAMES[date.getMonth()];
  const yearLabel = date.getFullYear();

  const insight = overBudgetCategories.length > 0 
    ? `Heads up: Your ${overBudgetCategories[0].category} spending is $${((overBudgetCategories[0].spent || 0) - (overBudgetCategories[0].limit || 0)).toFixed(0)} over your planned limit.` 
    : totalPlanned > 0 
      ? totalSpent > 0 
        ? `You're on track! You still have $${(remaining || 0).toLocaleString()} left in your ${monthLabel} plan.`
        : `No expenses logged for your ${mode} categories yet in ${monthLabel}. Check your vendor tags if this seems incorrect.`
      : `No expense plan defined for the ${mode} ledger. Start by adding categories and limits.`;
  
  const config = {
      active: { title: "Active Business Plan", color: "rose", icon: <Briefcase size={32} /> },
      passive: { title: "Passive Property Plan", color: "cyan", icon: <Building2 size={32} /> },
      personal: { title: "Personal Financial Plan", color: "violet", icon: <UserCircle size={32} /> },
  }[mode];

  if (data.length === 0) {
    return (
      <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-3xl p-8 shadow-xl animate-slide-up mb-6 text-center transition-all`}>
        <div className={`w-16 h-16 bg-${config.color}-500/10 text-${config.color}-600 dark:text-${config.color}-400 rounded-full flex items-center justify-center mx-auto mb-4`}>
          {config.icon}
        </div>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{config.title}</h3>
        <p className="text-zinc-500 text-sm mb-6 max-w-xs mx-auto">
          Create an expense plan for {monthLabel} {yearLabel} to monitor your cash flow and stay CRA compliant.
        </p>
        <button 
          onClick={() => onEdit(mode)}
          className={`px-6 py-2.5 bg-${config.color}-600 hover:bg-${config.color}-700 text-white font-bold rounded-xl transition-all inline-flex items-center gap-2 shadow-lg shadow-${config.color}-500/20 active:scale-95`}
        >
          <Plus size={18} /> Initialize Plan
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-3xl p-5 sm:p-7 shadow-xl animate-slide-up mb-6 relative overflow-hidden transition-all`}>
      <div className={`absolute top-0 right-0 w-64 h-64 bg-${config.color}-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none`}></div>

      <div className="flex justify-between items-center mb-8 relative z-10">
        <div>
            <h3 className="text-zinc-900 dark:text-white font-black text-xl flex items-center gap-2 tracking-tight">
                {config.title}
            </h3>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                {monthLabel} {yearLabel} Performance
            </p>
        </div>
        <button 
          onClick={() => onEdit(mode)} 
          className="p-3 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all shadow-sm border border-zinc-200 dark:border-white/5 active:scale-90"
        >
            <Pencil size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 relative z-10">
         <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/5 shadow-sm">
             <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1.5">Planned Outflow</p>
             <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">${(totalPlanned || 0).toLocaleString()}</p>
         </div>
         <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/5 shadow-sm">
             <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1.5">Actual Outflow</p>
             <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">${(totalSpent || 0).toLocaleString()}</p>
         </div>
         <div className={`p-4 rounded-2xl bg-${config.color}-600 text-white shadow-lg shadow-${config.color}-500/20 border border-${config.color}-500/20`}>
             <p className="text-[10px] text-white/70 uppercase font-black tracking-widest mb-1.5">Remaining Capacity</p>
             <p className="text-2xl font-black tracking-tighter">${(remaining || 0).toLocaleString()}</p>
         </div>
      </div>

      <div className="space-y-7 relative z-10">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Category Progress</span>
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Actual / Planned</span>
        </div>
        
        {data.map((item) => {
          let ratio = 0;
          const limit = item.limit || 0;
          const spent = item.spent || 0;
          if (limit > 0) {
              ratio = Math.min((spent / limit) * 100, 100);
          } else if (spent > 0) {
              ratio = 100;
          }
          
          const isOver = spent > limit;
          
          return (
            <div key={item.id || item.tempId} className="group">
              <div className="flex justify-between items-end mb-2.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-zinc-900 dark:text-zinc-100 font-bold text-sm">{item.category}</h4>
                  {isOver && <AlertCircle size={14} className="text-rose-500" />}
                </div>
                <div className="text-right">
                   <div className="flex items-center gap-2 justify-end">
                      <span className={`text-base font-black ${isOver ? 'text-rose-500' : 'text-zinc-900 dark:text-white'}`}>${(spent || 0).toLocaleString()}</span>
                      <span className="text-xs text-zinc-400 font-bold uppercase">/ ${(limit || 0).toLocaleString()}</span>
                   </div>
                </div>
              </div>
              <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden border border-zinc-200 dark:border-white/5 shadow-inner">
                <div className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${isOver ? 'bg-rose-500' : `bg-${config.color}-600`}`} style={{ width: `${ratio}%` }}/>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`mt-10 pt-6 border-t border-zinc-100 dark:border-white/5 flex gap-4 items-center text-${config.color}-600 dark:text-${config.color}-400`}>
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br from-${config.color}-600 to-fuchsia-600 flex items-center justify-center shrink-0 shadow-lg shadow-${config.color}-500/20`}>
             <Sparkles size={20} className="text-white" />
        </div>
        <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest mb-0.5">Financial Intelligence</p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 font-semibold leading-relaxed">{insight}</p>
        </div>
      </div>
    </div>
  );
};