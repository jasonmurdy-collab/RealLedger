export type LedgerType = 'active' | 'passive' | 'personal';
export type TaxForm = 't2125' | 't776';

export interface SplitDetail {
  amount: number;
  ledgerType: LedgerType;
  category: string;
}

export interface Property {
  id: string;
  address: string;
  purchasePrice: number;
  currentValue: number;
  ccaClass: number; // Class 1 usually 4%
  uccBalance: number; // Undepreciated Capital Cost
  tenantName: string;
  leaseEnd: string;
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
  isRecurring?: boolean;
  user_id?: string; // Added for Supabase RLS
}

export interface Metric {
  label: string;
  value: string;
  trend?: number; // percentage
  subLabel?: string;
}

export interface ChartDataPoint {
  month: string;
  value: number;
  expense?: number; // Added for Profit/Loss charts
}

export interface BudgetCategory {
  category: string;
  spent: number;
  limit: number;
  user_id?: string; // Added for Supabase RLS
}

export interface BankAccount {
  id: string;
  name: string;
  type: string;
  mask: string;
  institution: string;
  defaultContext?: LedgerType;
  user_id?: string; // Added for Supabase RLS
}