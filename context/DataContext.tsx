import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { Session } from '@supabase/supabase-js';
import { Transaction, BudgetCategory, Property, UserProfile, Notification, MileageLog, Invoice, LedgerType } from '../types';
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
  notifications: Notification[];
  invoices: Invoice[];
  calculatedBudgetsByLedger: Record<LedgerType, BudgetCategory[]>;
  
  // Actions
  refreshData: () => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id' | 'status'> | Omit<Transaction, 'id' | 'status'>[]) => Promise<void>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  saveBudget: (budgets: BudgetCategory[]) => Promise<void>;
  saveProperty: (prop: Omit<Property, 'id'>) => Promise<void>;
  saveMileage: (log: Omit<MileageLog, 'id'>) => Promise<void>;
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
    const { data } = await supabase.from('budget_categories').select('*');
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

    const [txRes, propRes, profRes, mileRes, invRes] = await Promise.all([
        supabase.from('transactions').select('*').order('date', { ascending: false }),
        supabase.from('properties').select('*'),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('mileage_logs').select('*').order('date', { ascending: false }),
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
            openingUcc: p.opening_ucc, additions: p.additions, tenantName: p.tenant_name, leaseEnd: p.lease_end, user_id: p.user_id, mortgageBalance: p.mortgage_balance
        })));
    }
    if (mileRes.data) setMileageLogs(mileRes.data);
    if (profRes.data) setUserProfile(profRes.data);
    else setUserProfile({ id: user.id, full_name: '', role: 'Real Estate Professional', avatar_url: '' });
    if (invRes.data) setInvoices(invRes.data);
  };

  useEffect(() => {
    if (session) fetchInitialData();
  }, [session]);

  // Derived State: Budgets
  const calculatedBudgetsByLedger = useMemo(() => {
    const spendingMap: Record<LedgerType, Map<string, number>> = {
      active: new Map(),
      passive: new Map(),
      personal: new Map(),
    };
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    transactions.filter(t => t.amount < 0 && new Date(t.date).getMonth() === currentMonth && new Date(t.date).getFullYear() === currentYear)
      .forEach(t => {
          const map = spendingMap[t.type];
          map.set(t.category, (map.get(t.category) || 0) + Math.abs(t.amount));
      });

    const result: Record<LedgerType, BudgetCategory[]> = { active: [], passive: [], personal: [] };
    budgetSettings.forEach(b => {
      const list = result[b.ledger_type];
      if (list) list.push({ ...b, spent: spendingMap[b.ledger_type].get(b.category) || 0 });
    });
    return result;
  }, [transactions, budgetSettings]);

  // Derived State: Notifications
  useEffect(() => {
    const newNotifications: Notification[] = [];
    transactions.filter(t => t.status === 'pending').forEach(t => newNotifications.push({ id: `tx-${t.id}`, type: 'pending_tx', message: `Review: ${t.vendor} ($${Math.abs(t.amount)})`, date: new Date(t.date), relatedId: t.id }));
    (Object.values(calculatedBudgetsByLedger).flat() as BudgetCategory[]).filter(b => b.limit > 0 && b.spent > b.limit).forEach(b => newNotifications.push({ id: `budget-${b.category}`, type: 'budget_over', message: `Over Budget: ${b.category} (-$${(b.spent - b.limit).toFixed(0)})`, date: new Date(), relatedId: b.category }));
    if ([2, 5, 8, 11].includes(new Date().getMonth())) newNotifications.push({ id: 'hst-remit', type: 'hst_remittance', message: 'Quarterly HST Remittance due soon.', date: new Date() });
    setNotifications(newNotifications.sort((a, b) => b.date.getTime() - a.date.getTime()));
  }, [transactions, calculatedBudgetsByLedger]);

  // CRUD Actions
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

  const updateTransaction = async (updatedTx: Transaction) => {
    const hstAmount = updatedTx.hstIncluded ? Math.abs(updatedTx.amount) - (Math.abs(updatedTx.amount) / (1 + ONTARIO_HST_RATE)) : 0;
    const { error } = await supabase.from('transactions').update({ 
        date: updatedTx.date, vendor: updatedTx.vendor, amount: updatedTx.amount, type: updatedTx.type, 
        category: updatedTx.category, tax_form: updatedTx.taxForm, property_id: updatedTx.propertyId, 
        hst_included: updatedTx.hstIncluded, hst_amount: hstAmount 
    }).eq('id', updatedTx.id);
    if (error) throw error;
    setTransactions(prev => prev.map(t => t.id === updatedTx.id ? { ...updatedTx, hstAmount } : t));
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const saveBudget = async (newBudgets: BudgetCategory[]) => {
    if (!session?.user) return;
    const userId = session.user.id;
    const newIds = new Set(newBudgets.map(b => b.id).filter((id): id is string => !!id));
    const originalIds = new Set(budgetSettings.map(b => b.id).filter((id): id is string => !!id));
    const idsToDelete = [...originalIds].filter(id => !newIds.has(id));

    if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase.from('budget_categories').delete().in('id', idsToDelete as string[]);
        if (deleteError) throw deleteError;
    }

    const upsertPayload = newBudgets.map(b => {
      // Explicitly construct object to avoid undefined 'id' which can cause issues with Supabase types/upsert logic
      const payload: any = {
        category: b.category, 
        limit: b.limit, 
        savings_goal: b.savingsGoal ?? null,
        user_id: userId, 
        ledger_type: b.ledger_type,
      };
      if (b.id) payload.id = b.id;
      return payload;
    });

    if (upsertPayload.length > 0) {
        const { error } = await supabase.from('budget_categories').upsert(upsertPayload, { onConflict: 'id' });
        if (error) throw error;
    }
    await fetchBudgets();
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
      transactions, budgetSettings, properties, userProfile, mileageLogs, notifications, invoices, calculatedBudgetsByLedger,
      refreshData: fetchInitialData, addTransaction, updateTransaction, deleteTransaction,
      saveBudget, saveProperty, saveMileage, saveInvoice, deleteInvoice, updateProfile, uploadAvatar, logout,
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