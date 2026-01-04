import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { Session } from '@supabase/supabase-js';
import { Transaction, BudgetCategory, Property, UserProfile, Notification, MileageLog, Invoice, LedgerType, MileageAnnualStats } from '../types';
import { ONTARIO_HST_RATE } from '../constants';

interface DataContextType {
  session: Session | null;
  ledgerMode: LedgerType;
  setLedgerMode: (mode: LedgerType) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  
  // Data
  transactions: Transaction[];
  budgetSettings: BudgetCategory[];
  properties: Property[];
  userProfile: UserProfile | null;
  mileageLogs: MileageLog[];
  mileageAnnualStats: MileageAnnualStats[];
  notifications: Notification[];
  invoices: Invoice[];
  calculatedBudgetsByLedger: Record<LedgerType, BudgetCategory[]>;
  
  // Actions
  refreshData: () => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id' | 'status'> | Omit<Transaction, 'id' | 'status'>[]) => Promise<void>;
  updateTransaction: (tx: Transaction, updateAllFromVendor?: boolean) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  saveBudget: (budgets: BudgetCategory[]) => Promise<void>;
  saveProperty: (prop: Omit<Property, 'id'>) => Promise<void>;
  saveMileage: (log: Omit<MileageLog, 'id'>) => Promise<void>;
  saveAnnualMileageStats: (stats: Omit<MileageAnnualStats, 'id'>) => Promise<void>;
  saveInvoice: (inv: Omit<Invoice, 'id'> | Invoice) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  updateProfile: (profile: UserProfile) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  logout: () => Promise<void>;

  // Global UI State (Modals)
  isDrawerOpen: boolean;
  setIsDrawerOpen: (v: boolean) => void;
  editingTransaction: Transaction | null;
  setEditingTransaction: (t: Transaction | null) => void;
  isStatementModalOpen: boolean;
  setIsStatementModalOpen: (v: boolean) => void;
  isNotificationModalOpen: boolean;
  setIsNotificationModalOpen: (v: boolean) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [ledgerMode, setLedgerMode] = useState<LedgerType>('active');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetSettings, setBudgetSettings] = useState<BudgetCategory[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [mileageLogs, setMileageLogs] = useState<MileageLog[]>([]);
  const [mileageAnnualStats, setMileageAnnualStats] = useState<MileageAnnualStats[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // UI State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  // Auth & Theme Init
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  // Fetch Data
  const fetchBudgets = async () => {
    if (!session?.user) return;
    const { data, error } = await supabase.from('budget_categories').select('*');
    if (error) throw error;
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

  const fetchInitialData = async () => {
    if (!session?.user) return;
    const { user } = session;

    const [txRes, propRes, profRes, mileRes, mileStatsRes, invRes] = await Promise.all([
        supabase.from('transactions').select('*').order('date', { ascending: false }),
        supabase.from('properties').select('*'),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('mileage_logs').select('*').order('date', { ascending: false }),
        supabase.from('mileage_annual_stats').select('*'),
        supabase.from('invoices').select('*').order('invoice_date', { ascending: false }),
    ]);
    
    await fetchBudgets();

    if (txRes.data) {
        setTransactions(txRes.data.map((d: any) => ({
            id: d.id, date: d.date, vendor: d.vendor, amount: d.amount, type: d.type, category: d.category,
            taxForm: d.tax_form, status: d.status, isSplit: d.is_split || false, hstIncluded: d.hst_included || false,
            hstAmount: d.hst_amount || 0, propertyId: d.property_id, receiptUrl: d.receipt_url, user_id: d.user_id, is_commission: d.is_commission
        })));
    }
    if (propRes.data) {
        setProperties(propRes.data.map((p: any) => ({
            id: p.id, address: p.address, purchasePrice: p.purchase_price, currentValue: p.current_value, ccaClass: p.cca_class,
            openingUcc: p.opening_ucc, additions: p.additions, tenantName: p.tenant_name, lease_end: p.lease_end, user_id: p.user_id, mortgageBalance: p.mortgage_balance
        })));
    }
    if (mileRes.data) setMileageLogs(mileRes.data);
    if (mileStatsRes.data) setMileageAnnualStats(mileStatsRes.data);
    if (profRes.data) setUserProfile(profRes.data);
    else setUserProfile({ id: user.id, full_name: '', role: 'Real Estate Professional', avatar_url: '' });
    if (invRes.data) setInvoices(invRes.data);
  };

  useEffect(() => {
    if (session) fetchInitialData();
  }, [session]);

  // Derived State: Budgets (Refined for exact matching and month-only tracking)
  const calculatedBudgetsByLedger = useMemo(() => {
    const spendingMap: Record<LedgerType, Map<string, number>> = {
      active: new Map(),
      passive: new Map(),
      personal: new Map(),
    };
    
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    transactions.forEach(t => {
        // Parse date reliably
        const tDate = new Date(t.date + 'T00:00:00'); 
        const tMonth = tDate.getMonth();
        const tYear = tDate.getFullYear();

        // Aggregation logic: Only expenses for the current month
        if (t.amount < 0 && tMonth === currentMonth && tYear === currentYear) {
            const map = spendingMap[t.type];
            // Normalize for matching
            const normalizedCat = (t.category || 'Uncategorized').toLowerCase().trim();
            map.set(normalizedCat, (map.get(normalizedCat) || 0) + Math.abs(t.amount));
        }
    });

    const result: Record<LedgerType, BudgetCategory[]> = { active: [], passive: [], personal: [] };
    
    budgetSettings.forEach(b => {
      const list = result[b.ledger_type];
      if (list) {
          const normalizedPlanCat = b.category.toLowerCase().trim();
          const actualSpent = spendingMap[b.ledger_type].get(normalizedPlanCat) || 0;
          list.push({ ...b, spent: actualSpent });
      }
    });
    
    return result;
  }, [transactions, budgetSettings]);

  // CRUD Actions
  const updateTransaction = async (updatedTx: Transaction, updateAllFromVendor: boolean = true) => {
    const hstAmount = updatedTx.hstIncluded ? Math.abs(updatedTx.amount) - (Math.abs(updatedTx.amount) / (1 + ONTARIO_HST_RATE)) : 0;
    
    // Update the single transaction
    const { error: singleError } = await supabase.from('transactions').update({ 
        date: updatedTx.date, vendor: updatedTx.vendor, amount: updatedTx.amount, type: updatedTx.type, 
        category: updatedTx.category, tax_form: updatedTx.taxForm, property_id: updatedTx.propertyId, 
        hst_included: updatedTx.hstIncluded, hst_amount: hstAmount 
    }).eq('id', updatedTx.id);
    
    if (singleError) throw singleError;

    // Vendor Propagation Logic: 
    // Update all other transactions with the same vendor name (case-insensitive) 
    // to have the same category and type.
    if (updateAllFromVendor) {
        const { error: bulkError } = await supabase.from('transactions')
            .update({ 
                category: updatedTx.category, 
                type: updatedTx.type,
                tax_form: updatedTx.taxForm
            })
            .ilike('vendor', updatedTx.vendor)
            .neq('id', updatedTx.id); // Don't re-update the one we just did
        
        if (bulkError) console.warn("Bulk vendor update had issues:", bulkError);
    }
    
    // Refresh local state
    await fetchInitialData();
  };

  const addTransaction = async (newTransactionData: Omit<Transaction, 'id' | 'status'> | Omit<Transaction, 'id' | 'status'>[]) => {
    if (!session?.user) throw new Error("User not authenticated");
    const txsToInsert = Array.isArray(newTransactionData) ? newTransactionData : [newTransactionData];
    const dbReadyTxs = txsToInsert.map(tx => ({
        date: tx.date, vendor: tx.vendor, amount: tx.amount, type: tx.type, category: tx.category, 
        tax_form: tx.taxForm, property_id: tx.propertyId, hst_included: tx.hstIncluded, 
        hst_amount: tx.hstAmount, is_split: tx.isSplit, receipt_url: tx.receiptUrl, user_id: session.user.id
    }));
    const { error } = await supabase.from('transactions').insert(dbReadyTxs);
    if (error) throw error;
    await fetchInitialData();
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const saveBudget = async (newBudgets: BudgetCategory[]) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error("You must be logged in to save budgets.");
    const userId = session.user.id;
    
    const incomingIds = new Set<string>(newBudgets.map(b => b.id).filter((id): id is string => !!id));
    const currentIds = new Set<string>(budgetSettings.map(b => b.id).filter((id): id is string => !!id));
    const idsToDelete = [...currentIds].filter(id => !incomingIds.has(id));

    if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase.from('budget_categories').delete().in('id', idsToDelete);
        if (deleteError) throw new Error(`Failed to delete removed categories: ${deleteError.message}`);
    }

    const updates = newBudgets.filter(b => !!b.id).map(b => ({
        id: b.id, category: b.category, limit: b.limit, savings_goal: b.savingsGoal ?? null,
        user_id: userId, ledger_type: b.ledger_type || 'active', 
    }));

    const inserts = newBudgets.filter(b => !b.id).map(b => ({
        category: b.category, limit: b.limit, savings_goal: b.savingsGoal ?? null,
        user_id: userId, ledger_type: b.ledger_type || 'active', 
    }));

    if (updates.length > 0) {
        const { error: updateError } = await supabase.from('budget_categories').upsert(updates);
        if (updateError) throw new Error(`Failed to update categories: ${updateError.message}`);
    }

    if (inserts.length > 0) {
        const { error: insertError } = await supabase.from('budget_categories').insert(inserts);
        if (insertError) throw new Error(`Failed to create new categories: ${insertError.message}`);
    }
    
    await fetchBudgets();
    await fetchInitialData(); // Trigger full recalculation
  };

  const saveProperty = async (p: Omit<Property, 'id'>) => {
    const { error } = await supabase.from('properties').insert({
        ...p, purchase_price: p.purchasePrice, current_value: p.currentValue, cca_class: p.ccaClass, 
        opening_ucc: p.openingUcc, tenant_name: p.tenantName, lease_end: p.leaseEnd, mortgage_balance: p.mortgageBalance, user_id: session?.user.id
    });
    if (error) throw error;
    await fetchInitialData();
  };

  const saveMileage = async (log: Omit<MileageLog, 'id'>) => {
    const { error } = await supabase.from('mileage_logs').insert({...log, user_id: session?.user.id});
    if (error) throw error;
    await fetchInitialData();
  };

  const saveAnnualMileageStats = async (stats: Omit<MileageAnnualStats, 'id'>) => {
    const { error } = await supabase.from('mileage_annual_stats').upsert({
      ...stats,
      user_id: session?.user.id
    }, { onConflict: 'user_id,year' });
    if (error) throw error;
    await fetchInitialData();
  };

  const saveInvoice = async (invoice: Omit<Invoice, 'id'> | Invoice) => {
    const { error } = await supabase.from('invoices').upsert({ ...invoice, user_id: session?.user.id });
    if (error) throw error;
    await fetchInitialData();
  };
  
  const deleteInvoice = async (id: string) => {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) throw error;
    setInvoices(prev => prev.filter(inv => inv.id !== id));
  };

  const updateProfile = async (profile: UserProfile) => {
    if (!session?.user) return;
    const { error } = await supabase.from('profiles').upsert({ ...profile, id: session.user.id, updated_at: new Date() });
    if (error) throw error;
    setUserProfile(profile);
  };

  const uploadAvatar = async (file: File) => {
    if (!session?.user) return;
    const fileExt = file.name.split('.').pop();
    const fileName = `${session.user.id}.${fileExt}`;
    const { error } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    await updateProfile({ ...userProfile!, avatar_url: `${data.publicUrl}?t=${Date.now()}` });
  };
  
  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <DataContext.Provider value={{
      session, ledgerMode, setLedgerMode, theme, toggleTheme,
      transactions, budgetSettings, properties, userProfile, mileageLogs, mileageAnnualStats, notifications, invoices, calculatedBudgetsByLedger,
      refreshData: fetchInitialData, addTransaction, updateTransaction, deleteTransaction,
      saveBudget, saveProperty, saveMileage, saveAnnualMileageStats, saveInvoice, deleteInvoice, updateProfile, uploadAvatar, logout,
      isDrawerOpen, setIsDrawerOpen, editingTransaction, setEditingTransaction,
      isStatementModalOpen, setIsStatementModalOpen, isNotificationModalOpen, setIsNotificationModalOpen
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};