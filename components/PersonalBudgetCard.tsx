import React from 'react';
import { BudgetCategory } from '../types';
import { AlertTriangle, check, CheckCircle2, Sparkles, Pencil } from 'lucide-react';

interface PersonalBudgetCardProps {
  budgetData: BudgetCategory[];
  onEdit: () => void;
}

export const PersonalBudgetCard: React.FC<PersonalBudgetCardProps> = ({ budgetData, onEdit }) => {
  const totalSpent = budgetData.reduce((acc, curr) => acc + curr.spent, 0);
  const totalLimit = budgetData.reduce((acc, curr) => acc + curr.limit, 0);
  const percentUsed = (totalSpent / totalLimit) * 100;

  // AI Insight Logic
  const overBudgetCategories = budgetData.filter(c => c.spent > c.limit);
  const insight = overBudgetCategories.length > 0 
    ? `Heads up! You've exceeded your expected budget for ${overBudgetCategories[0].category}.` 
    : "Great job! You're within your expected spending limits.";

  return (
    <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 shadow-xl animate-slide-up mb-6 relative overflow-hidden">
      {/* Glow Effect */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

      <div className="flex justify-between items-center mb-6 relative z-10">
        <div>
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
                Monthly Budget
            </h3>
            <p className="text-xs text-zinc-500">Expected vs Actual</p>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2 py-1 rounded bg-zinc-800 text-zinc-400">
                Oct 2023
            </span>
            <button onClick={onEdit} className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors">
                <Pencil size={14} />
            </button>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-5 relative z-10">
        {budgetData.map((item) => {
          const ratio = Math.min((item.spent / item.limit) * 100, 100);
          const isOver = item.spent > item.limit;
          
          return (
            <div key={item.category}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-zinc-300 font-medium">{item.category}</span>
                <span className={isOver ? 'text-rose-400 font-bold' : 'text-zinc-400'}>
                  ${item.spent} <span className="text-zinc-600 font-normal text-[10px] uppercase">of ${item.limit} expected</span>
                </span>
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-rose-500' : 'bg-violet-500'}`} 
                  style={{ width: `${ratio}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Smart Insight */}
      <div className="mt-6 pt-5 border-t border-white/5 flex gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/20">
             <Sparkles size={14} className="text-white" />
        </div>
        <div>
            <p className="text-xs font-bold text-violet-300 mb-0.5">Budget Insight</p>
            <p className="text-sm text-zinc-300 leading-snug">{insight}</p>
        </div>
      </div>
    </div>
  );
};