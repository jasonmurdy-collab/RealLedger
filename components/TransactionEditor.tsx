import React, { useState, useEffect } from 'react';
import { Transaction, Property, LedgerType } from '../types';
import { X, Save, Trash2, Briefcase, Building, User } from 'lucide-react';

interface TransactionEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTransaction: Transaction) => Promise<void>;
  onDelete: (transactionId: string) => Promise<void>;
  transaction: Transaction | null;
  properties: Property[];
}

export const TransactionEditor: React.FC<TransactionEditorProps> = ({ isOpen, onClose, onSave, onDelete, transaction, properties }) => {
  const [formData, setFormData] = useState<Transaction | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (transaction) {
      setFormData({ ...transaction });
    }
  }, [transaction]);

  if (!isOpen || !formData) return null;

  const handleSave = async () => {
    if (!formData) return;
    setIsSaving(true);
    try {
      await onSave(formData);
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

  const amount = Math.abs(formData.amount); 

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/80 backdrop-blur-sm p-4 sm:p-6">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl p-6 border border-zinc-200 dark:border-white/10 animate-slide-up shadow-2xl transition-colors">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Edit Transaction</h3>
          <button onClick={onClose} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
            <X size={18} className="text-zinc-500 dark:text-zinc-400" />
          </button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto hide-scrollbar pr-2">
            <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400 ml-1 mb-1 block uppercase font-bold tracking-widest">Date</label>
                <input 
                  type="date" 
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-rose-500 transition-colors"
                />
            </div>
             <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400 ml-1 mb-1 block uppercase font-bold tracking-widest">Vendor</label>
                <input 
                  type="text" 
                  value={formData.vendor}
                  onChange={(e) => handleChange('vendor', e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-rose-500 transition-colors"
                />
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs text-zinc-500 dark:text-zinc-400 ml-1 mb-1 block uppercase font-bold tracking-widest">Amount</label>
                    <input 
                      type="number" 
                      value={amount}
                      onChange={(e) => handleChange('amount', formData.amount >= 0 ? parseFloat(e.target.value) : -parseFloat(e.target.value))}
                      className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-rose-500 transition-colors"
                    />
                </div>
                <div>
                    <label className="text-xs text-zinc-500 dark:text-zinc-400 ml-1 mb-1 block uppercase font-bold tracking-widest">Category</label>
                    <input 
                      type="text" 
                      value={formData.category}
                      onChange={(e) => handleChange('category', e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-rose-500 transition-colors"
                    />
                </div>
             </div>
             <div>
                 <label className="text-xs text-zinc-500 dark:text-zinc-400 ml-1 mb-1 block uppercase font-bold tracking-widest">Ledger</label>
                 <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl border border-zinc-200 dark:border-white/10">
                    <button onClick={() => handleLedgerTypeChange('active')} className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${formData.type === 'active' ? 'bg-rose-500 text-white shadow-md' : 'text-zinc-500 hover:text-rose-500'}`}><Briefcase size={14}/> Active</button>
                    <button onClick={() => handleLedgerTypeChange('passive')} className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${formData.type === 'passive' ? 'bg-cyan-500 text-white shadow-md' : 'text-zinc-500 hover:text-cyan-500'}`}><Building size={14}/> Passive</button>
                    <button onClick={() => handleLedgerTypeChange('personal')} className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${formData.type === 'personal' ? 'bg-violet-500 text-white shadow-md' : 'text-zinc-500 hover:text-violet-500'}`}><User size={14}/> Personal</button>
                 </div>
             </div>
             {formData.type === 'passive' && properties.length > 0 && (
                <div className="animate-slide-up">
                    <label className="text-xs text-zinc-500 dark:text-zinc-400 ml-1 mb-1 block uppercase font-bold tracking-widest">Assign to Property</label>
                    <select
                        value={formData.propertyId || ''}
                        onChange={(e) => handleChange('propertyId', e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    >
                        {properties.map(p => <option key={p.id} value={p.id} className="bg-white dark:bg-zinc-900">{p.address}</option>)}
                    </select>
                </div>
             )}
             <div className="flex items-center justify-center py-2">
                 <label className="flex items-center gap-3 cursor-pointer text-sm text-zinc-600 dark:text-zinc-300 font-medium">
                    <input
                        type="checkbox"
                        checked={!!formData.hstIncluded}
                        onChange={(e) => handleChange('hstIncluded', e.target.checked)}
                        className="w-5 h-5 rounded border-zinc-300 dark:border-zinc-700 text-rose-500 focus:ring-rose-500/50"
                    />
                    Tax (HST) Included
                 </label>
             </div>
        </div>

        <div className="flex gap-4 mt-8">
            <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-1/4 py-3.5 bg-rose-500/10 text-rose-500 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-rose-500/20 transition-all disabled:opacity-50 active:scale-95 border border-rose-500/20"
            >
                {isDeleting ? <div className="w-5 h-5 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin"></div> : <Trash2 size={20} />}
            </button>
            <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="w-3/4 py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-black font-black rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-zinc-500/10"
            >
                {isSaving ? (
                    <div className="w-5 h-5 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin"></div>
                ) : (
                    <><Save size={20} /> Deploy Update</>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};