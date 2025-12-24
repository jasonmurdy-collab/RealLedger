import React, { useState, useMemo } from 'react';
import { Transaction, Property, LedgerType } from '../types';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  ChevronDown, 
  Calendar, 
  Tag, 
  DollarSign, 
  Building2, 
  ArrowRight, 
  Edit3,
  FileText,
  AlertCircle
} from 'lucide-react';
import { MONTH_NAMES } from '../constants';

interface ExpensesViewProps {
  transactions: Transaction[];
  properties: Property[];
  onEditTransaction: (tx: Transaction) => void;
}

type SortField = 'date' | 'amount' | 'vendor' | 'category';
type SortOrder = 'asc' | 'desc';

export const ExpensesView: React.FC<ExpensesViewProps> = ({ transactions, properties, onEditTransaction }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLedger, setSelectedLedger] = useState<LedgerType | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Derive unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set<string>();
    transactions.forEach(t => t.category && cats.add(t.category));
    return Array.from(cats).sort();
  }, [transactions]);

  // Filtering Logic
  const filteredExpenses = useMemo(() => {
    return transactions
      .filter(t => {
        const matchesSearch = t.vendor.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             t.category.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLedger = selectedLedger === 'all' || t.type === selectedLedger;
        const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
        const matchesMonth = selectedMonth === 'all' || new Date(t.date).getMonth() === selectedMonth;
        const isExpense = t.amount < 0; // Primarily focus on outflows

        return matchesSearch && matchesLedger && matchesCategory && matchesMonth && isExpense;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortField === 'date') comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (sortField === 'amount') comparison = Math.abs(a.amount) - Math.abs(b.amount);
        if (sortField === 'vendor') comparison = a.vendor.localeCompare(b.vendor);
        if (sortField === 'category') comparison = a.category.localeCompare(b.category);
        
        return sortOrder === 'desc' ? -comparison : comparison;
      });
  }, [transactions, searchTerm, selectedLedger, selectedCategory, selectedMonth, sortField, sortOrder]);

  const totalFilteredSpend = useMemo(() => {
    return Math.abs(filteredExpenses.reduce((sum, t) => sum + t.amount, 0));
  }, [filteredExpenses]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="animate-slide-up space-y-6 pb-24">
      {/* Search and Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-3xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
                <Search className="absolute left-4 top-3 text-zinc-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search vendor or category..." 
                    className="w-full pl-11 pr-4 py-3 bg-zinc-100 dark:bg-zinc-800/50 border border-transparent focus:border-rose-500/50 rounded-2xl outline-none text-sm font-medium transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex gap-2">
                <FilterDropdown 
                    icon={<Building2 size={14}/>} 
                    label="Ledger" 
                    value={selectedLedger} 
                    options={['all', 'active', 'passive', 'personal']} 
                    onChange={(v) => setSelectedLedger(v as any)} 
                />
                <FilterDropdown 
                    icon={<Calendar size={14}/>} 
                    label="Month" 
                    value={selectedMonth === 'all' ? 'All' : MONTH_NAMES[selectedMonth]} 
                    options={['all', ...MONTH_NAMES]} 
                    onChange={(v) => setSelectedMonth(v === 'all' ? 'all' : MONTH_NAMES.indexOf(v))} 
                />
            </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-100 dark:border-white/5">
            <button 
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${selectedCategory === 'all' ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white' : 'text-zinc-500 border-zinc-200 dark:border-white/5'}`}
            >
                All Categories
            </button>
            {categories.map(cat => (
                <button 
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${selectedCategory === cat ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white' : 'text-zinc-500 border-zinc-200 dark:border-white/5'}`}
                >
                    {cat}
                </button>
            ))}
        </div>
      </div>

      {/* Summary Insights Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryBox label="Filtered Volume" value={`$${totalFilteredSpend.toLocaleString()}`} icon={<DollarSign size={16}/>} color="zinc" />
          <SummaryBox label="Items Found" value={filteredExpenses.length.toString()} icon={<FileText size={16}/>} color="zinc" />
          <SummaryBox label="Avg. Cost" value={`$${(filteredExpenses.length > 0 ? totalFilteredSpend / filteredExpenses.length : 0).toFixed(0)}`} icon={<TrendingUpIcon size={16}/>} color="zinc" />
          <SummaryBox label="Time Period" value={selectedMonth === 'all' ? 'Annual' : MONTH_NAMES[selectedMonth]} icon={<Calendar size={16}/>} color="zinc" />
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-white/5">
                          <TableHead label="Date" activeField={sortField} currentField="date" sortOrder={sortOrder} onClick={() => handleSort('date')} />
                          <TableHead label="Vendor" activeField={sortField} currentField="vendor" sortOrder={sortOrder} onClick={() => handleSort('vendor')} />
                          <TableHead label="Category" activeField={sortField} currentField="category" sortOrder={sortOrder} onClick={() => handleSort('category')} />
                          <TableHead label="Ledger" activeField={sortField} currentField="" sortOrder={sortOrder} />
                          <TableHead label="Amount" activeField={sortField} currentField="amount" sortOrder={sortOrder} onClick={() => handleSort('amount')} textAlign="right" />
                          <th className="p-4"></th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                      {filteredExpenses.map(tx => (
                          <tr key={tx.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                              <td className="p-4">
                                  <p className="text-xs font-bold text-zinc-900 dark:text-white">{new Date(tx.date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                              </td>
                              <td className="p-4">
                                  <p className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight">{tx.vendor}</p>
                                  {tx.propertyId && (
                                      <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-1 mt-0.5">
                                          <Building2 size={10} /> {properties.find(p => p.id === tx.propertyId)?.address}
                                      </p>
                                  )}
                              </td>
                              <td className="p-4">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                                      {tx.category}
                                  </span>
                              </td>
                              <td className="p-4">
                                  <LedgerBadge type={tx.type} />
                              </td>
                              <td className="p-4 text-right">
                                  <p className="text-sm font-black text-zinc-900 dark:text-white">
                                      ${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </p>
                                  {tx.hstAmount! > 0 && (
                                      <p className="text-[9px] text-zinc-400 font-bold">Incl. ${tx.hstAmount?.toFixed(2)} HST</p>
                                  )}
                              </td>
                              <td className="p-4 text-right">
                                  <button 
                                    onClick={() => onEditTransaction(tx)}
                                    className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                  >
                                      <Edit3 size={16} />
                                  </button>
                              </td>
                          </tr>
                      ))}
                      {filteredExpenses.length === 0 && (
                          <tr>
                              <td colSpan={6} className="p-20 text-center">
                                  <div className="flex flex-col items-center gap-2 opacity-30">
                                      <AlertCircle size={48} />
                                      <p className="text-sm font-bold">No expenses match your current filters.</p>
                                  </div>
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};

const FilterDropdown = ({ icon, label, value, options, onChange }: any) => (
    <div className="relative group">
        <select 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            className="appearance-none bg-zinc-100 dark:bg-zinc-800/50 border border-transparent hover:border-zinc-300 dark:hover:border-white/10 rounded-2xl pl-10 pr-10 py-3 text-xs font-black uppercase tracking-widest outline-none transition-all cursor-pointer"
        >
            {options.map((opt: string) => (
                <option key={opt} value={opt} className="bg-white dark:bg-zinc-900">{opt}</option>
            ))}
        </select>
        <div className="absolute left-4 top-3.5 text-zinc-400 pointer-events-none">{icon}</div>
        <ChevronDown size={14} className="absolute right-4 top-3.5 text-zinc-400 pointer-events-none" />
    </div>
);

const SummaryBox = ({ label, value, icon, color }: any) => (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2 text-zinc-400">
            {icon}
            <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        </div>
        <p className="text-xl font-black text-zinc-900 dark:text-white tracking-tighter">{value}</p>
    </div>
);

const TableHead = ({ label, activeField, currentField, sortOrder, onClick, textAlign = 'left' }: any) => (
    <th 
        onClick={onClick}
        className={`p-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors text-${textAlign}`}
    >
        <div className={`flex items-center gap-2 ${textAlign === 'right' ? 'justify-end' : ''}`}>
            {label}
            {currentField === activeField && (
                <ArrowUpDown size={12} className={sortOrder === 'asc' ? 'rotate-180 transition-transform' : 'transition-transform'} />
            )}
        </div>
    </th>
);

const LedgerBadge = ({ type }: { type: LedgerType }) => {
    const color = type === 'active' ? 'text-rose-500 bg-rose-500/10' : type === 'passive' ? 'text-cyan-500 bg-cyan-500/10' : 'text-violet-500 bg-violet-500/10';
    return (
        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter ${color}`}>
            {type}
        </span>
    );
};

const TrendingUpIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
);
