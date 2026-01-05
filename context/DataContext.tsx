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
  saveAnnualMileageStats: (stats: Partial<MileageAnnualStats> & { year: number }) => Promise<void>;
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

  /**
   * Calculates current spending per budget category and pushes it to Supabase
   * to ensure the 'spent' column in the table is always accurate.
   */
  const syncSpentToDatabase = async (currentTransactions: Transaction[], currentBudgets: BudgetCategory[]) => {
    if (!session?.user || currentBudgets.length === 0) return;

    const spendingMap = new Map<string, number>();
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    currentTransactions.forEach(t => {
      if (!t.date || t.amount >= 0) return;
      const parts = t.date.split('-').map(Number);
      if (parts.length < 2) return;
      
      const tYear = parts[0];
      const tMonth = parts[1] - 1;

      if (tMonth === currentMonth && tYear === currentYear) {
        const key = `${(t.type || 'personal').toLowerCase()}_${(t.category || 'Uncategorized').toLowerCase().trim()}`;
        spendingMap.set(key, (spendingMap.get(key) || 0) + Math.abs(t.amount));
      }
    });

    const updates = currentBudgets.filter(b => !!b.id).map(b => {
      const key = `${(b.ledger_type || 'personal').toLowerCase()}_${(b.category || 'Uncategorized').toLowerCase().trim()}`;
      return {
        id: b.id,
        spent: spendingMap.get(key) || 0
      };
    });

    if (updates.length > 0) {
      await supabase.from('budget_categories').upsert(updates);
    }
  };

  const fetchBudgets = async () => {
    if (!session?.user) return;
    const { data, error } = await supabase.from('budget_categories').select('*');
    if (error) {
        console.error("Fetch Budgets Error:", error);
        return;
    }
    if (data) {
        setBudgetSettings(data.map((b: any) => ({
            id: b.id,
            category: b.category || 'Uncategorized',
            spent: Number(b.spent || 0), // Use persistent 'spent' column from DB
            limit: Number(b.limit || 0), 
            savingsGoal: b.savings_goal, 
            user_id: b.user_id,
            ledger_type: (b.ledger_type || 'personal').toLowerCase() as LedgerType
        })));
    }
  };

  const fetchInitialData = async () => {
    if (!session?.user) return;
    const { user } = session;

    try {
        await fetchBudgets();

        const [txRes, propRes, profRes, mileRes, mileStatsRes, invRes] = await Promise.all([
            supabase.from('transactions').select('*').order('date', { ascending: false }),
            supabase.from('properties').select('*'),
            supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
            supabase.from('mileage_logs').select('*').order('date', { ascending: false }),
            supabase.from('mileage_annual_stats').select('*'),
            supabase.from('invoices').select('*').order('invoice_date', { ascending: false }),
        ]);

        let loadedTxs: Transaction[] = [];
        if (txRes.data) {
            loadedTxs = txRes.data.map((d: any) => ({
                id: d.id, 
                date: d.date, 
                vendor: d.vendor, 
                amount: Number(d.amount || 0), 
                type: (d.type || 'personal').toLowerCase() as LedgerType, 
                category: d.category || 'Uncategorized',
                taxForm: d.tax_form, 
                status: d.status, 
                isSplit: d.is_split || false, 
                hstIncluded: d.hst_included || false,
                hstAmount: Number(d.hst_amount || 0), 
                propertyId: d.property_id, 
                receiptUrl: d.receipt_url, 
                user_id: d.user_id, 
                is_commission: d.is_commission
            }));
            setTransactions(loadedTxs);
        }

        if (propRes.data) {
            setProperties(propRes.data.map((p: any) => ({
                id: p.id, address: p.address, purchasePrice: Number(p.purchase_price || 0), currentValue: Number(p.current_value || 0), ccaClass: p.cca_class,
                openingUcc: Number(p.opening_ucc || 0), additions: Number(p.additions || 0), tenantName: p.tenant_name, lease_end: p.lease_end, user_id: p.user_id, mortgageBalance: Number(p.mortgage_balance || 0)
            })));
        }
        if (mileRes.data) setMileageLogs(mileRes.data);
        if (mileStatsRes.data) setMileageAnnualStats(mileStatsRes.data);
        
        if (profRes.data) setUserProfile(profRes.data);
        else setUserProfile({ id: user.id, full_name: '', role: 'Real Estate Professional', avatar_url: '' });
        
        if (invRes.data) setInvoices(invRes.data);

        // Perform background sync of 'spent' column after initial data load
        if (loadedTxs.length > 0) {
          syncSpentToDatabase(loadedTxs, budgetSettings);
        }

    } catch (e) {
        console.warn("Initial data fetch encountered issues.", e);
    }
  };

  useEffect(() => {
    if (session) fetchInitialData();
  }, [session]);

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
        if (!t.date) return;
        const parts = t.date.split('-').map(Number);
        if (parts.length < 2) return;
        
        const tYear = parts[0];
        const tMonth = parts[1] - 1; 

        if (t.amount < 0 && tMonth === currentMonth && tYear === currentYear) {
            const ledgerType = (t.type || 'personal').toLowerCase() as LedgerType;
            const map = spendingMap[ledgerType];
            if (!map) return;
            
            const normalizedCat = (t.category || 'Uncategorized').toLowerCase().trim();
            map.set(normalizedCat, (map.get(normalizedCat) || 0) + Math.abs(t.amount || 0));
        }
    });

    const result: Record<LedgerType, BudgetCategory[]> = { active: [], passive: [], personal: [] };
    
    budgetSettings.forEach(b => {
      const ledgerType = (b.ledger_type || 'personal').toLowerCase() as LedgerType;
      const list = result[ledgerType];
      if (list) {
          const normalizedPlanCat = (b.category || 'Uncategorized').toLowerCase().trim();
          const actualSpent = spendingMap[ledgerType].get(normalizedPlanCat) || 0;
          list.push({ ...b, spent: actualSpent });
      }
    });
    
    return result;
  }, [transactions, budgetSettings]);

  const updateTransaction = async (updatedTx: Transaction, updateAllFromVendor: boolean = true) => {
    if (!session?.user) return;
    const hstAmount = updatedTx.hstIncluded ? Math.abs(updatedTx.amount) - (Math.abs(updatedTx.amount) / (1 + ONTARIO_HST_RATE)) : 0;
    
    const { error: singleError } = await supabase.from('transactions').update({ 
        date: updatedTx.date, vendor: updatedTx.vendor, amount: updatedTx.amount, type: updatedTx.type, 
        category: updatedTx.category, tax_form: updatedTx.taxForm, property_id: updatedTx.propertyId, 
        hst_included: updatedTx.hstIncluded, hst_amount: hstAmount 
    }).eq('id', updatedTx.id);
    
    if (singleError) throw singleError;

    if (updateAllFromVendor && updatedTx.vendor) {
        await supabase.from('transactions')
            .update({ 
                category: updatedTx.category, 
                type: updatedTx.type,
                tax_form: updatedTx.taxForm
            })
            .eq('user_id', session.user.id)
            .ilike('vendor', updatedTx.vendor.trim())
            .neq('id', updatedTx.id); 
    }
    
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
    // Background sync spent column after deletion
    syncSpentToDatabase(transactions.filter(t => t.id !== id), budgetSettings);
  };

  const saveBudget = async (newBudgets: BudgetCategory[]) => {
    if (!session?.user) throw new Error("Authentication required");
    const userId = session.user.id;
    
    const incomingIds = new Set<string>(newBudgets.map(b => b.id).filter((id): id is string => !!id));
    const currentIds = new Set<string>(budgetSettings.map(b => b.id).filter((id): id is string => !!id));
    const idsToDelete = [...currentIds].filter(id => !incomingIds.has(id));

    if (idsToDelete.length > 0) {
        await supabase.from('budget_categories').delete().in('id', idsToDelete);
    }

    const updates = newBudgets.filter(b => !!b.id).map(b => ({
        id: b.id, 
        category: b.category, 
        limit: Number(b.limit || 0), 
        spent: Number(b.spent || 0), // Persist current spent during configuration save
        savings_goal: b.savingsGoal ?? null,
        user_id: userId, 
        ledger_type: b.ledger_type || 'active', 
    }));

    const inserts = newBudgets.filter(b => !b.id).map(b => ({
        category: b.category, 
        limit: Number(b.limit || 0), 
        spent: Number(b.spent || 0),
        savings_goal: b.savingsGoal ?? null,
        user_id: userId, 
        ledger_type: b.ledger_type || 'active', 
    }));

    if (updates.length > 0) await supabase.from('budget_categories').upsert(updates);
    if (inserts.length > 0) await supabase.from('budget_categories').insert(inserts);
    
    await fetchInitialData(); 
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

  const saveAnnualMileageStats = async (stats: Partial<MileageAnnualStats> & { year: number }) => {
    if (!session?.user) return;
    const existing = mileageAnnualStats.find(s => s.year === stats.year);
    const payload = {
      year: stats.year,
      user_id: session.user.id,
      start_odometer: stats.start_odometer !== undefined ? stats.start_odometer : (existing?.start_odometer || 0),
      end_odometer: stats.end_odometer !== undefined ? stats.end_odometer : (existing?.end_odometer || 0)
    };
    
    const { error } = await supabase.from('mileage_annual_stats').upsert(payload, { onConflict: 'user_id,year' });
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