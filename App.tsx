import React, { useState, useEffect, useMemo } from 'react';
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
  Upload,
  FileText as InvoiceIcon,
  Edit2,
  Search,
  Filter,
  ListFilter
} from 'lucide-react';
import { LedgerType, Transaction, BudgetCategory, Property, UserProfile, Notification, MileageLog, DraftTransaction, Invoice } from './types';
import { MetricsCard } from './components/MetricsCard';
import { QuickCaptureDrawer } from './components/QuickCaptureDrawer';
import { AuthScreen } from './components/AuthScreen';
import { PropertyCard } from './components/PropertyCard'; 
import { PropertyEditor } from './components/PropertyEditor';
import { LedgerBudgetCard } from './components/PersonalBudgetCard';
import { AnalyticsView } from './components/AnalyticsView';
import { ExpensesView } from './components/ExpensesView';
import { ProfileView } from './components/ProfileView';
import { BudgetEditor } from './components/BudgetEditor';
import { MileageView } from './components/MileageView';
import { MileageEditor } from './components/MileageEditor';
import { NotificationModal } from './components/NotificationModal';
import { BankStatementUpload } from './components/BankStatementUpload';
import { TransactionEditor } from './components/TransactionEditor';
import { InvoiceView } from './components/InvoiceView';
import { InvoiceEditor } from './components/InvoiceEditor';
import { ONTARIO_HST_RATE } from './constants';


type ViewType = 'home' | 'analytics' | 'expenses' | 'mileage' | 'invoices' | 'profile';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ledgerMode, setLedgerMode] = useState<LedgerType>('active');
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  
  // Data States
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetSettings, setBudgetSettings] = useState<BudgetCategory[]>([]); 
  const [properties, setProperties] = useState<Property[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [mileageLogs, setMileageLogs] = useState<MileageLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  
  // Modals
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editingBudgetLedger, setEditingBudgetLedger] = useState<LedgerType>('personal');
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [isMileageModalOpen, setIsMileageModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | 'new' | null>(null);

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
        setBudgetSettings(data.map((b: any) => ({
            id: b.id,
            category: b.category, 
            spent: 0, 
            limit: b.limit, 
            savingsGoal: b.savings_goal, 
            user_id: b.user_id,
            ledger_type: b.ledger_type
        })));
    }
  };
  
  const calculatedBudgetsByLedger = useMemo(() => {
    const spendingMap: Record<LedgerType, Map<string, number>> = {
      active: new Map(),
      passive: new Map(),
      personal: new Map(),
    };
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    transactions
      .filter(t => 
          t.amount < 0 && 
          new Date(t.date).getMonth() === currentMonth &&
          new Date(t.date).getFullYear() === currentYear
      )
      .forEach(t => {
          const ledgerMap = spendingMap[t.type];
          const cat = t.category;
          const amt = Math.abs(t.amount);
          ledgerMap.set(cat, (ledgerMap.get(cat) || 0) + amt);
      });

    const result: Record<LedgerType, BudgetCategory[]> = {
      active: [],
      passive: [],
      personal: [],
    };
    
    budgetSettings.forEach(b => {
      const ledgerResult = result[b.ledger_type];
      if (ledgerResult) {
        ledgerResult.push({
          ...b,
          spent: spendingMap[b.ledger_type].get(b.category) || 0
        });
      }
    });

    return result;

  }, [transactions, budgetSettings]);

  useEffect(() => {
    if (session) {
      fetchInitialData();
    }
  }, [session]);

  useEffect(() => {
    const newNotifications: Notification[] = [];
    transactions
      .filter(t => t.status === 'pending')
      .forEach(t => newNotifications.push({ id: `tx-${t.id}`, type: 'pending_tx', message: `Review: ${t.vendor} ($${Math.abs(t.amount)})`, date: new Date(t.date), relatedId: t.id }));
    
    Object.values(calculatedBudgetsByLedger).flat()
      .filter((b: BudgetCategory) => b.limit > 0 && b.spent > b.limit)
      .forEach((b: BudgetCategory) => newNotifications.push({ id: `budget-${b.category}`, type: 'budget_over', message: `Over Budget: ${b.category} (-$${(b.spent - b.limit).toFixed(0)})`, date: new Date(), relatedId: b.category }));
      
    const currentMonth = new Date().getMonth();
    if ([2, 5, 8, 11].includes(currentMonth)) {
         newNotifications.push({ id: 'hst-remit', type: 'hst_remittance', message: 'Quarterly HST Remittance due soon.', date: new Date() });
    }
    setNotifications(newNotifications.sort((a, b) => b.date.getTime() - a.date.getTime()));
  }, [transactions, calculatedBudgetsByLedger]);


  const fetchInitialData = async () => {
    if (!session?.user) return;
    const { user } = session;

    const [txRes, propRes, profRes, mileRes, invRes] = await Promise.all([
        supabase.from('transactions').select('*').order('date', { ascending: false }),
        supabase.from('properties').select('*'),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('mileage_logs').select('*').order('date', { ascending: false }),
        supabase.from('invoices').select('*').order('invoice_date', { ascending: false }),
    ]);
    
    await fetchBudgets();

    if (txRes.data) {
        const mappedTxs: Transaction[] = txRes.data.map((d: any) => ({
            id: d.id, date: d.date, vendor: d.vendor, amount: d.amount, type: d.type, category: d.category,
            taxForm: d.tax_form, status: d.status, isSplit: d.is_split || false, hstIncluded: d.hst_included || false,
            hstAmount: d.hst_amount || 0, propertyId: d.property_id, receiptUrl: d.receipt_url, user_id: d.user_id, is_commission: d.is_commission
        }));
        setTransactions(mappedTxs);
    }
    if (propRes.data) {
        const mappedProps: Property[] = propRes.data.map((p: any) => ({
            id: p.id, address: p.address, purchasePrice: p.purchase_price, currentValue: p.current_value, ccaClass: p.cca_class,
            openingUcc: p.opening_ucc, additions: p.additions, tenantName: p.tenant_name, leaseEnd: p.lease_end, user_id: p.user_id, mortgageBalance: p.mortgage_balance
        }));
        setProperties(mappedProps);
    }
    if (mileRes.data) setMileageLogs(mileRes.data);
    if (profRes.data) setUserProfile(profRes.data);
    else setUserProfile({ id: user.id, full_name: '', role: 'Real Estate Professional', avatar_url: '' });
    if (invRes.data) setInvoices(invRes.data);
  };
  
  const handleSaveBudget = async (newBudgets: BudgetCategory[]) => {
    if (!session?.user) return;

    const newAndExistingIds = new Set(newBudgets.map(b => b.id).filter(Boolean));
    
    const originalIds = new Set(budgetSettings.map(b => b.id).filter(Boolean));
    const idsToDelete: string[] = [];
    originalIds.forEach(id => {
        if (id && !newAndExistingIds.has(id)) {
            idsToDelete.push(id);
        }
    });

    if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
            .from('budget_categories')
            .delete()
            .in('id', idsToDelete);
        
        if (deleteError) {
            console.error("Error deleting budget items:", deleteError);
            throw deleteError;
        }
    }

    const upsertPayload = newBudgets.map(b => ({
      id: b.id,
      category: b.category,
      limit: b.limit,
      savings_goal: b.savingsGoal ?? null,
      user_id: session.user.id,
      ledger_type: b.ledger_type,
    }));

    if (upsertPayload.length > 0) {
        const { error: upsertError } = await supabase.from('budget_categories').upsert(upsertPayload, { onConflict: 'id' });
        if (upsertError) {
          console.error("Error saving budget:", upsertError);
          throw upsertError;
        }
    }

    await fetchBudgets();
  };

  const handleAddTransaction = async (newTransactionData: Omit<Transaction, 'id' | 'status'> | Omit<Transaction, 'id' | 'status'>[]) => {
    const txsToInsert = Array.isArray(newTransactionData) ? newTransactionData : [newTransactionData];
    const dbReadyTxs = txsToInsert.map(tx => ({
        date: tx.date,
        // FIX: Cast to 'any' to handle potential 'unknown' type from dynamic sources.
        vendor: String(tx.vendor as any), 
        amount: tx.amount,
        type: tx.type,
        // FIX: Cast to 'any' to handle potential 'unknown' type from dynamic sources.
        category: String(tx.category as any), 
        tax_form: tx.taxForm,
        property_id: tx.propertyId,
        hst_included: tx.hstIncluded,
        hst_amount: tx.hstAmount,
        is_split: tx.isSplit,
        receipt_url: tx.receiptUrl,
        user_id: session?.user.id
    }));
    const { data, error } = await supabase.from('transactions').insert(dbReadyTxs).select();
    if (error) throw error;
    if (data) fetchInitialData();
  };

  const handleUpdateTransaction = async (updatedTx: Transaction) => {
    const { id, date, vendor, amount, type, category, taxForm, propertyId, hstIncluded } = updatedTx;
    const hstAmount = hstIncluded ? Math.abs(amount) - (Math.abs(amount) / (1 + ONTARIO_HST_RATE)) : 0;
    const { data, error } = await supabase
        .from('transactions')
        .update({ date, vendor, amount, type, category, tax_form: taxForm, property_id: propertyId, hst_included: hstIncluded, hst_amount: hstAmount })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    if (data) setTransactions(prev => prev.map(t => t.id === id ? { ...updatedTx, hstAmount } : t));
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
    if (error) throw error;
    setTransactions(prev => prev.filter(t => t.id !== transactionId));
  };
  
  const handleSaveInvoice = async (invoiceData: Omit<Invoice, 'id'> | Invoice) => {
    const { error } = await supabase.from('invoices').upsert({ ...invoiceData, user_id: session?.user.id });
    if (error) throw error;
    await fetchInitialData();
  };
  
  const handleDeleteInvoice = async (invoiceId: string) => {
     const { error } = await supabase.from('invoices').delete().eq('id', invoiceId);
     if (error) throw error;
     setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
  };

  const handleUpdateProfile = async (profileData: UserProfile) => {
    const { user } = session!;
    const { error } = await supabase.from('profiles').upsert({ ...profileData, id: user.id, updated_at: new Date() });
    if (error) throw error;
    setUserProfile(profileData);
  };

  const handleAvatarUpload = async (file: File) => {
    if (!session) return;
    const fileExt = file.name.split('.').pop();
    const fileName = `${session.user.id}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    await handleUpdateProfile({ ...userProfile!, avatar_url: `${data.publicUrl}?t=${new Date().getTime()}` });
  };
  
  const openBudgetEditor = (mode: LedgerType) => {
      setEditingBudgetLedger(mode);
      setIsBudgetModalOpen(true);
  };

  if (!session) return <AuthScreen />;
  
  const bgGradient = theme === 'dark' ? 
    ledgerMode === 'active' ? 'from-rose-900/20' : ledgerMode === 'passive' ? 'from-cyan-900/20' : 'from-violet-900/20'
    : ledgerMode === 'active' ? 'from-rose-500/10' : ledgerMode === 'passive' ? 'from-cyan-500/10' : 'from-violet-500/10';

  return (
    <div className={`min-h-screen font-sans bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 transition-colors duration-300 overflow-hidden flex`}>
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex w-64 flex-col border-r border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950/50 backdrop-blur-xl h-screen fixed left-0 top-0 z-50 transition-colors">
           <div className="p-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-gradient-to-tr dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center border border-zinc-200 dark:border-white/10 shadow-sm">
                  <span className="text-lg font-bold text-white tracking-tighter">RL</span>
              </div>
              <span className="font-bold text-lg text-zinc-900 dark:text-white">RealLedger</span>
           </div>
           
           <nav className="flex-1 px-4 space-y-2">
              <SidebarLink icon={<LayoutDashboard size={20} />} label="Home" isActive={currentView === 'home'} onClick={() => setCurrentView('home')} />
              <SidebarLink icon={<PieChart size={20} />} label="Analytics" isActive={currentView === 'analytics'} onClick={() => setCurrentView('analytics')} />
              <SidebarLink icon={<Search size={20} />} label="Expenses" isActive={currentView === 'expenses'} onClick={() => setCurrentView('expenses')} />
              <SidebarLink icon={<Car size={20} />} label="Mileage" isActive={currentView === 'mileage'} onClick={() => setCurrentView('mileage')} />
              <SidebarLink icon={<InvoiceIcon size={20} />} label="Invoices" isActive={currentView === 'invoices'} onClick={() => setCurrentView('invoices')} />
              <div className="h-px bg-zinc-200 dark:bg-white/5 my-4 mx-2" />
              <SidebarLink icon={<UserCircle size={20} />} label="Profile" isActive={currentView === 'profile'} onClick={() => setCurrentView('profile')} />
           </nav>

           <div className="p-4">
              <button onClick={() => setIsDrawerOpen(true)} className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg">
                  <Plus size={20} /> New Entry
              </button>
           </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-screen overflow-y-auto w-full lg:pl-64 transition-colors bg-zinc-50 dark:bg-zinc-950">
             <div className={`absolute inset-x-0 top-0 h-96 bg-gradient-to-b ${bgGradient} to-transparent transition-all duration-500 pointer-events-none`}></div>
             
             <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32 w-full">
                <header className="pt-8 pb-6 flex justify-between items-center lg:hidden">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-gradient-to-tr dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center border border-zinc-200 dark:border-white/10 shadow-sm">
                            <span className="text-sm font-bold text-white tracking-tighter">RL</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                                {currentView.charAt(0).toUpperCase() + currentView.slice(1)}
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsNotificationModalOpen(true)} className="relative p-2.5 bg-white dark:bg-zinc-800 backdrop-blur-md rounded-full border border-zinc-200 dark:border-white/10 shadow-sm">
                            <Bell size={16} className="text-zinc-600 dark:text-zinc-300"/>
                            {notifications.length > 0 && <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-zinc-900"></div>}
                        </button>
                        <button onClick={fetchInitialData} className="p-2.5 bg-white dark:bg-zinc-800 backdrop-blur-md rounded-full border border-zinc-200 dark:border-white/10 shadow-sm">
                            <RefreshCw size={16} className="text-zinc-600 dark:text-zinc-300"/>
                        </button>
                    </div>
                </header>

                {/* Desktop Header Actions */}
                <header className="hidden lg:flex justify-between items-center py-8">
                     <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
                        {currentView === 'home' ? `Welcome back, ${userProfile?.full_name?.split(' ')[0] || 'User'}` : currentView.charAt(0).toUpperCase() + currentView.slice(1)}
                     </h1>
                     <div className="flex items-center gap-3">
                         <button onClick={toggleTheme} className="p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm">
                            {theme === 'dark' ? <Sun size={20} className="text-zinc-400"/> : <Moon size={20} className="text-zinc-600"/>}
                         </button>
                         <button onClick={() => setIsNotificationModalOpen(true)} className="relative p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm">
                            <Bell size={20} className="text-zinc-600 dark:text-zinc-400"/>
                            {notifications.length > 0 && <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full"></div>}
                        </button>
                     </div>
                </header>
                
                {currentView === 'home' && (
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
                    </main>
                )}
                {currentView === 'analytics' && <AnalyticsView mode={ledgerMode} transactions={transactions} />}
                {currentView === 'expenses' && <ExpensesView transactions={transactions} properties={properties} onEditTransaction={(tx) => setEditingTransaction(tx)} />}
                {currentView === 'mileage' && <MileageView logs={mileageLogs} onAddTrip={() => setIsMileageModalOpen(true)} />}
                {currentView === 'invoices' && <InvoiceView invoices={invoices} onNewInvoice={() => setEditingInvoice('new')} onEditInvoice={(inv) => setEditingInvoice(inv)} />}
                {currentView === 'profile' && <ProfileView profile={userProfile} onLogout={() => supabase.auth.signOut()} onUpdateProfile={handleUpdateProfile} onUploadAvatar={handleAvatarUpload} theme={theme} onToggleTheme={toggleTheme} transactions={transactions} />}
             </div>
        </div>

        {isDrawerOpen && (
          <QuickCaptureDrawer 
            isOpen={true} 
            onClose={() => setIsDrawerOpen(false)} 
            onAddTransaction={handleAddTransaction} 
            properties={properties} 
            budgets={budgetSettings} 
          />
        )}
        {isPropertyModalOpen && (
          <PropertyEditor 
            isOpen={true} 
            onClose={() => setIsPropertyModalOpen(false)} 
            onSave={async (p) => { await supabase.from('properties').insert({...p, purchase_price:p.purchasePrice, current_value: p.currentValue, cca_class: p.ccaClass, opening_ucc: p.openingUcc, tenant_name: p.tenantName, lease_end: p.leaseEnd, mortgage_balance: p.mortgageBalance}); fetchInitialData(); }} 
          />
        )}
        {isBudgetModalOpen && (
          <BudgetEditor 
            isOpen={true} 
            onClose={() => setIsBudgetModalOpen(false)} 
            budgetData={budgetSettings} 
            onSave={handleSaveBudget}
            initialLedger={editingBudgetLedger}
          />
        )}
        {isMileageModalOpen && (
          <MileageEditor 
            isOpen={true} 
            onClose={() => setIsMileageModalOpen(false)} 
            onSave={async (log) => { await supabase.from('mileage_logs').insert(log); fetchInitialData(); }} 
          />
        )}
        <NotificationModal isOpen={isNotificationModalOpen} onClose={() => setIsNotificationModalOpen(false)} notifications={notifications} />
        <BankStatementUpload isOpen={isStatementModalOpen} onClose={() => setIsStatementModalOpen(false)} onImport={handleAddTransaction} properties={properties} currentMode={ledgerMode} />
        {editingTransaction && (
          <TransactionEditor 
            isOpen={true} 
            onClose={() => setEditingTransaction(null)} 
            transaction={editingTransaction} 
            onSave={handleUpdateTransaction} 
            onDelete={handleDeleteTransaction} 
            properties={properties} 
          />
        )}
        {editingInvoice && (
          <InvoiceEditor 
              isOpen={true} 
              onClose={() => setEditingInvoice(null)} 
              invoice={typeof editingInvoice === 'object' ? editingInvoice : null} 
              onSave={handleSaveInvoice}
              onDelete={handleDeleteInvoice}
              profile={userProfile}
          />
        )}

        {/* Mobile Bottom Nav */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 max-w-2xl mx-auto p-4">
            <div className="bg-zinc-900 dark:bg-zinc-900/80 backdrop-blur-xl rounded-full flex items-center justify-around p-2 border border-zinc-200/20 dark:border-white/10 shadow-2xl transition-colors">
                <NavButton icon={<LayoutDashboard size={24} />} label="Home" isActive={currentView === 'home'} onClick={() => setCurrentView('home')} />
                <NavButton icon={<PieChart size={24} />} label="Analytics" isActive={currentView === 'analytics'} onClick={() => setCurrentView('analytics')} />
                <NavButton icon={<Car size={24} />} label="Mileage" isActive={currentView === 'mileage'} onClick={() => setCurrentView('mileage')} />
                <div className="relative">
                    <button onClick={() => setIsDrawerOpen(true)} className="w-16 h-12 bg-white rounded-full flex items-center justify-center text-black shadow-lg shadow-rose-500/20 -translate-y-4 ring-4 ring-zinc-50 dark:ring-zinc-900 transition-all">
                        <Plus size={28} />
                    </button>
                </div>
                <NavButton icon={<Search size={24} />} label="Expenses" isActive={currentView === 'expenses'} onClick={() => setCurrentView('expenses')} />
                <NavButton icon={<InvoiceIcon size={24} />} label="Invoices" isActive={currentView === 'invoices'} onClick={() => setCurrentView('invoices')} />
                <NavButton icon={<UserCircle size={24} />} label="Profile" isActive={currentView === 'profile'} onClick={() => setCurrentView('profile')} />
            </div>
        </div>
    </div>
  );
}

const TabButton = ({ label, icon, isActive, onClick, color }: { label: string, icon: React.ReactNode, isActive: boolean, onClick: () => void, color: string }) => (
    <button onClick={onClick} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${isActive ? `bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-md` : `text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white`}`}>
        <span className={`${isActive ? (color === 'rose' ? 'text-rose-500' : color === 'cyan' ? 'text-cyan-500' : 'text-violet-500') : ''}`}>{icon}</span>
        {label}
    </button>
);

const NavButton = ({ label, icon, isActive, onClick }: { label: string, icon: React.ReactNode, isActive: boolean, onClick: () => void }) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-16 h-12 transition-colors rounded-full ${isActive ? 'text-white' : 'text-zinc-500 hover:text-white'}`}>
        {icon}
        <span className="text-[10px] font-bold mt-1">{label}</span>
    </button>
);

const SidebarLink = ({ label, icon, isActive, onClick }: { label: string, icon: React.ReactNode, isActive: boolean, onClick: () => void }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${isActive ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm border border-zinc-200 dark:border-white/5' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white border border-transparent'}`}>
        <span className={isActive ? 'text-rose-500' : ''}>{icon}</span>
        {label}
    </button>
);

interface TransactionItemProps {
  tx: Transaction;
  onEdit: () => void;
}

const TransactionItem: React.FC<TransactionItemProps> = ({ tx, onEdit }) => {
    const isIncome = tx.amount > 0;
    return (
        <div className="flex items-center gap-3 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded-lg group transition-colors">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isIncome ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                {isIncome ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
            </div>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-zinc-900 dark:text-white">{tx.vendor}</p>
                    <button onClick={onEdit} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                        <Edit2 size={12} />
                    </button>
                </div>
                <p className="text-xs text-zinc-500">{tx.category}</p>
            </div>
            <div className="text-right">
                <p className={`font-bold text-sm ${isIncome ? 'text-emerald-600 dark:text-emerald-500' : 'text-zinc-900 dark:text-white'}`}>
                    {isIncome ? '+' : ''}${Math.abs(tx.amount).toLocaleString()}
                </p>
                <p className="text-[10px] text-zinc-400 uppercase">{new Date(tx.date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</p>
            </div>
        </div>
    );
};