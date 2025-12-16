import React, { useState } from 'react';
import { Property } from '../types';
import { X, Save, Home, DollarSign, Users, Calendar } from 'lucide-react';

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
        ccaClass: 1, // Default to Class 1 for Real Estate
        uccBalance: (parseFloat(purchasePrice) || 0) * 0.96, // Mock initial UCC
        tenantName: tenantName || 'Vacant',
        leaseEnd: leaseEnd || '-',
        mortgageBalance: parseFloat(mortgageBalance) || 0,
      });
      onClose();
    } catch (error) {
      console.error("Failed to save property:", error);
      // Optionally show a toast/error message to the user
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
      <div className="bg-zinc-900 w-full max-w-md rounded-2xl p-6 border border-white/10 animate-slide-up">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Home size={20} className="text-cyan-500" />
            Add Property
          </h3>
          <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700">
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-500 ml-1 mb-1 block">Property Address</label>
            <input 
              type="text" 
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 123 Main St, Toronto"
              className="w-full bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
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
                    className="w-full bg-zinc-800/50 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
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
                    className="w-full bg-zinc-800/50 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                </div>
             </div>
          </div>
          <div>
    <label className="text-xs text-zinc-500 ml-1 mb-1 block">Mortgage Balance</label>
    <div className="relative">
        <DollarSign size={14} className="absolute left-3 top-3.5 text-zinc-500" />
        <input 
        type="number" 
        value={mortgageBalance}
        onChange={(e) => setMortgageBalance(e.target.value)}
        className="w-full bg-zinc-800/50 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
        />
    </div>
</div>

          <div className="border-t border-white/5 pt-4">
             <h4 className="text-sm font-medium text-zinc-400 mb-3">Tenant Information</h4>
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
                        className="w-full bg-zinc-800/50 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
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
                        className="w-full bg-zinc-800/50 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                        />
                    </div>
                </div>
             </div>
          </div>
        </div>

        <button 
            onClick={handleSubmit} 
            disabled={!address || !purchasePrice || isSaving}
            className="w-full mt-6 py-3 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors disabled:opacity-50"
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