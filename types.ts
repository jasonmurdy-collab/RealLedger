export type LedgerType = 'active' | 'passive' | 'personal';
export type TaxForm = 't2125' | 't776';

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  tax_line_t2125?: string;
  tax_line_t776?: string;
  description?: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  reference_id?: string;
  status: 'draft' | 'posted';
  user_id: string;
  created_at?: string;
}

export interface LedgerLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  account_code?: string;
  account_name?: string;
  debit: number;
  credit: number;
}

export interface SplitDetail {
  amount: number;
  ledgerType: LedgerType;
  category: string;
}

export interface UserProfile {
  id?: string;
  full_name: string;
  role: string;
  cra_business_number?: string;
  sin_last_4?: string;
  is_pro_member?: boolean;
  avatar_url?: string;
  commission_split?: number;
  annual_cap?: number;
  royalty_fee?: number;
  max_royalty_contribution?: number;
  transaction_fee?: number;
  cap_anniversary_date?: string;
}

export interface Property {
  id: string;
  address: string;
  purchasePrice: number;
  currentValue: number;
  ccaClass: number;
  openingUcc: number;
  additions: number;
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
  taxForm?: TaxForm;
  status?: 'posted' | 'pending';
  isSplit?: boolean;
  splitDetails?: SplitDetail[];
  hstIncluded?: boolean;
  hstAmount?: number;
  propertyId?: string;
  receiptUrl?: string;
  isRecurring?: boolean;
  user_id?: string;
  is_commission?: boolean;
}

export interface DraftTransaction {
  id: string;
  date: string;
  vendor: string;
  amount: number;
  description?: string;
  category_guess: string;
  selected: boolean;
}

export interface MileageLog {
    id?: string;
    date: string;
    start_location: string;
    end_location: string;
    purpose: string;
    distance: number;
    user_id?: string;
}

export interface MileageAnnualStats {
  id?: string;
  year: number;
  start_odometer: number;
  end_odometer: number;
  user_id?: string;
}

export interface Notification {
    id: string;
    type: 'pending_tx' | 'budget_over' | 'lease_expiry' | 'hst_remittance';
    message: string;
    date: Date;
    relatedId?: string;
}

export interface ChartDataPoint {
  month: string;
  value: number;
  expense?: number;
  forecast?: boolean;
}

export interface BudgetCategory {
  id?: string;
  tempId?: string;
  category: string;
  spent: number;
  limit: number;
  savingsGoal?: number;
  user_id?: string;
  ledger_type: LedgerType;
}

export interface LineItem {
  id: string;
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