import { LedgerLine, JournalEntry, Account, Transaction } from '../types';
import { DEFAULT_CHART_OF_ACCOUNTS } from '../constants';

// Helper to find an account by name or close match
const findAccountCode = (category: string, type: 'Expense' | 'Revenue' | 'Asset' | 'Liability' = 'Expense'): string => {
  const normalizedCat = category.toLowerCase();
  
  // Direct Mapping attempt
  const directMatch = DEFAULT_CHART_OF_ACCOUNTS.find(acc => 
    acc.name.toLowerCase() === normalizedCat && acc.type === type
  );
  if (directMatch) return directMatch.code;

  // Keyword Matching
  if (type === 'Expense') {
    if (normalizedCat.includes('meal') || normalizedCat.includes('food')) return '5010'; // Meals
    if (normalizedCat.includes('adver') || normalizedCat.includes('marketing')) return '5000'; // Advertising
    if (normalizedCat.includes('office') || normalizedCat.includes('stationery')) return '5060'; // Office
    if (normalizedCat.includes('supply')) return '5070'; // Supplies
    if (normalizedCat.includes('fuel') || normalizedCat.includes('gas') || normalizedCat.includes('auto') || normalizedCat.includes('car')) return '5160'; // Auto
    if (normalizedCat.includes('phone') || normalizedCat.includes('internet') || normalizedCat.includes('utility')) return '5150'; // Utilities
    if (normalizedCat.includes('rent')) return '5100'; // Rent
  }

  // Fallbacks
  if (type === 'Liability') return '2000'; // Credit Card default
  if (type === 'Asset') return '1010'; // Bank default
  if (type === 'Revenue') return '4000'; // Commission default

  return '5200'; // Personal/Misc Expense default
};

export const generateJournalEntryPayload = (
  transaction: Omit<Transaction, 'id' | 'status'>,
  paymentMethod: 'credit_card' | 'bank' | 'cash' = 'credit_card'
) => {
  const isExpense = transaction.amount < 0;
  const absAmount = Math.abs(transaction.amount);
  const date = new Date().toISOString();
  
  // 1. Create Journal Entry Header
  const journalEntry: Omit<JournalEntry, 'id'> = {
    date: transaction.date,
    description: `${transaction.vendor} - ${transaction.category}`,
    status: 'posted',
    user_id: 'current_user', // To be replaced by caller
  };

  const ledgerLines: Omit<LedgerLine, 'id' | 'journal_entry_id'>[] = [];

  // 2. Logic for Debits and Credits
  if (isExpense) {
    // --- EXPENSE TRANSACTION ---
    // Debit: Expense Account
    const expenseAccountCode = findAccountCode(transaction.category, 'Expense');
    const expenseAccount = DEFAULT_CHART_OF_ACCOUNTS.find(a => a.code === expenseAccountCode);

    // Debit: HST Paid (ITC) - Asset/Contra-Liability
    const hstAmount = transaction.hstAmount || 0;
    const netExpense = absAmount - hstAmount;

    ledgerLines.push({
      account_id: expenseAccountCode, // Using Code as ID proxy for this phase
      account_code: expenseAccountCode,
      account_name: expenseAccount?.name || 'Uncategorized Expense',
      debit: netExpense,
      credit: 0
    });

    if (hstAmount > 0) {
      ledgerLines.push({
        account_id: '2110',
        account_code: '2110',
        account_name: 'HST Paid (ITC)',
        debit: hstAmount,
        credit: 0
      });
    }

    // Credit: Payment Account (Liability or Asset decrease)
    let creditAccountCode = '2000'; // Default Credit Card
    if (paymentMethod === 'bank') creditAccountCode = '1010';
    if (paymentMethod === 'cash') creditAccountCode = '1000';
    
    const creditAccount = DEFAULT_CHART_OF_ACCOUNTS.find(a => a.code === creditAccountCode);

    ledgerLines.push({
      account_id: creditAccountCode,
      account_code: creditAccountCode,
      account_name: creditAccount?.name || 'Payment Account',
      debit: 0,
      credit: absAmount // Total amount including tax
    });

  } else {
    // --- REVENUE TRANSACTION ---
    // Debit: Asset (Cash/Bank)
    const debitAccountCode = '1010'; // Business Bank Account
    const debitAccount = DEFAULT_CHART_OF_ACCOUNTS.find(a => a.code === debitAccountCode);

    ledgerLines.push({
      account_id: debitAccountCode,
      account_code: debitAccountCode,
      account_name: debitAccount?.name || 'Business Bank Account',
      debit: absAmount,
      credit: 0
    });

    // Credit: Revenue Account
    const revenueAccountCode = findAccountCode(transaction.category, 'Revenue');
    const revenueAccount = DEFAULT_CHART_OF_ACCOUNTS.find(a => a.code === revenueAccountCode);
    
    // Credit: HST Collected (Liability)
    // Assuming the income amount includes HST if hstIncluded is true in the logic that calls this, 
    // but usually income is entered as gross. Let's assume input amount is Gross.
    // If it's a commission, usually HST is on top. 
    // For simplicity in this engine update, we take the explicit HST amount passed.
    const hstCollected = transaction.hstAmount || 0;
    const netRevenue = absAmount - hstCollected;

    ledgerLines.push({
      account_id: revenueAccountCode,
      account_code: revenueAccountCode,
      account_name: revenueAccount?.name || 'Commission Income',
      debit: 0,
      credit: netRevenue
    });

    if (hstCollected > 0) {
      ledgerLines.push({
        account_id: '2100',
        account_code: '2100',
        account_name: 'HST Collected',
        debit: 0,
        credit: hstCollected
      });
    }
  }

  // Double Entry Check
  const totalDebit = ledgerLines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = ledgerLines.reduce((sum, line) => sum + line.credit, 0);

  // Floating point fix
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    console.error(`Unbalanced Journal Entry! Debit: ${totalDebit}, Credit: ${totalCredit}`);
  }

  return { journalEntry, ledgerLines };
};