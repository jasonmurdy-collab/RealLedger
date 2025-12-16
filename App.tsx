import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';
import { 
  LayoutDashboard, 
  PieChart, 
  UserCircle, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Info,
  Landmark,
  Building2,
  Bell,
  LogOut,
  RefreshCw,
  CheckCircle2,
  X,
  Lock,
  ChevronRight,
  Briefcase,
  Car,
  Sun,
  Moon,
  Upload
} from 'lucide-react';
import { LedgerType, Transaction, BudgetCategory, BankAccount, Property, UserProfile, Notification, MileageLog } from './types';
import { MetricsCard } from './components/MetricsCard';
import { QuickCaptureDrawer } from './components/QuickCaptureDrawer';
import { AuthScreen } from './components/AuthScreen';
import { PropertyCard } from './components/PropertyCard'; 
import { PropertyEditor } from './components/PropertyEditor';
import { PersonalBudgetCard } from './components/PersonalBudgetCard';
import { AnalyticsView } from './components/AnalyticsView';
import { ProfileView } from './components/ProfileView';
import { BudgetEditor } from './components/BudgetEditor';
import { MileageView } from './components/MileageView';
import { MileageEditor } from './components/MileageEditor';
import { NotificationModal } from './components/NotificationModal';
import { BankStatementUpload } from './components/BankStatementUpload';

type ViewType = 'home' | 'analytics' | 'mileage' | 'profile';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ledgerMode, setLedgerMode] = useState<LedgerType>('active');
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  // Bank Modal States
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false); // New State
  const [isSyncing, setIsSyncing] = useState(false);
  const [bankStep, setBankStep] = useState<'list' | 'credentials' | 'usage' | 'success'>('list');
  const [selectedBank, setSelectedBank] = useState('');
  const [selectedUsage, setSelectedUsage] = useState<LedgerType>('active');
  
  // Data States
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetData, setBudgetData] = useState<BudgetCategory[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [mileageLogs, setMileageLogs] = useState<MileageLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Modals
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [isMileageModalOpen, setIsMileageModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
      setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const fetchBudgets = async () => {
    if (!session?.user) return;
    const { data, error } = await supabase.from('budget_categories').select('*');
    if (error) console.error("Error fetching budget categories:", error);
    if (data) {
        // Map snake_case to camelCase
        setBudgetData(data.map((b: any) => ({
            category: b.category,
            spent: b.spent,
            limit: b.limit,
            savingsGoal: b.savings_goal,
            user_id: b.user_id
        })));
    }
  };

  useEffect(() => {
    if (session) {
      fetchInitialData();
    }
  }, [session]);

  useEffect(() => {
    // Generate notifications
    const newNotifications: Notification[] = [];
    
    // 1. Pending Transactions
    transactions
      .filter(t => t.status === 'pending')
      .forEach(t => newNotifications.push({
          id: `tx-${t.id}`,
          type: 'pending_tx',
          message: `Review: ${t.vendor} ($${Math.abs(t.amount)})`,
          date: new Date(t.date),
          relatedId: t.id
      }));

    // 2. Budget Overruns
    budgetData
      .filter(b => b.spent > b.limit)
      .forEach(b => newNotifications.push({
          id: `budget-${b.category}`,
          type: 'budget_over',
          message: `Over Budget: ${b.category} (-$${(b.spent - b.limit).toFixed(0)})`,
          date: new Date(),
          relatedId: b.category
      }));
      
    // 3. HST Check (Simplified Phase 2 Logic)
    const currentMonth = new Date().getMonth();
    // Assuming quarterly remittance, check if it's end of Q (Mar, Jun, Sep, Dec)
    if ([2, 5, 8, 11].includes(currentMonth)) {
         newNotifications.push({
            id: 'hst-remit',
            type: 'hst_remittance',
            message: 'Quarterly HST Remittance due soon.',
            date: new Date()
         });
    }
    
    setNotifications(newNotifications.sort((a, b) => b.date.getTime() - a.date.getTime()));

  }, [transactions, budgetData]);


  const fetchInitialData = async () => {
    if (!session?.user) return;
    const { user } = session;

    const [txRes, accRes, propRes, profRes, mileRes] = await Promise.all([
        supabase.from('transactions').select('*').order('date', { ascending: false }),
        supabase.from('accounts').select('*'),
        supabase.from('properties').select('*'),
        supabase.from('profiles').select('*, avatar_url').eq('id', user.id).single(),
        supabase.from('mileage_logs').select('*').order('date', { ascending: false }),
    ]);
    
    // Fetch budgets separately to ensure consistency after saving
    await fetchBudgets();

    if (txRes.data) {
        // Map DB snake_case to App camelCase
        const mappedTxs: Transaction[] = txRes.data.map((d: any) => ({
            id: d.id,
            date: d.date,
            vendor: d.vendor,
            amount: d.amount,
            type: d.type,
            category: d.category,
            taxForm: d.tax_form,
            status: d.status,
            // is_split likely missing from schema, default to false
            isSplit: d.is_split || false,
            // Removed hst_included and hst_amount from map since they aren't in DB yet
            hstIncluded: false, 
            hstAmount: 0,
            // property_id likely missing from schema, default undefined
            propertyId: d.property_id,
            receiptUrl: d.receipt_url,
            user_id: d.user_id
        }));
        setTransactions(mappedTxs);
    }
    if (accRes.data) setAccounts(accRes.data);
    if (propRes.data) {
        const mappedProps: Property[] = propRes.data.map((p: any) => ({
            id: p.id,
            address: p.address,
            purchasePrice: p.purchase_price,
            currentValue: p.current_value,
            ccaClass: p.cca_class,
            openingUcc: p.opening_ucc,
            additions: p.additions,
            tenantName: p.tenant_name,
            leaseEnd: p.lease_end,
            user_id: p.user_id,
            mortgageBalance: p.mortgage_balance
        }));
        setProperties(mappedProps);
    }
    if (mileRes.data) setMileageLogs(mileRes.data);
    if (profRes.data) setUserProfile(profRes.data);
    else setUserProfile({ id: user.id, full_name: '', role: 'Real Estate Professional', avatar_url: '' });
  };
  
  const isAuthenticated = session !== null;
  
  // Theme-aware Gradient logic
  let bgGradient = 'bg-rose-500', indicatorPos = '4px', shadowColor = 'rose';
  if (ledgerMode === 'passive') { bgGradient = 'bg-cyan-500'; indicatorPos = '33.33%'; shadowColor = 'cyan'; }
  if (ledgerMode === 'personal') { bgGradient = 'bg-violet-500'; indicatorPos = '66.66%'; shadowColor = 'violet'; }

  const bankBalance = transactions.reduce((acc, t) => acc + t.amount, 0);
  const activeIncome = transactions.filter(t => t.type === 'active' && t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
  const hstLiability = activeIncome * 0.13;
  const personalCash = transactions.filter(t => t.type === 'personal').reduce((acc, t) => acc + t.amount, 0);
  const displayCash = ledgerMode === 'personal' ? personalCash : (bankBalance - hstLiability);
  const currentTransactions = transactions.filter(t => t.type === ledgerMode);

  // --- ACTIONS ---

const handleBankSync = async () => {
    if (!session?.user || !selectedBank) return;
    setIsSyncing(true);
    await new Promise(resolve => setTimeout(resolve, 2000)); 

    const newAccount: BankAccount = {
      id: `bank-${Date.now()}`,
      name: `${selectedBank} Checking`,
      type: 'Checking',
      mask: Math.floor(1000 + Math.random() * 9000).toString(),
      institution: selectedBank,
      defaultContext: selectedUsage,
      user_id: session.user.id,
    };

    const { error } = await supabase.from('accounts').insert([newAccount]);
    
    if (error) {
        console.error("Failed to link bank:", error);
        setIsSyncing(false);
        return;
    }

    setAccounts(prev => [...prev, newAccount]);
    setIsSyncing(false);
    setBankStep('success');

    setTimeout(() => {
        setIsBankModalOpen(false);
        setBankStep('list');
        setSelectedBank('');
        setSelectedUsage('active');
    }, 1500);
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!window.confirm("Are you sure you want to remove this account? This cannot be undone.")) return;
    const { error } = await supabase.from('accounts').delete().eq('id', accountId);
    if (error) {
        console.error("Failed to delete account:", error);
        throw new Error("Could not remove account.");
    }
    setAccounts(prev => prev.filter(acc => acc.id !== accountId));
  };

  const handleAddTransaction = async (txData: Omit<Transaction, 'id' | 'status'> | Omit<Transaction, 'id' | 'status'>[]) => {
    if (!session?.user) throw new Error("User not authenticated.");
    const txs = Array.isArray(txData) ? txData : [txData];
    
    // Map camelCase to snake_case for DB
    // Removing fields that are not in the DB schema to prevent errors
    const payload = txs.map(t => ({ 
        date: t.date,
        vendor: t.vendor,
        amount: t.amount,
        type: t.type,
        category: t.category,
        tax_form: t.taxForm,
        // The following fields are handled in the client state but not sent to DB
        // is_split: t.isSplit,
        // hst_included: t.hstIncluded,
        // hst_amount: t.hstAmount,
        // property_id: t.propertyId,
        // receipt_url: t.receiptUrl,
        user_id: session.user.id
    }));

    const { data, error } = await supabase.from('transactions').insert(payload).select();
    if (error) {
      console.error("Supabase Error adding transaction:", JSON.stringify(error, null, 2));
      throw new Error(`Failed to add transaction: ${error.message}`);
    }
    
    if (data) {
        // Map back to camelCase for State
        // Since DB doesn't store optional fields, we merge the returned ID with our original input for the UI state
        const mappedData: Transaction[] = data.map((d: any, index: number) => {
             // Try to match with input array by index (assuming order preserved) 
             // or fallback to find.
             const original = txs[index] || txs.find(t => t.vendor === d.vendor && t.amount === d.amount);
             
             return {
                id: d.id,
                date: d.date,
                vendor: d.vendor,
                amount: d.amount,
                type: d.type,
                category: d.category,
                taxForm: d.tax_form,
                status: d.status,
                isSplit: original?.isSplit || false,
                hstIncluded: original?.hstIncluded || false,
                hstAmount: original?.hstAmount || 0,
                propertyId: original?.propertyId || d.property_id,
                receiptUrl: original?.receiptUrl || d.receipt_url,
                user_id: d.user_id
             };
        });
        setTransactions(prev => [...mappedData, ...prev]);
    }
  };
  
  const handleAddMileageLog = async (log: Omit<MileageLog, 'id'>) => {
    if (!session?.user) throw new Error("User not authenticated.");
    const payload = { ...log, user_id: session.user.id };
    const { data, error } = await supabase.from('mileage_logs').insert([payload]).select();
    if (error) {
      console.error("Supabase Error: Failed to add mileage log:", error);
      throw new Error(error.message);
    }
    if(data) setMileageLogs(prev => [data[0], ...prev]);
  };

  const handleSaveBudget = async (newBudget: BudgetCategory[]) => {
      if (!session?.user) throw new Error("User not authenticated.");
      const { error: deleteError } = await supabase.from('budget_categories').delete().eq('user_id', session.user.id);
      if (deleteError) throw new Error("Failed to clear old budget. Changes aborted.");
      
      const payload = newBudget.map(b => ({
          user_id: session.user.id,
          category: b.category,
          spent: b.spent, 
          limit: b.limit,
          savings_goal: b.savingsGoal // Map to snake_case
      }));

      if (payload.length > 0) {
          const { error: insertError } = await supabase.from('budget_categories').insert(payload);
          if (insertError) throw new Error("Failed to save new budget categories.");
      }
      await fetchBudgets(); 
  };

  const handleAddProperty = async (newProp: Omit<Property, 'id'>) => {
      if (!session?.user) throw new Error("User not authenticated.");
      
      const payload = {
          address: newProp.address,
          purchase_price: newProp.purchasePrice,
          current_value: newProp.currentValue,
          cca_class: newProp.ccaClass,
          opening_ucc: newProp.openingUcc,
          additions: newProp.additions,
          tenant_name: newProp.tenantName,
          lease_end: newProp.leaseEnd,
          mortgage_balance: newProp.mortgageBalance,
          user_id: session.user.id
      };

      const { data, error } = await supabase.from('properties').insert([payload]).select();
      if (error) {
        console.error("Supabase Error: Failed to add property:", error);
        throw new Error("Failed to add property.");
      }
      if (data) {
          const mapped: Property = {
              id: data[0].id,
              address: data[0].address,
              purchasePrice: data[0].purchase_price,
              currentValue: data[0].current_value,
              ccaClass: data[0].cca_class,
              openingUcc: data[0].opening_ucc,
              additions: data[0].additions,
              tenantName: data[0].tenant_name,
              leaseEnd: data[0].lease_end,
              mortgageBalance: data[0].mortgage_balance,
              user_id: data[0].user_id
          };
          setProperties(prev => [...prev, mapped]);
      }
  };

  const handleUpdateProfile = async (profile: UserProfile) => {
      if (!session?.user) throw new Error("User not authenticated.");
      const { data, error } = await supabase.from('profiles').upsert({ ...profile, id: session.user.id }).select().single();
      if (error) throw new Error(`Profile update failed: ${error.message}`);
      if (data) setUserProfile(data);
  }

  const handleProfilePictureUpload = async (file: File) => {
    if (!session?.user) throw new Error("User not authenticated.");
    const filePath = `${session.user.id}/avatar.png`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { cacheControl: '3600', upsert: true });
    if (uploadError) throw new Error("Failed to upload avatar.");
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    await handleUpdateProfile({ ...userProfile!, avatar_url: `${data.publicUrl}?t=${new Date().getTime()}` });
  };
  
  if (!isAuthenticated) return <AuthScreen />;

  const ActiveView = () => {
      switch(currentView) {
          case 'home': return (
            <>
                <section className="relative overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 p-6 shadow-xl dark:shadow-2xl animate-slide-up transition-colors duration-300">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-100 dark:bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                          <h2 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium uppercase tracking-wider flex items-center gap-1.5">{ledgerMode === 'personal' ? 'Disposable Cash' : 'Net Liquid Cash'} <Info size={12} className="text-zinc-400 dark:text-zinc-600" /></h2>
                          <div className="text-4xl font-bold text-zinc-900 dark:text-white mt-2 tracking-tight">${displayCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setIsStatementModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors hover:bg-zinc-100 dark:hover:bg-white/5 bg-zinc-50 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/10">
                            <Upload size={12} /> Import Stmt
                        </button>
                        <button onClick={() => setIsBankModalOpen(true)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors hover:bg-zinc-100 dark:hover:bg-white/5 ${ledgerMode === 'active' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20' : ledgerMode === 'passive' ? 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/20' : 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/20'}`}><Landmark size={12} /> Sync Bank</button>
                      </div>
                    </div>
                    <div className="pt-6 border-t border-zinc-200 dark:border-white/5 grid grid-cols-2 gap-6">
                      <div><p className="text-xs text-zinc-500 mb-1">Total Balance</p><p className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">${bankBalance.toLocaleString()}</p></div>
                      <div>{ledgerMode === 'personal' ? (<><p className="text-xs text-violet-600/80 dark:text-violet-400/80 mb-1 flex items-center gap-1">Monthly Savings</p><p className="text-lg font-semibold text-violet-600 dark:text-violet-400">+$1,250</p></>) : (<><p className="text-xs text-rose-600/80 dark:text-rose-400/80 mb-1 flex items-center gap-1">HST Liability <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span></p><p className="text-lg font-semibold text-rose-600 dark:text-rose-400">-${hstLiability.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></>)}</div>
                    </div>
                  </div>
                </section>
                <MetricsCard mode={ledgerMode} transactions={transactions} properties={properties} />
                {ledgerMode === 'personal' && <PersonalBudgetCard budgetData={budgetData} onEdit={() => setIsBudgetModalOpen(true)} />}
                {ledgerMode === 'passive' && (
                    <div className="animate-slide-up">
                        <div className="flex justify-between items-center mb-3"><h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2"><Building2 size={18} className="text-cyan-500" /> Portfolio</h3><button onClick={() => setIsPropertyModalOpen(true)} className="p-1.5 rounded-full bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20 transition-colors"><Plus size={16} /></button></div>
                        {properties.length > 0 ? properties.map(p => <PropertyCard key={p.id} property={p} transactions={transactions} />) : (<div className="p-6 border border-zinc-200 dark:border-white/5 rounded-2xl bg-white dark:bg-zinc-900/50 text-center"><p className="text-zinc-500 text-sm">No properties yet.</p><button onClick={() => setIsPropertyModalOpen(true)} className="text-cyan-500 text-xs font-bold mt-2 hover:underline">Add Property</button></div>)}
                    </div>
                )}
                <section className="animate-slide-up" style={{ animationDelay: '100ms' }}>
                  <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold text-zinc-900 dark:text-white">Recent Activity</h3><button className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">View All</button></div>
                  <div className="space-y-3">
                      {currentTransactions.length > 0 ? currentTransactions.map(tx => (<div key={tx.id} className={`group flex items-center justify-between p-4 rounded-xl border transition-colors ${tx.status === 'pending' ? 'bg-zinc-50 dark:bg-zinc-900/80 border-rose-200 dark:border-rose-500/30 shadow-lg dark:shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 'bg-white dark:bg-zinc-900/50 border-zinc-100 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}><div className="flex items-center gap-4"><div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.amount > 0 ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}>{tx.amount > 0 ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}</div><div><div className="flex items-center gap-2"><p className="font-semibold text-zinc-900 dark:text-white">{tx.vendor}</p>{tx.status === 'pending' && <span className="text-[9px] bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-500 px-1 rounded uppercase tracking-wider font-bold">New</span>}</div><div className="flex items-center gap-2"><span className="text-xs text-zinc-500">{tx.category}</span>{tx.isSplit && (<span className="text-[10px] bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/30">Split</span>)}</div></div></div><div className="text-right"><p className={`font-bold ${tx.amount > 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'}`}>{tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' })}</p><p className="text-xs text-zinc-500 dark:text-zinc-600">{tx.date}</p></div></div>)) : (<div className="text-center py-10 text-zinc-600">No transactions found.</div>)}
                  </div>
                </section>
            </>
          );
          case 'analytics': return <AnalyticsView mode={ledgerMode} transactions={transactions} />;
          case 'mileage': return <MileageView logs={mileageLogs} onAddTrip={() => setIsMileageModalOpen(true)} />;
          case 'profile': return <ProfileView accounts={accounts} profile={userProfile} onLogout={() => supabase.auth.signOut()} onConnectBank={() => setIsBankModalOpen(true)} onUpdateProfile={handleUpdateProfile} onUploadAvatar={handleProfilePictureUpload} onDeleteAccount={handleDeleteAccount} theme={theme} onToggleTheme={toggleTheme} transactions={transactions} />;
          default: return null;
      }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-200 font-sans pb-24 selection:bg-rose-500/30 transition-colors duration-300">
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-200 dark:border-white/5 px-6 pt-12 pb-4 transition-colors duration-300">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-zinc-700 to-zinc-600 flex items-center justify-center font-bold text-white border border-white/10">RL</div><span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">RealLedger</span></div>
          <div className="flex gap-3">
             <button onClick={() => setIsNotificationModalOpen(true)} className="p-2 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 relative hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <Bell size={20} className="text-zinc-500 dark:text-zinc-400" />
                {notifications.length > 0 && (<span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900">{notifications.length}</span>)}
             </button>
             <button onClick={() => supabase.auth.signOut()} className="p-2 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><LogOut size={20} className="text-zinc-500 dark:text-zinc-400" /></button>
          </div>
        </div>
        {currentView !== 'profile' && (
          <div className="bg-white dark:bg-zinc-900 p-1 rounded-xl flex relative border border-zinc-200 dark:border-white/5 shadow-sm">
             <div className={`absolute top-1 bottom-1 w-[calc(33.33%-4px)] rounded-lg transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${bgGradient} shadow-lg shadow-${shadowColor}-500/20`} style={{ left: indicatorPos }} />
             <button onClick={() => setLedgerMode('active')} className={`flex-1 relative z-10 py-2.5 text-xs font-medium transition-colors duration-200 ${ledgerMode === 'active' ? 'text-white' : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>Active <span className="text-[9px] opacity-70 block font-normal mt-0.5">Business</span></button>
             <button onClick={() => setLedgerMode('passive')} className={`flex-1 relative z-10 py-2.5 text-xs font-medium transition-colors duration-200 ${ledgerMode === 'passive' ? 'text-white' : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>Passive <span className="text-[9px] opacity-70 block font-normal mt-0.5">Investing</span></button>
             <button onClick={() => setLedgerMode('personal')} className={`flex-1 relative z-10 py-2.5 text-xs font-medium transition-colors duration-200 ${ledgerMode === 'personal' ? 'text-white' : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>Personal <span className="text-[9px] opacity-70 block font-normal mt-0.5">Lifestyle</span></button>
          </div>
        )}
      </header>
      <main className="px-6 py-6 space-y-6"><ActiveView /></main>
      
      {currentView === 'home' && (<div className="fixed bottom-24 right-6 z-30"><button onClick={() => setIsDrawerOpen(true)} className="w-16 h-16 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black shadow-xl flex items-center justify-center hover:scale-105 transition-transform active:scale-95"><Plus size={32} strokeWidth={2.5} /></button></div>)}
      
      <QuickCaptureDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} onAddTransaction={handleAddTransaction} properties={properties} />
      <BudgetEditor isOpen={isBudgetModalOpen} onClose={() => setIsBudgetModalOpen(false)} budgetData={budgetData} onSave={handleSaveBudget} />
      <PropertyEditor isOpen={isPropertyModalOpen} onClose={() => setIsPropertyModalOpen(false)} onSave={handleAddProperty} />
      <MileageEditor isOpen={isMileageModalOpen} onClose={() => setIsMileageModalOpen(false)} onSave={handleAddMileageLog} />
      <NotificationModal isOpen={isNotificationModalOpen} onClose={() => setIsNotificationModalOpen(false)} notifications={notifications} />
      <BankStatementUpload isOpen={isStatementModalOpen} onClose={() => setIsStatementModalOpen(false)} onImport={handleAddTransaction} properties={properties} currentMode={ledgerMode} />

      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl p-6 border border-zinc-200 dark:border-white/10 animate-slide-up relative overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Connect Bank Feed</h3>
                    {bankStep === 'list' && (
                        <button onClick={() => setIsBankModalOpen(false)} className="p-1">
                            <X size={18} className="text-zinc-500" />
                        </button>
                    )}
                </div>
                {/* Simplified modal content for brevity, assume similar structure but updated classes */}
                 {bankStep === 'list' && (
                     <div className="space-y-3 mb-4">
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">Select your financial institution:</p>
                        {['TD Canada Trust', 'RBC Royal Bank', 'CIBC', 'Scotiabank'].map(bank => (
                            <button 
                                key={bank} 
                                onClick={() => { setSelectedBank(bank); setBankStep('credentials'); }} 
                                className="w-full text-left px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-medium flex justify-between items-center group transition-colors"
                            >
                                {bank}
                                <ChevronRight size={16} className="text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white" />
                            </button>
                        ))}
                    </div>
                )}
                 {/* ... other bank steps ... */}
            </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-[#0e0e11]/90 backdrop-blur-xl border-t border-zinc-200 dark:border-white/10 px-6 py-4 pb-8 z-20 transition-colors duration-300">
        <div className="flex justify-around items-center max-w-md mx-auto">
          <NavIcon icon={<LayoutDashboard size={24} />} label="Home" active={currentView === 'home'} onClick={() => setCurrentView('home')} />
          <NavIcon icon={<PieChart size={24} />} label="Analytics" active={currentView === 'analytics'} onClick={() => setCurrentView('analytics')} />
          <NavIcon icon={<Car size={24} />} label="Mileage" active={currentView === 'mileage'} onClick={() => setCurrentView('mileage')} />
          <NavIcon icon={<UserCircle size={24} />} label="Profile" active={currentView === 'profile'} onClick={() => setCurrentView('profile')} />
        </div>
      </nav>
    </div>
  );
}

const NavIcon = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 w-16 ${active ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400'} transition-colors`}>
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);