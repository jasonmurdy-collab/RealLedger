import React, { useState } from 'react';
import { BudgetCategory } from '../types';
import { X, Plus, Save } from 'lucide-react';

interface BudgetEditorProps {
  isOpen: boolean;
  onClose: () => void;
  budgetData: BudgetCategory[];
  onSave: (newBudget: BudgetCategory[]) => void;
}

export const BudgetEditor: React.FC<BudgetEditorProps> = ({ isOpen, onClose, budgetData, onSave }) => {
  const [localBudget, setLocalBudget] = useState<BudgetCategory[]>(JSON.parse(JSON.stringify(budgetData)));
  const [newCategoryName, setNewCategoryName] = useState('');
  
  if (!isOpen) return null;

  const handleLimitChange = (index: number, val: string) => {
    const updated = [...localBudget];
    updated[index].limit = parseInt(val) || 0;
    setLocalBudget(updated);
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      setLocalBudget([...localBudget, { category: newCategoryName, spent: 0, limit: 100 }]);
      setNewCategoryName('');
    }
  };

  const saveAndClose = () => {
    onSave(localBudget);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
      <div className="bg-zinc-900 w-full max-w-sm rounded-2xl p-6 border border-white/10 animate-slide-up">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">Edit Expected Budget</h3>
            <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700">
                <X size={18} className="text-zinc-400" />
            </button>
        </div>

        <div className="space-y-4 max-h-[50vh] overflow-y-auto hide-scrollbar pr-1">
            {localBudget.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center gap-3 bg-zinc-800/50 p-3 rounded-xl border border-white/5">
                    <span className="text-sm font-medium text-white truncate flex-1">{item.category}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-zinc-500 text-[10px] uppercase tracking-wider mr-1">Expected</span>
                        <span className="text-zinc-500 text-xs">$</span>
                        <input 
                            type="number" 
                            value={item.limit} 
                            onChange={(e) => handleLimitChange(idx, e.target.value)}
                            className="w-20 bg-black/30 border border-white/10 rounded px-2 py-1 text-right text-white text-sm focus:outline-none focus:border-violet-500"
                        />
                    </div>
                </div>
            ))}
        </div>

        <div className="mt-4 pt-4 border-t border-white/5">
            <div className="flex gap-2 mb-6">
                <input 
                    type="text" 
                    placeholder="New Category Name" 
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
                />
                <button 
                    onClick={handleAddCategory}
                    className="p-2 bg-violet-500/20 text-violet-300 rounded-xl border border-violet-500/30 hover:bg-violet-500/30"
                >
                    <Plus size={20} />
                </button>
            </div>

            <button onClick={saveAndClose} className="w-full py-3 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors">
                <Save size={18} /> Save Expectations
            </button>
        </div>
      </div>
    </div>
  );
};
