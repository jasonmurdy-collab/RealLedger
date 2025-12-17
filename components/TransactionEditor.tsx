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

  const amount = Math.abs(formData.amount); // Work with positive numbers for the input

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
      <div className="bg-zinc-900 w-full max-w-md rounded-2xl p-6 border border-white/10 animate-slide-up">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Edit Transaction</h3>
          <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700">
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto hide-scrollbar pr-2">
            <div>
                <label className="text-xs text-zinc-400 ml-1 mb-1 block">Date</label>
                <input 
                  type="date" 
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className="w-full bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition-colors"
                />
            </div>
             <div>
                <label className="text-xs text-zinc-400 ml-1 mb-1 block">Vendor</label>
                <input 
                  type="text" 
                  value={formData.vendor}
                  onChange={(e) => handleChange('vendor', e.target.value)}
                  className="w-full bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition-colors"
                />
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs text-zinc-400 ml-1 mb-1 block">Amount</label>
                    <input 
                      type="number" 
                      value={amount}
                      onChange={(e) => handleChange('amount', formData.amount >= 0 ? parseFloat(e.target.value) : -parseFloat(e.target.value))}
                      className="w-full bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition-colors"
                    />
                </div>
                <div>
                    <label className="text-xs text-zinc-400 ml-1 mb-1 block">Category</label>
                    <input 
                      type="text" 
                      value={formData.category}
                      onChange={(e) => handleChange('category', e.target.value)}
                      className="w-full bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition-colors"
                    />
                </div>
             </div>
             <div>
                 <label className="text-xs text-zinc-400 ml-1 mb-1 block">Ledger</label>
                 <div className="flex bg-zinc-800/50 p-1 rounded-xl border border-white/10">
                    <button onClick={() => handleLedgerTypeChange('active')} className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors ${formData.type === 'active' ? 'bg-rose-500 text-white' : 'text-zinc-400'}`}><Briefcase size={16}/> Active</button>
                    <button onClick={() => handleLedgerTypeChange('passive')} className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors ${formData.type === 'passive' ? 'bg-cyan-500 text-white' : 'text-zinc-400'}`}><Building size={16}/> Passive</button>
                    <button onClick={() => handleLedgerTypeChange('personal')} className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors ${formData.type === 'personal' ? 'bg-violet-500 text-white' : 'text-zinc-400'}`}><User size={16}/> Personal</button>
                 </div>
             </div>
             {formData.type === 'passive' && properties.length > 0 && (
                <div className="animate-slide-up">
                    <label className="text-xs text-zinc-400 ml-1 mb-1 block">Assign to Property</label>
                    <select
                        value={formData.propertyId || ''}
                        onChange={(e) => handleChange('propertyId', e.target.value)}
                        className="w-full bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    >
                        {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
                    </select>
                </div>
             )}
             <div className="flex items-center justify-center">
                 <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300">
                    <input
                        type="checkbox"
                        checked={!!formData.hstIncluded}
                        onChange={(e) => handleChange('hstIncluded', e.target.checked)}
                        className="w-4 h-4 rounded bg-zinc-700 border-zinc-500 text-emerald-500 focus:ring-emerald-500/50"
                    />
                    HST Included
                 </label>
             </div>
        </div>

        <div className="flex gap-4 mt-6">
            <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-1/3 py-3 bg-rose-500/10 text-rose-400 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-rose-500/20 transition-colors disabled:opacity-50"
            >
                {isDeleting ? <div className="w-5 h-5 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin"></div> : <Trash2 size={18} />}
            </button>
            <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="w-2/3 py-3 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
                {isSaving ? (
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                ) : (
                    <><Save size={18} /> Save Changes</>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};
