import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { MetricsCard } from './MetricsCard';
import { LedgerBudgetCard } from './PersonalBudgetCard';
import { PropertyCard } from './PropertyCard';
import { TransactionItem } from './TransactionItem';
import { BudgetEditor } from './BudgetEditor';
import { PropertyEditor } from './PropertyEditor';
import { Briefcase, Building2, UserCircle, Plus, Upload } from 'lucide-react';
import { LedgerType } from '../types';
import { supabase } from '../supabaseClient';

export const Dashboard: React.FC = () => {
  const { 
    ledgerMode, setLedgerMode, transactions, properties, calculatedBudgetsByLedger, 
    setIsStatementModalOpen, setEditingTransaction, budgetSettings, saveBudget, refreshData 
  } = useData();

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editingBudgetLedger, setEditingBudgetLedger] = useState<LedgerType>('personal');
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);

  const openBudgetEditor = (mode: LedgerType) => {
      setEditingBudgetLedger(mode);
      setIsBudgetModalOpen(true);
  };

  const handleSaveProperty = async (p: any) => {
     await supabase.from('properties').insert({
        ...p, purchase_price: p.purchasePrice, current_value: p.currentValue, cca_class: p.ccaClass, 
        opening_ucc: p.openingUcc, tenant_name: p.tenantName, lease_end: p.leaseEnd, mortgage_balance: p.mortgageBalance
     }); 
     refreshData();
  };

  return (
    <main className="space-y-6">
        <div className="flex bg-white dark:bg-zinc-900 backdrop-blur-xl p-1.5 rounded-2xl border border-zinc-200 dark:border-white/5 shadow-xl max-w-md">
            <TabButton label="Active" icon={<Briefcase size={16} />} isActive={ledgerMode === 'active'} onClick={() => setLedgerMode('active')} color="rose" />
            <TabButton label="Passive" icon={<Building2 size={16} />} isActive={ledgerMode === 'passive'} onClick={() => setLedgerMode('passive')} color="cyan" />
            <TabButton label="Personal" icon={<UserCircle size={16} />} isActive={ledgerMode === 'personal'} onClick={() => setLedgerMode('personal')} color="violet" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <MetricsCard mode={ledgerMode} transactions={transactions} properties={properties} />
                
                <LedgerBudgetCard mode={ledgerMode} budgetData={calculatedBudgetsByLedger[ledgerMode]} onEdit={openBudgetEditor} />
                
                {ledgerMode === 'passive' && (
                    <div className="animate-slide-up">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-zinc-900 dark:text-white">Properties</h2>
                            <button onClick={() => setIsPropertyModalOpen(true)} className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold border transition-colors bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20"><Plus size={12} /> Add</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {properties.map(p => <PropertyCard key={p.id} property={p} transactions={transactions} />)}
                        </div>
                    </div>
                )}
            </div>
            
            <div className="lg:col-span-1">
                <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 rounded-3xl p-4 h-full shadow-sm">
                  <div className="flex justify-between items-center mb-4 px-2">
                      <h2 className="font-bold text-zinc-900 dark:text-white text-sm">Recent Transactions</h2>
                      <button onClick={() => setIsStatementModalOpen(true)} className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold border transition-colors bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/10 hover:bg-zinc-200 dark:hover:bg-zinc-700"><Upload size={12} /> Import</button>
                  </div>
                  <div className="space-y-1">
                      {transactions.filter(t => t.type === ledgerMode).slice(0, 8).map(tx => <TransactionItem key={tx.id} tx={tx} onEdit={() => setEditingTransaction(tx)} />)}
                      {transactions.filter(t => t.type === ledgerMode).length === 0 && (
                          <div className="text-center py-12 text-zinc-400 text-sm">
                              No transactions found.
                          </div>
                      )}
                  </div>
                </div>
            </div>
        </div>

        {isBudgetModalOpen && (
          <BudgetEditor 
            isOpen={true} 
            onClose={() => setIsBudgetModalOpen(false)} 
            budgetData={budgetSettings} 
            onSave={saveBudget}
            initialLedger={editingBudgetLedger}
          />
        )}
        {isPropertyModalOpen && (
          <PropertyEditor 
            isOpen={true} 
            onClose={() => setIsPropertyModalOpen(false)} 
            onSave={handleSaveProperty} 
          />
        )}
    </main>
  );
};

const TabButton = ({ label, icon, isActive, onClick, color }: { label: string, icon: React.ReactNode, isActive: boolean, onClick: () => void, color: string }) => (
    <button onClick={onClick} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${isActive ? `bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-md` : `text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white`}`}>
        <span className={`${isActive ? (color === 'rose' ? 'text-rose-500' : color === 'cyan' ? 'text-cyan-500' : 'text-violet-500') : ''}`}>{icon}</span>
        {label}
    </button>
);