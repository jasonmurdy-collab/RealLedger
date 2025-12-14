import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';
import { 
  LayoutDashboard, 
  PieChart, 
  ScanLine, 
  UserCircle, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Info,
  Landmark,
  Building2,
  Bell,
  LogOut,
  Wallet,
  RefreshCw,
  CheckCircle2,
  X,
  Lock,
  ChevronRight,
  Briefcase,
  Home
} from 'lucide-react';
import { LedgerType, Transaction, BudgetCategory, BankAccount, Property } from './types';
import { MOCK_TRANSACTIONS, MOCK_PROPERTIES, BUDGET_DATA, INITIAL_ACCOUNTS } from './constants';
import { MetricsCard } from './components/MetricsCard';
import { QuickCaptureDrawer } from './components/QuickCaptureDrawer';
import { AuthScreen } from './components/AuthScreen';
import { PropertyCard } from './components/PropertyCard';
import { PersonalBudgetCard } from './components/PersonalBudgetCard';
import { AnalyticsView } from './components/AnalyticsView';
import { ProfileView } from './components/ProfileView';
import { BudgetEditor } from './components/BudgetEditor';

type ViewType = 'home' | 'analytics' | 'profile';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ledgerMode, setLedgerMode] = useState<LedgerType>('active');
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Bank Modal States
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [bankStep, setBankStep] = useState<'list' | 'credentials' | 'usage' | 'success'>('list');
  const [selectedBank, setSelectedBank] = useState('');
  const [selectedUsage, setSelectedUsage] = useState<LedgerType>('active');
  
  // Data States - Initialized empty, to be filled from Supabase
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetData, setBudgetData] = useState<BudgetCategory[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  
  // Budget Modal
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchInitialData();
    }
  }, [session]);

  const fetchInitialData = async () => {
    // With Row Level Security (RLS) policies enabled on your Supabase tables,
    // these queries will automatically return only the data owned by the currently authenticated user.
    const [transactionsRes, accountsRes, budgetRes, propertiesRes] = await Promise.all([
        supabase.from('transactions').select('*'),
        supabase.from('accounts').select('*'),
        supabase.from('budget_categories').select('*'),
        supabase.from('properties').select('*'),
    ]);
    
    if (transactionsRes.data) setTransactions(transactionsRes.data);
    if (accountsRes.data) setAccounts(accountsRes.data);
    if (budgetRes.data) setBudgetData(budgetRes.data);
    if (propertiesRes.data) setProperties(propertiesRes.data);
  };
  
  const isAuthenticated = session !== null;

  // Derive colors based on mode
  let bgGradient = 'bg-rose-500';
  let indicatorPos = '4px';
  let shadowColor = 'rose';

  if (ledgerMode === 'passive') {
    bgGradient = 'bg-cyan-500';
    indicatorPos = '33.33%';
    shadowColor = 'cyan';
  } else if (ledgerMode === 'personal') {
    bgGradient = 'bg-violet-500';
    indicatorPos = '66.66%';
    shadowColor = 'violet';
  }

  // Bank Logic
  const bankBalance = 124500.00;
  const hstLiability = 14200.50; 
  const personalCash = 12500.00; 
  
  const displayCash = ledgerMode === 'personal' ? personalCash : (bankBalance - hstLiability);

  const currentTransactions = transactions.filter(t => t.type === ledgerMode);

  // Bank Sync Simulator
  const handleBankSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      // Create mock imported transactions
      const newTx: Transaction[] = [
        { id: `new-${Date.now()}`, date: '2023-10-26', vendor: 'Starbucks', amount: -6.45, type: 'personal', category: 'Food & Dining', status: 'pending' },
        { id: `new-${Date.now()+1}`, date: '2023-10-26', vendor: 'Staples', amount: -42.00, type: 'active', category: 'Supplies', taxForm: 't2125', status: 'pending' },
      ];
      
      // Add new account
      const newAccount: BankAccount = {
          id: `acc-${Date.now()}`,
          name: `${selectedBank} Chequing`,
          type: 'Chequing',
          mask: Math.floor(1000 + Math.random() * 9000).toString(),
          institution: selectedBank.split(' ')[0],
          defaultContext: selectedUsage
      };

      setTransactions(prev => [...newTx, ...prev]);
      setAccounts(prev => [...prev, newAccount]);
      setIsSyncing(false);
      setBankStep('success');
      
      setTimeout(() => {
          setIsBankModalOpen(false);
          setBankStep('list');
      }, 1500);

    }, 2000);
  };

  const handleAddTransaction = async (newTransaction: Omit<Transaction, 'id' | 'status'>) => {
    if (!session || !session.user) {
      console.error("User not authenticated. Cannot add transaction.");
      return;
    }

    const transactionWithUserId = {
      ...newTransaction,
      user_id: session.user.id, // Explicitly add the user_id
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert([transactionWithUserId])
      .select();

    if (data) {
      setTransactions(prev => [data[0], ...prev]);
    }
    if(error){
        console.error("Error adding transaction:", error);
    }
  };

  const openBankModal = () => {
      setBankStep('list');
      setIsBankModalOpen(true);
  };
  
  const handleSignOut = async () => {
      await supabase.auth.signOut();
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 font-sans pb-24 selection:bg-rose-500/30">
      
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-10 bg-[#09090b]/80 backdrop-blur-md border-b border-white/5 px-6 pt-12 pb-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-zinc-700 to-zinc-600 flex items-center justify-center font-bold text-white border border-white/10">
              RL
            </div>
            <span className="text-xl font-bold tracking-tight text-white">RealLedger</span>
          </div>
          <div className="flex gap-3">
             <button className="p-2 rounded-full bg-zinc-900 border border-white/5 relative">
                <Bell size={20} className="text-zinc-400" />
                {transactions.some(t => t.status === 'pending') && (
                    <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border border-black animate-pulse"></span>
                )}
             </button>
             <button onClick={handleSignOut} className="p-2 rounded-full bg-zinc-900 border border-white/5">
                <LogOut size={20} className="text-zinc-400" />
             </button>
          </div>
        </div>

        {/* 3-Way Context Switcher */}
        {currentView !== 'profile' && (
          <div className="bg-zinc-900 p-1 rounded-xl flex relative border border-white/5">
             <div 
               className={`absolute top-1 bottom-1 w-[calc(33.33%-4px)] rounded-lg transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${bgGradient} shadow-lg shadow-${shadowColor}-500/20`}
               style={{ left: indicatorPos }}
             />
             <button 
               onClick={() => setLedgerMode('active')}
               className={`flex-1 relative z-10 py-2.5 text-xs font-medium transition-colors duration-200 ${ledgerMode === 'active' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
             >
               Active <span className="text-[9px] opacity-70 block font-normal mt-0.5">Business</span>
             </button>
             <button 
               onClick={() => setLedgerMode('passive')}
               className={`flex-1 relative z-10 py-2.5 text-xs font-medium transition-colors duration-200 ${ledgerMode === 'passive' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
             >
               Passive <span className="text-[9px] opacity-70 block font-normal mt-0.5">Investing</span>
             </button>
             <button 
               onClick={() => setLedgerMode('personal')}
               className={`flex-1 relative z-10 py-2.5 text-xs font-medium transition-colors duration-200 ${ledgerMode === 'personal' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
             >
               Personal <span className="text-[9px] opacity-70 block font-normal mt-0.5">Lifestyle</span>
             </button>
          </div>
        )}
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="px-6 py-6 space-y-6">
        
        {/* --- HOME VIEW --- */}
        {currentView === 'home' && (
        <>
            <section className="relative overflow-hidden rounded-3xl bg-zinc-900 border border-white/5 p-6 shadow-2xl animate-slide-up">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                   <div>
                      <h2 className="text-zinc-400 text-sm font-medium uppercase tracking-wider flex items-center gap-1.5">
                         {ledgerMode === 'personal' ? 'Disposable Cash' : 'Net Liquid Cash'} 
                         <Info size={12} className="text-zinc-600" />
                      </h2>
                      <div className="text-4xl font-bold text-white mt-2 tracking-tight">
                        ${displayCash.toLocaleString()}
                      </div>
                   </div>
                   {/* Bank Feed Trigger */}
                   <button 
                     onClick={openBankModal}
                     className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors hover:bg-white/5 ${
                         ledgerMode === 'active' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                         ledgerMode === 'passive' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                         'bg-violet-500/10 text-violet-400 border-violet-500/20'
                     }`}
                   >
                     <Landmark size={12} /> Sync Bank
                   </button>
                </div>

                <div className="pt-6 border-t border-white/5 grid grid-cols-2 gap-6">
                   <div>
                      <p className="text-xs text-zinc-500 mb-1">Total Balance</p>
                      <p className="text-lg font-semibold text-zinc-300">${bankBalance.toLocaleString()}</p>
                   </div>
                   <div>
                      {ledgerMode === 'personal' ? (
                         <>
                            <p className="text-xs text-violet-400/80 mb-1 flex items-center gap-1">
                                Monthly Savings
                            </p>
                            <p className="text-lg font-semibold text-violet-400">+$1,250</p>
                         </>
                      ) : (
                         <>
                            <p className="text-xs text-rose-400/80 mb-1 flex items-center gap-1">
                                HST Liability <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            </p>
                            <p className="text-lg font-semibold text-rose-400">-${hstLiability.toLocaleString()}</p>
                         </>
                      )}
                   </div>
                </div>
              </div>
            </section>

            <MetricsCard mode={ledgerMode} />
            
            {/* Personal Mode: Budget Card */}
            {ledgerMode === 'personal' && budgetData.length > 0 && (
                <PersonalBudgetCard 
                    budgetData={budgetData} 
                    onEdit={() => setIsBudgetModalOpen(true)}
                />
            )}

            {/* Passive Mode Specific: Property Portfolio */}
            {ledgerMode === 'passive' && properties.length > 0 && (
                <div className="animate-slide-up">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Building2 size={18} className="text-cyan-500" /> Portfolio
                        </h3>
                    </div>
                    {properties.map(p => <PropertyCard key={p.id} property={p} />)}
                </div>
            )}

            {/* Transactions List */}
            <section className="animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Recent Activity</h3>
                <button className="text-xs text-zinc-500 hover:text-white transition-colors">View All</button>
            </div>
            
            <div className="space-y-3">
                {currentTransactions.length > 0 ? currentTransactions.map((tx) => (
                <div key={tx.id} className={`group flex items-center justify-between p-4 rounded-xl border transition-colors ${tx.status === 'pending' ? 'bg-zinc-900/80 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 'bg-zinc-900/50 border-white/5 hover:bg-zinc-800/50'}`}>
                    <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.amount > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-400'}`}>
                        {tx.amount > 0 ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="font-semibold text-white">{tx.vendor}</p>
                            {tx.status === 'pending' && <span className="text-[9px] bg-amber-500/20 text-amber-500 px-1 rounded uppercase tracking-wider font-bold">New</span>}
                        </div>
                        <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">{tx.category}</span>
                        {tx.isSplit && (
                            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
                            Split
                            </span>
                        )}
                        </div>
                    </div>
                    </div>
                    <div className="text-right">
                    <p className={`font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-white'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' })}
                    </p>
                    <p className="text-xs text-zinc-600">{tx.date}</p>
                    </div>
                </div>
                )) : (
                    <div className="text-center py-10 text-zinc-600">
                        No transactions found.
                    </div>
                )}
            </div>
            </section>
        </>
        )}

        {/* --- ANALYTICS VIEW --- */}
        {currentView === 'analytics' && <AnalyticsView mode={ledgerMode} />}

        {/* --- PROFILE VIEW --- */}
        {currentView === 'profile' && (
            <ProfileView 
                accounts={accounts} 
                onLogout={handleSignOut} 
                onConnectBank={openBankModal}
            />
        )}

      </main>

      {/* --- FLOATING ACTION --- */}
      {currentView === 'home' && (
        <div className="fixed bottom-24 right-6 z-30">
            <button 
            onClick={() => setIsDrawerOpen(true)}
            className="w-16 h-16 rounded-full bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.3)] flex items-center justify-center hover:scale-105 transition-transform active:scale-95"
            >
            <Plus size={32} strokeWidth={2.5} />
            </button>
        </div>
      )}

      {/* --- DRAWER --- */}
      <QuickCaptureDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        onAddTransaction={handleAddTransaction}
        properties={properties}
      />
      
      {/* --- BUDGET EDITOR --- */}
      <BudgetEditor 
        isOpen={isBudgetModalOpen} 
        onClose={() => setIsBudgetModalOpen(false)} 
        budgetData={budgetData} 
        onSave={setBudgetData}
      />

      {/* --- BANK MODAL (Refined) --- */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
            <div className="bg-zinc-900 w-full max-w-sm rounded-2xl p-6 border border-white/10 animate-slide-up relative overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">Connect Bank Feed</h3>
                    {bankStep === 'list' && (
                        <button onClick={() => setIsBankModalOpen(false)} className="p-1">
                            <X size={18} className="text-zinc-500" />
                        </button>
                    )}
                </div>
                
                {bankStep === 'list' && (
                     <div className="space-y-3 mb-4">
                        <p className="text-sm text-zinc-400 mb-2">Select your financial institution:</p>
                        {['TD Canada Trust', 'RBC Royal Bank', 'CIBC', 'Scotiabank'].map(bank => (
                            <button 
                                key={bank} 
                                onClick={() => { setSelectedBank(bank); setBankStep('credentials'); }} 
                                className="w-full text-left px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium flex justify-between items-center group transition-colors"
                            >
                                {bank}
                                <ChevronRight size={16} className="text-zinc-500 group-hover:text-white" />
                            </button>
                        ))}
                    </div>
                )}

                {bankStep === 'credentials' && (
                    <div className="space-y-4">
                        <div className="bg-zinc-800/50 p-4 rounded-xl border border-white/5 text-center mb-2">
                             <div className="w-12 h-12 rounded-full bg-white text-black font-bold text-xl flex items-center justify-center mx-auto mb-2">
                                {selectedBank.charAt(0)}
                             </div>
                             <p className="font-bold text-white">{selectedBank}</p>
                             <p className="text-xs text-zinc-500">Secure Connection via Plaid</p>
                        </div>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-zinc-400 ml-1">Client Card / Username</label>
                                <input type="text" className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500" />
                            </div>
                            <div>
                                <label className="text-xs text-zinc-400 ml-1">Password</label>
                                <input type="password" className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500" />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setBankStep('list')} className="flex-1 py-3 text-zinc-400 font-medium text-sm">Back</button>
                            <button onClick={() => setBankStep('usage')} className="flex-1 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200">
                                Verify
                            </button>
                        </div>
                         
                         <p className="text-[10px] text-zinc-500 text-center flex items-center justify-center gap-1 mt-2">
                            <Lock size={10} /> Bank-level 256-bit encryption
                         </p>
                    </div>
                )}

                {bankStep === 'usage' && (
                    <div className="space-y-4 animate-slide-up">
                         <h4 className="text-white font-bold text-center mb-2">Primary Usage</h4>
                         <p className="text-xs text-zinc-400 text-center mb-6">Select the default context for this account's transactions.</p>
                         
                         <div className="space-y-2">
                            <button onClick={() => setSelectedUsage('active')} className={`w-full p-4 rounded-xl border flex items-center justify-between ${selectedUsage === 'active' ? 'bg-rose-500/20 border-rose-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-400'}`}>
                                <div className="flex items-center gap-3">
                                    <Briefcase size={18} />
                                    <div className="text-left">
                                        <div className="font-bold text-sm">Active Business</div>
                                        <div className="text-[10px] opacity-70">Commission, Dues, Marketing</div>
                                    </div>
                                </div>
                                {selectedUsage === 'active' && <CheckCircle2 size={18} className="text-rose-500" />}
                            </button>

                            <button onClick={() => setSelectedUsage('passive')} className={`w-full p-4 rounded-xl border flex items-center justify-between ${selectedUsage === 'passive' ? 'bg-cyan-500/20 border-cyan-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-400'}`}>
                                <div className="flex items-center gap-3">
                                    <Building2 size={18} />
                                    <div className="text-left">
                                        <div className="font-bold text-sm">Passive Investing</div>
                                        <div className="text-[10px] opacity-70">Rent, Repairs, Mortgage</div>
                                    </div>
                                </div>
                                {selectedUsage === 'passive' && <CheckCircle2 size={18} className="text-cyan-500" />}
                            </button>

                            <button onClick={() => setSelectedUsage('personal')} className={`w-full p-4 rounded-xl border flex items-center justify-between ${selectedUsage === 'personal' ? 'bg-violet-500/20 border-violet-500 text-white' : 'bg-zinc-800 border-white/5 text-zinc-400'}`}>
                                <div className="flex items-center gap-3">
                                    <UserCircle size={18} />
                                    <div className="text-left">
                                        <div className="font-bold text-sm">Personal Lifestyle</div>
                                        <div className="text-[10px] opacity-70">Living Expenses, Leisure</div>
                                    </div>
                                </div>
                                {selectedUsage === 'personal' && <CheckCircle2 size={18} className="text-violet-500" />}
                            </button>
                         </div>

                         <button onClick={handleBankSync} className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 mt-4">
                                Complete Setup
                         </button>
                    </div>
                )}

                {bankStep === 'success' && (
                    <div className="py-8 flex flex-col items-center justify-center text-center animate-slide-up">
                        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 text-emerald-500">
                            <CheckCircle2 size={32} />
                        </div>
                        <h4 className="text-white font-bold text-lg mb-1">Connected!</h4>
                        <p className="text-zinc-500 text-sm">Transactions are syncing...</p>
                    </div>
                )}

                {isSyncing && bankStep !== 'success' && (
                    <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center z-20">
                         <RefreshCw size={48} className="text-rose-500 animate-spin mb-4" />
                        <h4 className="text-white font-bold mb-1">Verifying...</h4>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* --- BOTTOM NAVIGATION --- */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0e0e11]/90 backdrop-blur-xl border-t border-white/10 px-6 py-4 pb-8 z-20">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <NavIcon icon={<LayoutDashboard size={24} />} label="Home" active={currentView === 'home'} onClick={() => setCurrentView('home')} />
          <NavIcon icon={<PieChart size={24} />} label="Analytics" active={currentView === 'analytics'} onClick={() => setCurrentView('analytics')} />
          <div className="w-12"></div>
          <NavIcon icon={<ScanLine size={24} />} label="Scan" onClick={() => setIsDrawerOpen(true)} />
          <NavIcon icon={<UserCircle size={24} />} label="Profile" active={currentView === 'profile'} onClick={() => setCurrentView('profile')} />
        </div>
      </nav>
    </div>
  );
}

const NavIcon = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 ${active ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'} transition-colors`}>
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);