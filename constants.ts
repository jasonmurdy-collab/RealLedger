import { Account } from './types';

export const ONTARIO_HST_RATE = 0.13;

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Phase 1.2: Chart of Accounts (COA) Seeding
export const DEFAULT_CHART_OF_ACCOUNTS: Omit<Account, 'id'>[] = [
  // ASSETS (1000-1999)
  { code: '1000', name: 'Cash on Hand', type: 'Asset' },
  { code: '1010', name: 'Business Bank Account', type: 'Asset' },
  { code: '1200', name: 'Accounts Receivable', type: 'Asset' },
  { code: '1500', name: 'Property - Buildings (Class 1)', type: 'Asset' },
  { code: '1510', name: 'Property - Land', type: 'Asset' },
  { code: '1550', name: 'Furniture & Equipment (Class 8)', type: 'Asset' },
  { code: '1560', name: 'Vehicle (Class 10.1)', type: 'Asset' },

  // LIABILITIES (2000-2999)
  { code: '2000', name: 'Credit Card Payable', type: 'Liability' },
  { code: '2100', name: 'HST Collected (Govt Payable)', type: 'Liability' },
  { code: '2110', name: 'HST Paid (ITC)', type: 'Liability' }, // Contra-Liability
  { code: '2200', name: 'Mortgage Payable', type: 'Liability' },

  // EQUITY (3000-3999)
  { code: '3000', name: 'Owner\'s Capital', type: 'Equity' },
  { code: '3100', name: 'Owner\'s Draw', type: 'Equity' },

  // REVENUE (4000-4999)
  { code: '4000', name: 'Commission Income', type: 'Revenue', tax_line_t2125: '3A' },
  { code: '4100', name: 'Rental Income', type: 'Revenue', tax_line_t776: '8299' },
  { code: '4200', name: 'Consulting Income', type: 'Revenue' },

  // EXPENSES (5000-9999) - Mapped to CRA T2125 Lines
  { code: '5000', name: 'Advertising', type: 'Expense', tax_line_t2125: '8521' },
  { code: '5010', name: 'Meals & Entertainment', type: 'Expense', tax_line_t2125: '8523' },
  { code: '5020', name: 'Bad Debts', type: 'Expense', tax_line_t2125: '8590' },
  { code: '5030', name: 'Insurance', type: 'Expense', tax_line_t2125: '8690' },
  { code: '5040', name: 'Interest', type: 'Expense', tax_line_t2125: '8710' },
  { code: '5050', name: 'Business Tax, Fees, Licenses', type: 'Expense', tax_line_t2125: '8760' },
  { code: '5060', name: 'Office Expenses', type: 'Expense', tax_line_t2125: '8810' },
  { code: '5070', name: 'Supplies', type: 'Expense', tax_line_t2125: '8811' },
  { code: '5080', name: 'Legal, Accounting, Professional Fees', type: 'Expense', tax_line_t2125: '8860' },
  { code: '5090', name: 'Management & Admin Fees', type: 'Expense', tax_line_t2125: '8871' },
  { code: '5100', name: 'Rent', type: 'Expense', tax_line_t2125: '8910' },
  { code: '5110', name: 'Repairs & Maintenance', type: 'Expense', tax_line_t2125: '8960' },
  { code: '5120', name: 'Salaries & Wages', type: 'Expense', tax_line_t2125: '9060' },
  { code: '5130', name: 'Property Taxes', type: 'Expense', tax_line_t2125: '9180' },
  { code: '5140', name: 'Travel', type: 'Expense', tax_line_t2125: '9200' },
  { code: '5150', name: 'Telephone & Utilities', type: 'Expense', tax_line_t2125: '9220' },
  { code: '5160', name: 'Fuel/Auto', type: 'Expense', tax_line_t2125: '9281' }, // Motor vehicle expenses
  { code: '5200', name: 'Personal Expense', type: 'Expense' } // Non-deductible
];