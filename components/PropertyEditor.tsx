import React, { useState } from 'react';
import { Property } from '../types';
import { X, Save, Home, DollarSign, Users, Calendar, TrendingUp } from 'lucide-react';

interface PropertyEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (property: Omit<Property, 'id'>) => Promise<void>;
}

export const PropertyEditor: React.FC<PropertyEditorProps> = ({ isOpen, onClose, onSave }) => {
  const [address, setAddress] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [leaseEnd, setLeaseEnd] = useState('');
  const [openingUcc, setOpeningUcc] = useState('');
  const [additions, setAdditions] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [mortgageBalance, setMortgageBalance] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await onSave({
        address,
        purchasePrice: parseFloat(purchasePrice) || 0,
        currentValue: parseFloat(currentValue) || 0,
        ccaClass: 1, 
        openingUcc: parseFloat(openingUcc) || (parseFloat(purchasePrice) * 0.9), // Fallback logic
        additions: parseFloat(additions) || 0,
        tenantName: tenantName || 'Vacant',
        leaseEnd: leaseEnd || '-',
        mortgageBalance: parseFloat(mortgageBalance) || 0,
      });
      onClose();
    } catch (error) {
      console.error("Failed to save property:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl p-6 border border-zinc-200 dark:border-white/10 animate-slide-up">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Home size={20} className="text-cyan-500" />
            Add Property
          </h3>
          <button onClick={onClose} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700">
            <X size={18} className="text-zinc-500" />
          </button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto hide-scrollbar pr-2">
          <div>
            <label className="text-xs text-zinc-500 ml-1 mb-1 block">Property Address</label>
            <input 
              type="text" 
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 123 Main St, Toronto"
              className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="text-xs text-zinc-500 ml-1 mb-1 block">Purchase Price</label>
                <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-3.5 text-zinc-500" />
                    <input 
                    type="number" 
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-white/10 rounded-xl pl-8 pr-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                </div>
             </div>
             <div>
                <label className="text-xs text-zinc-500 ml-1 mb-1 block">Current Value</label>
                <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-3.5 text-zinc-500" />
                    <input 
                    type="number" 
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-white/10 rounded-xl pl-8 pr-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                </div>
             </div>
          </div>
          
          <div className="border-t border-zinc-200 dark:border-white/5 pt-4">
              <h4 className="text-sm font-medium text-zinc-500 mb-3 flex items-center gap-2"><TrendingUp size={14}/> CCA Schedule (Tax)</h4>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs text-zinc-500 ml-1 mb-1 block">Opening UCC</label>
                    <input 
                    type="number" 
                    placeholder="Start of Year"
                    value={openingUcc}
                    onChange={(e) => setOpeningUcc(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                 </div>
                 <div>
                    <label className="text-xs text-zinc-500 ml-1 mb-1 block">Additions</label>
                    <input 
                    type="number" 
                    placeholder="Capital items"
                    value={additions}
                    onChange={(e) => setAdditions(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-white/10 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                 </div>
              </div>
              <p className="text-[10px] text-zinc-400 mt-2">Opening UCC + Additions will determine your Max Claimable CCA.</p>
          </div>

          <div className="border-t border-zinc-200 dark:border-white/5 pt-4">
             <h4 className="text-sm font-medium text-zinc-500 mb-3">Tenant Information</h4>
             <div className="space-y-4">
                <div>
                    <label className="text-xs text-zinc-500 ml-1 mb-1 block">Tenant Name</label>
                    <div className="relative">
                        <Users size={14} className="absolute left-3 top-3.5 text-zinc-500" />
                        <input 
                        type="text" 
                        value={tenantName}
                        onChange={(e) => setTenantName(e.target.value)}
                        placeholder="Leave blank if vacant"
                        className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-white/10 rounded-xl pl-8 pr-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-cyan-500 transition-colors"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-xs text-zinc-500 ml-1 mb-1 block">Lease End Date</label>
                    <div className="relative">
                        <Calendar size={14} className="absolute left-3 top-3.5 text-zinc-500" />
                        <input 
                        type="date" 
                        value={leaseEnd}
                        onChange={(e) => setLeaseEnd(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-white/10 rounded-xl pl-8 pr-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-cyan-500 transition-colors"
                        />
                    </div>
                </div>
             </div>
          </div>
        </div>

        <button 
            onClick={handleSubmit} 
            disabled={!address || !purchasePrice || isSaving}
            className="w-full mt-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
            {isSaving ? (
                 <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
            ) : (
                <><Save size={18} /> Add Property</>
            )}
        </button>
      </div>
    </div>
  );
};