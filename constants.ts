import { Transaction, ChartDataPoint, Property, BudgetCategory, BankAccount } from './types';

export const MOCK_PROPERTIES: Property[] = [
  {
    id: 'p1',
    address: '42 Wallaby Way, Toronto',
    purchasePrice: 850000,
    currentValue: 1100000,
    ccaClass: 1,
    uccBalance: 780000,
    tenantName: 'P. Sherman',
    leaseEnd: '2024-08-01'
  },
  {
    id: 'p2',
    address: '101 King St W, Condo 4B',
    purchasePrice: 620000,
    currentValue: 680000,
    ccaClass: 1,
    uccBalance: 590000,
    tenantName: 'Vacant',
    leaseEnd: '-'
  }
];

export const BUDGET_DATA: BudgetCategory[] = [
  { category: 'Housing', spent: 2400, limit: 2500 },
  { category: 'Food & Dining', spent: 850, limit: 600 },
  { category: 'Lifestyle', spent: 320, limit: 500 },
  { category: 'Transport', spent: 150, limit: 300 },
];

export const INITIAL_ACCOUNTS: BankAccount[] = [
  { id: '1', name: 'Business Chequing', type: 'Chequing', mask: '4829', institution: 'TD' },
  { id: '2', name: 'Visa Infinite', type: 'Credit', mask: '1102', institution: 'RBC' }
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', date: '2023-10-24', vendor: 'Keller Williams Legit', amount: 14500.00, type: 'active', category: 'Commission', taxForm: 't2125', hstIncluded: true, status: 'posted' },
  { id: '2', date: '2023-10-23', vendor: 'Home Depot', amount: -452.20, type: 'passive', category: 'Repairs & Maint', taxForm: 't776', isSplit: true, propertyId: 'p1', status: 'posted' },
  { id: '3', date: '2023-10-22', vendor: 'Shell Station', amount: -85.00, type: 'active', category: 'Fuel/Auto', taxForm: 't2125', status: 'posted' },
  { id: '4', date: '2023-10-20', vendor: 'City of Toronto', amount: -1200.00, type: 'passive', category: 'Property Tax', taxForm: 't776', propertyId: 'p1', isRecurring: true, status: 'posted' },
  { id: '5', date: '2023-10-18', vendor: 'TREB Fees', amount: -115.00, type: 'active', category: 'Dues & Fees', taxForm: 't2125', status: 'posted' },
  { id: '6', date: '2023-10-15', vendor: 'Uber Eats', amount: -45.00, type: 'active', category: 'Meals & Ent', taxForm: 't2125', status: 'posted' },
  // Personal Transactions
  { id: '7', date: '2023-10-25', vendor: 'Whole Foods', amount: -142.50, type: 'personal', category: 'Food & Dining', status: 'posted' },
  { id: '8', date: '2023-10-24', vendor: 'Netflix', amount: -16.99, type: 'personal', category: 'Lifestyle', isRecurring: true, status: 'posted' },
  { id: '9', date: '2023-10-23', vendor: 'LCBO', amount: -65.20, type: 'personal', category: 'Lifestyle', status: 'posted' },
  { id: '10', date: '2023-10-22', vendor: 'Presto', amount: -50.00, type: 'personal', category: 'Transport', status: 'posted' },
];

export const CHART_DATA_ACTIVE: ChartDataPoint[] = [
  { month: 'Jun', value: 8000, expense: 2000 },
  { month: 'Jul', value: 12000, expense: 3500 },
  { month: 'Aug', value: 9500, expense: 1800 },
  { month: 'Sep', value: 15000, expense: 4200 },
  { month: 'Oct', value: 14500, expense: 2100 },
];

export const CHART_DATA_PASSIVE: ChartDataPoint[] = [
  { month: 'Jun', value: 4200, expense: 1200 },
  { month: 'Jul', value: 4200, expense: 900 },
  { month: 'Aug', value: 4100, expense: 1500 }, 
  { month: 'Sep', value: 4200, expense: 800 },
  { month: 'Oct', value: 4200, expense: 1200 }, // Property tax month
];

export const CHART_DATA_PERSONAL: ChartDataPoint[] = [
  { month: 'Jun', value: 3200 },
  { month: 'Jul', value: 3800 },
  { month: 'Aug', value: 3100 }, 
  { month: 'Sep', value: 4500 },
  { month: 'Oct', value: 3720 },
];

export const ONTARIO_HST_RATE = 0.13;