import React, { useState, useMemo } from 'react';
import { BudgetCategory } from '../types';
import { X, Plus, Save, Trash2, Sparkles, Target, Landmark } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

interface BudgetEditorProps {
  isOpen: boolean;
  onClose: () => void;
  budgetData: BudgetCategory[];
  onSave: (newBudget: BudgetCategory[]) => Promise<void>;
}

export const BudgetEditor: React.FC<BudgetEditorProps> = ({ isOpen, onClose, budgetData, onSave }) => {
  const [localBudget, setLocalBudget] = useState<BudgetCategory[]>(JSON.parse(JSON.stringify(budgetData)));
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  
  const totalPlanned = useMemo(() => {
    return localBudget.reduce((sum, item) => sum + (item.limit || 0), 0);
  }, [localBudget]);

  if (!isOpen) return null;

  const handleLimitChange = (index: number, val: string) => {
    const updated = [...localBudget];
    updated[index].limit = parseFloat(val) || 0; 
    setLocalBudget(updated);
  };

  const handleCategoryNameChange = (index: number, val: string) => {
    const updated = [...localBudget];
    updated[index].category = val;
    setLocalBudget(updated);
  };

  const handleAddCategory = () => {
    const trimmedName = newCategoryName.trim();
    if (trimmedName) {
      if (localBudget.some(b => b.category.toLowerCase() === trimmedName.toLowerCase())) {
          alert('Category already exists!');
          return;
      }
      setLocalBudget([...localBudget, { 
          tempId: `temp-${Date.now()}`,
          category: trimmedName, 
          spent: 0, 
          limit: 100 
      }]);
      setNewCategoryName('');
    }
  };

  const handleRemoveCategory = (index: number) => {
    const updated = [...localBudget];
    updated.splice(index, 1);
    setLocalBudget(updated);
  };

  const handleAiSuggestions = async () => {
    setIsSuggesting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: 'Based on a typical Canadian professional, suggest 5 common personal budget categories. Examples: Groceries, Dining Out, Shopping. Respond with a JSON object with a "categories" key containing an array of strings.',
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              categories: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["categories"]
          }
        }
      });
      const result = JSON.parse(response.text.trim());
      const suggestions: string[] = result.categories;

      if (suggestions && suggestions.length > 0) {
        const newCategories = suggestions
          .filter(s => !localBudget.some(b => b.category.toLowerCase() === s.toLowerCase()))
          .map(s => ({ 
              tempId: `temp-ai-${Date.now()}-${s}`,
              category: s, 
              spent: 0, 
              limit: 250 
          }));
        
        setLocalBudget(prev => [...prev, ...newCategories]);
      }
    } catch (error) {
      console.error("AI suggestion failed:", error);
    } finally {
      setIsSuggesting(false);
    }
  };

  const saveAndClose = async () => {
    setIsSaving(true);
    try {
      await onSave(localBudget);
      onClose();
    } catch (error) {
      console.error("Failed to save budget:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl p-6 border border-zinc-200 dark:border-white/10 animate-slide-up shadow-2xl flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center mb-6 shrink-0">
            <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Landmark size={20} className="text-violet-500" />
                  Financial Plan Editor
                </h3>
                <p className="text-sm text-zinc-500">Define your expected monthly expenses</p>
            </div>
            <button onClick={onClose} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                <X size={18} className="text-zinc-600 dark:text-zinc-400" />
            </button>
        </div>

        {/* Real-time Summary */}
        <div className="mb-6 p-4 rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-500/20 shrink-0">
           <div className="flex justify-between items-center">
              <div>
                  <p className="text-[10px] uppercase font-black tracking-widest opacity-80">Total Planned Expenses</p>
                  <p className="text-2xl font-black">${totalPlanned.toLocaleString()}</p>
              </div>
              <div className="text-right">
                 <p className="text-[10px] uppercase font-black tracking-widest opacity-80">Categories</p>
                 <p className="text-2xl font-black">{localBudget.length}</p>
              </div>
           </div>
        </div>

        <div className="space-y-3 overflow-y-auto flex-1 hide-scrollbar pr-1 mb-6">
            {localBudget.map((item, idx) => (
                <div key={item.id || item.tempId} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200 dark:border-white/5 transition-all hover:border-violet-500/30 group">
                    <div className="flex-1 flex gap-2 items-center">
                        <button 
                            onClick={() => handleRemoveCategory(idx)}
                            className="p-2 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        >
                            <Trash2 size={16} />
                        </button>
                        <div className="flex-1">
                            <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black pl-1 mb-1 block">Category</label>
                            <input
                                type="text"
                                value={item.category}
                                onChange={(e) => handleCategoryNameChange(idx, e.target.value)}
                                className="w-full bg-transparent text-sm font-bold text-zinc-900 dark:text-white focus:outline-none border-b border-transparent focus:border-violet-500 transition-colors placeholder:text-zinc-400"
                                placeholder="e.g. Rent, Groceries"
                            />
                        </div>
                    </div>

                    <div className="w-full sm:w-32 pl-10 sm:pl-0">
                         <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black pl-1 mb-1 block">Expected ($)</label>
                         <div className="relative">
                             <span className="absolute left-3 top-2.5 text-zinc-500 text-xs font-bold">$</span>
                            <input 
                                type="number" 
                                step="10" 
                                value={item.limit} 
                                onChange={(e) => handleLimitChange(idx, e.target.value)}
                                className="w-full bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-lg pl-7 pr-2 py-2 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 font-bold"
                            />
                         </div>
                    </div>
                </div>
            ))}
            {localBudget.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
                    <p className="text-zinc-500 text-sm font-medium">No expense categories planned yet.</p>
                </div>
            )}
        </div>

        <div className="shrink-0 pt-4 border-t border-zinc-100 dark:border-white/5 space-y-4">
            <div className="flex gap-2">
                <input 
                    type="text" 
                    placeholder="Add New Category (e.g. Netflix)" 
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                    className="flex-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all font-medium"
                />
                <button 
                    onClick={handleAddCategory}
                    disabled={!newCategoryName.trim()}
                    className="p-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                >
                    <Plus size={20} />
                </button>
            </div>

            <div className="flex gap-3">
              <button 
                  onClick={handleAiSuggestions}
                  disabled={isSuggesting}
                  className="flex-1 py-3 px-4 rounded-xl border border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-300 font-bold flex items-center justify-center gap-2 hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-all disabled:opacity-50 text-sm"
              >
                  {isSuggesting ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                      <>
                          <Sparkles size={16} />
                          AI Suggestions
                      </>
                  )}
              </button>
              
              <button 
                onClick={saveAndClose} 
                disabled={isSaving}
                className="flex-[2] py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-black font-black rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-xl shadow-zinc-500/10"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <><Save size={18} /> Deploy Budget Plan</>
                )}
              </button>
            </div>
        </div>
      </div>
    </div>
  );
};