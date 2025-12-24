export type LedgerType = 'active' | 'passive' | 'personal';
export type TaxForm = 't2125' | 't776';

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

export interface Account {
  id: string;
  code: string; // e.g., "1000"
  name: string; // e.g., "Cash in Bank"
  type: AccountType;
  tax_line_t2125?: string; // e.g., "8521" for Advertising
  tax_line_t776?: string;
  description?: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  reference_id?: string; // Link to original Receipt or Invoice ID
  status: 'draft' | 'posted';
  user_id: string;
  created_at?: string;
}

export interface LedgerLine {
  id: string;
  journal_entry_id: string;
  account_id: string; // References Account.id
  account_code?: string; // stored for easier querying/display
  account_name?: string; // stored for easier querying/display
  debit: number;
  credit: number;
}

export interface SplitDetail {
  amount: number;
  ledgerType: LedgerType;
  category: string;
}

export interface UserProfile {
  id?: string; // matches auth.users.id
  full_name: string;
  role: string;
  cra_business_number?: string;
  sin_last_4?: string;
  is_pro_member?: boolean;
  avatar_url?: string;
  // New Commission Fields
  commission_split?: number; // e.g., 80 for 80%
  annual_cap?: number; // in dollars
  royalty_fee?: number; // as a percentage
  max_royalty_contribution?: number; // max royalty in dollars
  transaction_fee?: number; // in dollars
  cap_anniversary_date?: string; // YYYY-MM-DD
}

export interface Property {
  id: string;
  address: string;
  purchasePrice: number;
  currentValue: number;
  ccaClass: number; // Class 1 usually 4%
  openingUcc: number; // UCC at start of year
  additions: number; // Capital additions this year
  tenantName: string;
  leaseEnd: string;
  user_id?: string;
  mortgageBalance?: number;
}

export interface Transaction {
  id: string;
  date: string;
  vendor: string;
  amount: number;
  type: LedgerType;
  category: string;
  taxForm?: TaxForm; // Optional for personal
  status?: 'posted' | 'pending'; // For bank feed items
  isSplit?: boolean;
  splitDetails?: SplitDetail[];
  hstIncluded?: boolean;
  hstAmount?: number;
  propertyId?: string; // Link passive expense to property
  receiptUrl?: string;
  isRecurring?: boolean; // Added for recurring transaction detection
  user_id?: string; // Added for Supabase RLS
  is_commission?: boolean; // New flag for commission income
}

export interface DraftTransaction {
  id: string;
  date: string;
  vendor: string;
  amount: number;
  description: string;
  category_guess: string;
  selected: boolean;
}

export interface MileageLog {
    id?: string;
    date: string;
    start_location: string;
    end_location: string;
    purpose: string;
    distance: number; // in kilometers
    user_id?: string;
}

export interface Notification {
    id: string;
    type: 'pending_tx' | 'budget_over' | 'lease_expiry' | 'hst_remittance';
    message: string;
    date: Date;
    relatedId?: string; // e.g., transaction ID or budget category name
}

export interface ChartDataPoint {
  month: string;
  value: number;
  expense?: number; // Added for Profit/Loss charts
  forecast?: boolean;
}

export interface BudgetCategory {
  id?: string; // Database ID
  tempId?: string; // Client-side ID for new items
  category: string;
  spent: number;
  limit: number;
  savingsGoal?: number; // For Goal-Oriented Budgeting
  user_id?: string; // Added for Supabase RLS
}

// Updated Invoice and related types
export interface LineItem {
  id: string; // local UI id
  description: string;
  quantity: number;
  price: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email?: string;
  client_address?: string;
  invoice_date: string;
  due_date: string;
  items: LineItem[];
  notes?: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  user_id?: string;
  subtotal: number;
  hst_amount: number;
  total_amount: number;
}