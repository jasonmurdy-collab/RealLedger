import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, Property, LedgerType, BudgetCategory } from '../types';
import { X, Save, Trash2, Briefcase, Building, User, Tag, Check, Sparkles } from 'lucide-react';

interface TransactionEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTransaction: Transaction, updateAllFromVendor?: boolean) => Promise<void>;
  onDelete: (transactionId: string) => Promise<void>;
  transaction: Transaction | null;
  properties: Property[];
  budgets: BudgetCategory[];
}

export const TransactionEditor: React.FC<TransactionEditorProps> = ({ isOpen, onClose, onSave, onDelete, transaction, properties, budgets }) => {
  const [formData, setFormData] = useState<Transaction | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [applyToVendor, setApplyToVendor] = useState(true);

  useEffect(() => {
    if (transaction) {
      setFormData({ ...transaction });
    }
  }, [transaction]);

  const suggestedCategories = useMemo(() => {
    if (!formData) return [];
    // Get unique categories from the user's budget plan for this ledger type
    return (budgets || [])
      .filter(b => b.ledger_type === formData.type)
      .map(b => b.category);
  }, [formData?.type, budgets]);

  if (!isOpen || !formData) return null;

  const handleSave = async () => {
    if (!formData) return;
    setIsSaving(true);
    try {
      await onSave(formData, applyToVendor);
      onClose();
    } catch (error) {
      console.error("Failed to save transaction:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (formData && window.confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
        setIsDeleting(true);
        try {
            await onDelete(formData.id);
            onClose();
        } catch (error) {
            console.error("Failed to delete transaction:", error);
        } finally {
            setIsDeleting(false);
        }
    }
  };
  
  const handleChange = (field: keyof Transaction, value: any) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
  };
  
  const handleLedgerTypeChange = (type: LedgerType) => {
    setFormData(prev => {
        if (!prev) return null;
        const newTaxForm = type === 'active' ? 't2125' : type === 'passive' ? 't776' : undefined;
        return {
            ...prev,
            type: type,
            taxForm: newTaxForm,
            propertyId: type === 'passive' ? (prev.propertyId || (properties.length > 0 ? properties[0].id : '')) : undefined
        }
    });
  };

  const amount = Math.abs(formData?.amount || 0); 

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/80 backdrop-blur-sm p-4 sm:p-6">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl p-6 border border-zinc-200 dark:border-white/10 animate-slide-up shadow-2xl transition-colors">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Review & Tag Entry</h3>
          <button onClick={onClose} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
            <X size={18} className="text-zinc-500 dark:text-zinc-400" />
          </button>
        </div>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto hide-scrollbar pr-2 pb-4">
            <div className="bg-zinc-50 dark:bg-zinc-800/30 p-4 rounded-2xl border border-zinc-200 dark:border-white/5">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Entry Summary</p>
                <div className="flex justify-between items-end">
                    <h4 className="text-xl font-black text-zinc-900 dark:text-white truncate max-w-[200px]">{formData.vendor}</h4>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white">${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
            </div>

            <div>
                 <label className="text-[10px] text-zinc-500 dark:text-zinc-400 ml-1 mb-2 block uppercase font-black tracking-widest">Select Ledger</label>
                 <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl border border-zinc-200 dark:border-white/10">
                    <button onClick={() => handleLedgerTypeChange('active')} className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${formData.type === 'active' ? 'bg-rose-500 text-white shadow-md' : 'text-zinc-500 hover:text-rose-500'}`}><Briefcase size={14}/> Active</button>
                    <button onClick={() => handleLedgerTypeChange('passive')} className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${formData.type === 'passive' ? 'bg-cyan-500 text-white shadow-md' : 'text-zinc-500 hover:text-cyan-500'}`}><Building size={14}/> Passive</button>
                    <button onClick={() => handleLedgerTypeChange('personal')} className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${formData.type === 'personal' ? 'bg-violet-500 text-white shadow-md' : 'text-zinc-500 hover:text-violet-500'}`}><User size={14}/> Personal</button>
                 </div>
            </div>

            <div className="space-y-3">
                <label className="text-[10px] text-zinc-500 dark:text-zinc-400 ml-1 mb-1 block uppercase font-black tracking-widest">Allocation Category</label>
                <div className="relative mb-3">
                    <Tag className="absolute left-4 top-3.5 text-zinc-400" size={16} />
                    <input 
                      type="text" 
                      value={formData.category || ''}
                      onChange={(e) => handleChange('category', e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-zinc-900 dark:text-white text-sm font-bold focus:outline-none focus:border-rose-500 transition-colors"
                      placeholder="Type category..."
                    />
                </div>

                {suggestedCategories.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-500 ml-1 uppercase font-black tracking-widest">Plan Categories</p>
                        <div className="flex flex-wrap gap-2">
                            {suggestedCategories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => handleChange('category', cat)}
                                    className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                                        formData.category?.toLowerCase().trim() === cat.toLowerCase().trim() 
                                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white shadow-md' 
                                        : 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800 border-transparent hover:border-zinc-300 dark:hover:border-zinc-700'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="p-3 bg-violet-500/5 border border-violet-500/20 rounded-2xl">
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={applyToVendor}
                        onChange={(e) => setApplyToVendor(e.target.checked)}
                        className="w-5 h-5 rounded-md border-zinc-300 dark:border-zinc-700 text-violet-500 focus:ring-violet-500/50"
                    />
                    <div>
                        <p className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight flex items-center gap-1.5">
                            <Sparkles size={12} className="text-violet-500" /> Auto-Tag Vendor
                        </p>
                        <p className="text-[10px] text-zinc-500 font-medium">Categorize all items from "{formData.vendor}"</p>
                    </div>
                </label>
            </div>
        </div>

        <div className="flex gap-4 mt-8 pt-4 border-t border-zinc-100 dark:border-white/5">
            <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-1/4 py-3.5 bg-rose-500/10 text-rose-500 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-rose-500/20 transition-all disabled:opacity-50 active:scale-95 border border-rose-500/20"
            >
                {isDeleting ? <div className="w-5 h-5 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin"></div> : <Trash2 size={20} />}
            </button>
            <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="w-3/4 py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-black font-black rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 active:scale-95 shadow-xl shadow-zinc-500/10"
            >
                {isSaving ? (
                    <div className="w-5 h-5 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin"></div>
                ) : (
                    <><Save size={20} /> Deploy Changes</>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};