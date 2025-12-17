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
  Upload,
  FileText as InvoiceIcon,
  Edit2
} from 'lucide-react';
import { LedgerType, Transaction, BudgetCategory, BankAccount, Property, UserProfile, Notification, MileageLog, DraftTransaction } from './types';
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
import { TransactionEditor } from './components/TransactionEditor';
import { InvoiceView } from './components/InvoiceView';
import { ONTARIO_HST_RATE } from './constants';


type ViewType = 'home' | 'analytics' | 'mileage' | 'invoices' | 'profile';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ledgerMode, setLedgerMode] = useState<LedgerType>('active');
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  
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
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

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
        setBudgetData(data.map((b: any) => ({
            category: b.category, spent: b.spent, limit: b.limit, savingsGoal: b.savings_goal, user_id: b.user_id
        })));
    }
  };

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
    budgetData
      .filter(b => b.spent > b.limit)
      .forEach(b => newNotifications.push({ id: `budget-${b.category}`, type: 'budget_over', message: `Over Budget: ${b.category} (-$${(b.spent - b.limit).toFixed(0)})`, date: new Date(), relatedId: b.category }));
    const currentMonth = new Date().getMonth();
    if ([2, 5, 8, 11].includes(currentMonth)) {
         newNotifications.push({ id: 'hst-remit', type: 'hst_remittance', message: 'Quarterly HST Remittance due soon.', date: new Date() });
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
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('mileage_logs').select('*').order('date', { ascending: false }),
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
    if (accRes.data) setAccounts(accRes.data);
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
  };

  const handleAddTransaction = async (newTransactionData: Omit<Transaction, 'id' | 'status'> | Omit<Transaction, 'id' | 'status'>[]) => {
    const txsToInsert = Array.isArray(newTransactionData) ? newTransactionData : [newTransactionData];
    const dbReadyTxs = txsToInsert.map(tx => ({
        date: tx.date, vendor: tx.vendor, amount: tx.amount, type: tx.type, category: tx.category, tax_form: tx.taxForm,
        property_id: tx.propertyId, hst_included: tx.hstIncluded, hst_amount: tx.hstAmount, is_split: tx.isSplit, receipt_url: tx.receiptUrl
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
  
  if (!session) return <AuthScreen />;
  
  const bgGradient = theme === 'dark' ? 
    ledgerMode === 'active' ? 'from-rose-900/40' : ledgerMode === 'passive' ? 'from-cyan-900/40' : 'from-violet-900/40'
    : ledgerMode === 'active' ? 'from-rose-100' : ledgerMode === 'passive' ? 'from-cyan-100' : 'from-violet-100';

  return (
    <div className={`min-h-screen font-sans bg-zinc-100 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 transition-colors duration-300`}>
        <div className={`absolute inset-x-0 top-0 h-96 bg-gradient-to-b ${bgGradient} to-transparent transition-all duration-500`}></div>
        
        <div className="relative max-w-2xl mx-auto px-4 pb-32">
            <header className="pt-8 pb-6 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-700 flex items-center justify-center border border-white/10 shadow-lg">
                        <span className="text-sm font-bold text-white tracking-tighter">RL</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                            {currentView.charAt(0).toUpperCase() + currentView.slice(1)}
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsNotificationModalOpen(true)} className="relative p-2.5 bg-white/80 dark:bg-glass-200 backdrop-blur-md rounded-full border border-zinc-200 dark:border-white/10 shadow-sm">
                        <Bell size={16} className="text-zinc-600 dark:text-zinc-300"/>
                        {notifications.length > 0 && <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-zinc-100 dark:border-zinc-900"></div>}
                    </button>
                    <button onClick={fetchInitialData} className="p-2.5 bg-white/80 dark:bg-glass-200 backdrop-blur-md rounded-full border border-zinc-200 dark:border-white/10 shadow-sm">
                        <RefreshCw size={16} className="text-zinc-600 dark:text-zinc-300"/>
                    </button>
                </div>
            </header>
            
            {currentView === 'home' && (
                <main>
                    <div className="flex bg-white/50 dark:bg-glass-100 backdrop-blur-xl p-1.5 rounded-2xl mb-6 border border-zinc-200 dark:border-white/5 shadow-lg">
                        <TabButton label="Active" icon={<Briefcase size={16} />} isActive={ledgerMode === 'active'} onClick={() => setLedgerMode('active')} color="rose" />
                        <TabButton label="Passive" icon={<Building2 size={16} />} isActive={ledgerMode === 'passive'} onClick={() => setLedgerMode('passive')} color="cyan" />
                        <TabButton label="Personal" icon={<UserCircle size={16} />} isActive={ledgerMode === 'personal'} onClick={() => setLedgerMode('personal')} color="violet" />
                    </div>
                    <MetricsCard mode={ledgerMode} transactions={transactions} properties={properties} />

                    {ledgerMode === 'passive' && (
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="font-bold text-zinc-900 dark:text-white">Properties</h2>
                                <button onClick={() => setIsPropertyModalOpen(true)} className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold border transition-colors bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20"><Plus size={12} /> Add</button>
                            </div>
                            {properties.map(p => <PropertyCard key={p.id} property={p} transactions={transactions} />)}
                        </div>
                    )}
                    {ledgerMode === 'personal' && <PersonalBudgetCard budgetData={budgetData} onEdit={() => setIsBudgetModalOpen(true)} />}
                    {ledgerMode !== 'personal' && (
                         <div>
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="font-bold text-zinc-900 dark:text-white">Recent Transactions</h2>
                                <button onClick={() => setIsStatementModalOpen(true)} className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold border transition-colors bg-zinc-200/50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 border-zinc-300/50 dark:border-white/10 hover:bg-zinc-200 dark:hover:bg-zinc-700/50"><Upload size={12} /> Import</button>
                            </div>
                            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-2xl p-2 space-y-1 shadow-sm">
                                {transactions.filter(t => t.type === ledgerMode).slice(0, 5).map(tx => <TransactionItem key={tx.id} tx={tx} onEdit={() => setEditingTransaction(tx)} />)}
                            </div>
                         </div>
                    )}
                </main>
            )}
            {currentView === 'analytics' && <AnalyticsView mode={ledgerMode} transactions={transactions} />}
            {currentView === 'mileage' && <MileageView logs={mileageLogs} onAddTrip={() => setIsMileageModalOpen(true)} />}
            {currentView === 'invoices' && <InvoiceView />}
            {currentView === 'profile' && <ProfileView profile={userProfile} accounts={accounts} onLogout={() => supabase.auth.signOut()} onConnectBank={() => {}} onUpdateProfile={handleUpdateProfile} onUploadAvatar={handleAvatarUpload} onDeleteAccount={async () => {}} theme={theme} onToggleTheme={toggleTheme} transactions={transactions} />}
        </div>

        <QuickCaptureDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} onAddTransaction={handleAddTransaction} properties={properties} />
        <PropertyEditor isOpen={isPropertyModalOpen} onClose={() => setIsPropertyModalOpen(false)} onSave={async (p) => { await supabase.from('properties').insert({...p, purchase_price:p.purchasePrice, current_value: p.currentValue, cca_class: p.ccaClass, opening_ucc: p.openingUcc, tenant_name: p.tenantName, lease_end: p.leaseEnd, mortgage_balance: p.mortgageBalance}); fetchInitialData(); }} />
        <BudgetEditor isOpen={isBudgetModalOpen} onClose={() => setIsBudgetModalOpen(false)} budgetData={budgetData} onSave={async (b) => { await supabase.from('budget_categories').delete().neq('user_id', '0'); await supabase.from('budget_categories').insert(b.map(i => ({...i, savings_goal: i.savingsGoal}))); fetchBudgets(); }} />
        <MileageEditor isOpen={isMileageModalOpen} onClose={() => setIsMileageModalOpen(false)} onSave={async (log) => { await supabase.from('mileage_logs').insert(log); fetchInitialData(); }} />
        <NotificationModal isOpen={isNotificationModalOpen} onClose={() => setIsNotificationModalOpen(false)} notifications={notifications} />
        <BankStatementUpload isOpen={isStatementModalOpen} onClose={() => setIsStatementModalOpen(false)} onImport={handleAddTransaction} properties={properties} currentMode={ledgerMode} />
        <TransactionEditor isOpen={!!editingTransaction} onClose={() => setEditingTransaction(null)} transaction={editingTransaction} onSave={handleUpdateTransaction} onDelete={handleDeleteTransaction} properties={properties} />

        <div className="fixed bottom-0 left-0 right-0 z-40 max-w-2xl mx-auto p-4">
            <div className="bg-zinc-900/80 backdrop-blur-xl rounded-full flex items-center justify-around p-2 border border-white/10 shadow-2xl shadow-black/40">
                <NavButton icon={<LayoutDashboard size={24} />} label="Home" isActive={currentView === 'home'} onClick={() => setCurrentView('home')} />
                <NavButton icon={<PieChart size={24} />} label="Analytics" isActive={currentView === 'analytics'} onClick={() => setCurrentView('analytics')} />
                <NavButton icon={<Car size={24} />} label="Mileage" isActive={currentView === 'mileage'} onClick={() => setCurrentView('mileage')} />
                <div className="relative">
                    <button onClick={() => setIsDrawerOpen(true)} className="w-16 h-12 bg-white rounded-full flex items-center justify-center text-black shadow-lg shadow-rose-500/20 -translate-y-4 ring-4 ring-zinc-900">
                        <Plus size={28} />
                    </button>
                </div>
                <NavButton icon={<InvoiceIcon size={24} />} label="Invoices" isActive={currentView === 'invoices'} onClick={() => setCurrentView('invoices')} />
                <NavButton icon={<UserCircle size={24} />} label="Profile" isActive={currentView === 'profile'} onClick={() => setCurrentView('profile')} />
            </div>
        </div>
    </div>
  );
}

const TabButton = ({ label, icon, isActive, onClick, color }: { label: string, icon: React.ReactNode, isActive: boolean, onClick: () => void, color: string }) => (
    <button onClick={onClick} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${isActive ? `bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-md` : `text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white`}`}>
        <span className={`${isActive ? `text-${color}-500` : ''}`}>{icon}</span>
        {label}
    </button>
);

const NavButton = ({ label, icon, isActive, onClick }: { label: string, icon: React.ReactNode, isActive: boolean, onClick: () => void }) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-16 h-12 transition-colors rounded-full ${isActive ? 'text-white' : 'text-zinc-500 hover:text-white'}`}>
        {icon}
        <span className="text-[10px] font-bold mt-1">{label}</span>
    </button>
);

// FIX: Refactored TransactionItem to use a named interface for props, resolving a TypeScript error with the 'key' prop.
interface TransactionItemProps {
  tx: Transaction;
  onEdit: () => void;
}

const TransactionItem = ({ tx, onEdit }: TransactionItemProps) => {
    const isIncome = tx.amount > 0;
    return (
        <div className="flex items-center gap-3 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isIncome ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                {isIncome ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
            </div>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-zinc-900 dark:text-white">{tx.vendor}</p>
                    <button onClick={onEdit} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors">
                        <Edit2 size={12} />
                    </button>
                </div>
                <p className="text-xs text-zinc-500">{tx.category}</p>
            </div>
            <div className="text-right">
                <p className={`font-bold text-sm ${isIncome ? 'text-emerald-500' : 'text-zinc-900 dark:text-white'}`}>
                    {isIncome ? '+' : ''}${Math.abs(tx.amount).toLocaleString()}
                </p>
                <p className="text-xs text-zinc-400">{new Date(tx.date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</p>
            </div>
        </div>
    );
};
