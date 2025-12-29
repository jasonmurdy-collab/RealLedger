import React, { useState, useMemo, useEffect } from 'react';
import { BudgetCategory, LedgerType } from '../types';
import { X, Plus, Save, Trash2, Sparkles, Target, Landmark, Briefcase, Building2, UserCircle } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { PERSONAL_EXPENSE_CATEGORIES, DEFAULT_CHART_OF_ACCOUNTS } from '../constants';

interface BudgetEditorProps {
  isOpen: boolean;
  onClose: () => void;
  budgetData: BudgetCategory[];
  onSave: (newBudget: BudgetCategory[]) => Promise<void>;
  initialLedger: LedgerType;
}

const businessExpenseCategories = DEFAULT_CHART_OF_ACCOUNTS
    .filter(acc => acc.type === 'Expense' && acc.tax_line_t2125)
    .map(acc => acc.name);

export const BudgetEditor: React.FC<BudgetEditorProps> = ({ isOpen, onClose, budgetData, onSave, initialLedger }) => {
  const [localBudget, setLocalBudget] = useState<BudgetCategory[]>([]);
  const [activeLedger, setActiveLedger] = useState<LedgerType>(initialLedger);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);

  useEffect(() => {
    // Deep copy on open to prevent modifying parent state
    setLocalBudget(JSON.parse(JSON.stringify(budgetData)));
    setActiveLedger(initialLedger);
  }, [isOpen, budgetData, initialLedger]);
  
  const currentLedgerBudgets = useMemo(() => {
    return localBudget.filter(b => b.ledger_type === activeLedger);
  }, [localBudget, activeLedger]);

  const totalPlanned = useMemo(() => {
    return currentLedgerBudgets.reduce((sum, item) => sum + (item.limit || 0), 0);
  }, [currentLedgerBudgets]);

  if (!isOpen) return null;

  const handleLimitChange = (id: string, val: string) => {
    const updated = localBudget.map(b => b.id === id || b.tempId === id ? { ...b, limit: parseFloat(val) || 0 } : b);
    setLocalBudget(updated);
  };

  const handleCategoryNameChange = (id: string, val: string) => {
    const updated = localBudget.map(b => b.id === id || b.tempId === id ? { ...b, category: val } : b);
    setLocalBudget(updated);
  };

  const handleAddCategory = () => {
    const trimmedName = newCategoryName.trim();
    if (trimmedName) {
      if (localBudget.some(b => b.category.toLowerCase() === trimmedName.toLowerCase() && b.ledger_type === activeLedger)) {
          alert('Category already exists for this ledger!');
          return;
      }
      const newBudget: BudgetCategory = { 
          tempId: `temp-${Date.now()}`,
          category: trimmedName, 
          spent: 0, 
          limit: 100,
          ledger_type: activeLedger
      };
      setLocalBudget([...localBudget, newBudget]);
      setNewCategoryName('');
    }
  };

  const handleRemoveCategory = (idToRemove: string) => {
    setLocalBudget(localBudget.filter(b => (b.id || b.tempId) !== idToRemove));
  };
  
  const saveAndClose = async () => {
    setIsSaving(true);
    try {
      await onSave(localBudget);
      onClose();
    } catch (error: any) {
      console.error("Failed to save budget:", error);
      alert(`Failed to save budget: ${error.message || 'An unknown error occurred. Please check the console.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const config = {
      active: { color: "rose", icon: <Briefcase size={20} /> },
      passive: { color: "cyan", icon: <Building2 size={20} /> },
      personal: { color: "violet", icon: <UserCircle size={20} /> },
  }[activeLedger];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl p-6 border border-zinc-200 dark:border-white/10 animate-slide-up shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6 shrink-0">
            <div>
                <h3 className={`text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2 text-${config.color}-500`}>
                  {config.icon} Expense Plan Editor
                </h3>
                <p className="text-sm text-zinc-500">Define your expected monthly expenses for each ledger.</p>
            </div>
            <button onClick={onClose} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"><X size={18} className="text-zinc-600 dark:text-zinc-400" /></button>
        </div>
        
        <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-2xl border border-zinc-200 dark:border-white/5 mb-6">
            <TabButton label="Active" isActive={activeLedger === 'active'} onClick={() => setActiveLedger('active')} color="rose" />
            <TabButton label="Passive" isActive={activeLedger === 'passive'} onClick={() => setActiveLedger('passive')} color="cyan" />
            <TabButton label="Personal" isActive={activeLedger === 'personal'} onClick={() => setActiveLedger('personal')} color="violet" />
        </div>

        <div className="space-y-3 overflow-y-auto flex-1 hide-scrollbar pr-1 mb-6">
            {currentLedgerBudgets.map((item) => (
                <div key={item.id || item.tempId} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200 dark:border-white/5 transition-all group">
                    <div className="flex-1 flex gap-2 items-center">
                        <button onClick={() => handleRemoveCategory(item.id || item.tempId!)} className="p-2 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"><Trash2 size={16} /></button>
                        <div className="flex-1">
                            <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black pl-1 mb-1 block">Category</label>
                            <input type="text" value={item.category} onChange={(e) => handleCategoryNameChange(item.id || item.tempId!, e.target.value)} className="w-full bg-transparent text-sm font-bold text-zinc-900 dark:text-white focus:outline-none border-b border-transparent focus:border-violet-500 transition-colors" />
                        </div>
                    </div>
                    <div className="w-full sm:w-32 pl-10 sm:pl-0">
                         <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black pl-1 mb-1 block">Expected ($)</label>
                         <div className="relative">
                             <span className="absolute left-3 top-2.5 text-zinc-500 text-xs font-bold">$</span>
                            <input type="number" step="10" value={item.limit} onChange={(e) => handleLimitChange(item.id || item.tempId!, e.target.value)} className="w-full bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-lg pl-7 pr-2 py-2 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 font-bold" />
                         </div>
                    </div>
                </div>
            ))}
            {currentLedgerBudgets.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
                    <p className="text-zinc-500 text-sm font-medium">No expense categories planned for the <span className="font-bold">{activeLedger}</span> ledger.</p>
                </div>
            )}
        </div>

        <div className="shrink-0 pt-4 border-t border-zinc-100 dark:border-white/5 space-y-4">
            <div className="flex gap-2">
                <input type="text" placeholder="Add New Category..." value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()} className="flex-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all font-medium" />
                <button onClick={handleAddCategory} disabled={!newCategoryName.trim()} className="p-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"><Plus size={20} /></button>
            </div>
            <div className="flex gap-3">
              <button onClick={saveAndClose} disabled={isSaving} className="w-full py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-black font-black rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-xl shadow-zinc-500/10">
                {isSaving ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : <><Save size={18} /> Save & Close</>}
              </button>
            </div>
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ label, isActive, onClick, color }: { label: string, isActive: boolean, onClick: () => void, color: string }) => (
    <button onClick={onClick} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${isActive ? `bg-white dark:bg-zinc-700 text-${color}-500 shadow-md` : `text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white`}`}>
        {label}
    </button>
);