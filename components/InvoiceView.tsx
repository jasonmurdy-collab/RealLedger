import React, { useState, useMemo } from 'react';
import { Invoice } from '../types';
import { FileText, Plus, Search, CheckCircle, Send, Clock, AlertCircle } from 'lucide-react';

interface InvoiceViewProps {
  invoices: Invoice[];
  onNewInvoice: () => void;
  onEditInvoice: (invoice: Invoice) => void;
}

type StatusFilter = 'all' | 'draft' | 'sent' | 'paid' | 'overdue';

const StatusBadge: React.FC<{ status: Invoice['status'] }> = ({ status }) => {
  const baseClasses = "px-2 py-0.5 rounded-full text-xs font-medium border";
  switch (status) {
    case 'paid':
      return <span className={`${baseClasses} bg-emerald-500/10 text-emerald-400 border-emerald-500/20`}>Paid</span>;
    case 'sent':
      return <span className={`${baseClasses} bg-blue-500/10 text-blue-400 border-blue-500/20`}>Sent</span>;
    case 'overdue':
      return <span className={`${baseClasses} bg-rose-500/10 text-rose-400 border-rose-500/20`}>Overdue</span>;
    case 'draft':
    default:
      return <span className={`${baseClasses} bg-zinc-700/50 text-zinc-400 border-zinc-600`}>Draft</span>;
  }
};

export const InvoiceView: React.FC<InvoiceViewProps> = ({ invoices, onNewInvoice, onEditInvoice }) => {
  const [filter, setFilter] = useState<StatusFilter>('all');
  
  const filteredInvoices = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const updatedInvoices = invoices.map(inv => {
        if (inv.status !== 'paid' && inv.due_date < today) {
            return { ...inv, status: 'overdue' as 'overdue' };
        }
        return inv;
    });

    if (filter === 'all') return updatedInvoices;
    return updatedInvoices.filter(inv => inv.status === filter);
  }, [invoices, filter]);
  
  return (
    <div className="animate-slide-up space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Invoices</h2>
          <p className="text-sm text-zinc-400">{invoices.length} total invoices</p>
        </div>
        <button 
          onClick={onNewInvoice} 
          className="flex items-center gap-2 px-4 py-2 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors"
        >
          <Plus size={16} /> New Invoice
        </button>
      </header>
      
      <div className="flex bg-zinc-900 border border-white/5 p-1 rounded-lg">
          <TabButton label="All" isActive={filter === 'all'} onClick={() => setFilter('all')} />
          <TabButton label="Draft" isActive={filter === 'draft'} onClick={() => setFilter('draft')} />
          <TabButton label="Sent" isActive={filter === 'sent'} onClick={() => setFilter('sent')} />
          <TabButton label="Paid" isActive={filter === 'paid'} onClick={() => setFilter('paid')} />
          <TabButton label="Overdue" isActive={filter === 'overdue'} onClick={() => setFilter('overdue')} />
      </div>

      <div className="space-y-3">
        {filteredInvoices.length > 0 ? (
          filteredInvoices.map(invoice => (
            <button 
              key={invoice.id}
              onClick={() => onEditInvoice(invoice)}
              className="w-full text-left p-4 bg-zinc-900 border border-white/5 rounded-xl hover:bg-zinc-800 transition-colors flex justify-between items-center"
            >
              <div className="flex items-center gap-4">
                 <div className="p-2 bg-zinc-800 rounded-lg">
                    <FileText size={18} className="text-zinc-400"/>
                 </div>
                 <div>
                    <p className="font-semibold text-white">{invoice.client_name}</p>
                    <p className="text-xs text-zinc-400">
                      Inv #{invoice.invoice_number} • Due: {new Date(invoice.due_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'})}
                    </p>
                 </div>
              </div>
              <div className="flex items-center gap-4">
                 <p className="font-bold text-white text-right">${invoice.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                 <StatusBadge status={invoice.status} />
              </div>
            </button>
          ))
        ) : (
          <div className="text-center py-16 text-zinc-600">
              <FileText size={40} className="mx-auto mb-4" />
              <h3 className="font-bold text-zinc-400">No invoices found</h3>
              <p className="text-sm">There are no invoices matching the "{filter}" filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const TabButton = ({ label, isActive, onClick }: { label: string, isActive: boolean, onClick: () => void }) => (
    <button onClick={onClick} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${isActive ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}>
        {label}
    </button>
);
