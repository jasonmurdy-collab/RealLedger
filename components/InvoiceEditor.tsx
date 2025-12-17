import React, { useState, useEffect } from 'react';
import { Invoice, LineItem } from '../types';
import { X, Save, Trash2, Plus, FileText, Send, CheckCircle, Clock } from 'lucide-react';
import { ONTARIO_HST_RATE } from '../constants';

interface InvoiceEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoice: Omit<Invoice, 'id'> | Invoice) => Promise<void>;
  onDelete?: (invoiceId: string) => Promise<void>;
  invoice: Omit<Invoice, 'id'> | Invoice | null;
}

const getNextInvoiceNumber = (lastInvoiceNumber: string): string => {
    if (!lastInvoiceNumber) return "0001";
    const numPart = parseInt(lastInvoiceNumber.replace(/[^0-9]/g, ''), 10);
    return (numPart + 1).toString().padStart(4, '0');
};

export const InvoiceEditor: React.FC<InvoiceEditorProps> = ({ isOpen, onClose, onSave, onDelete, invoice }) => {
  const [formData, setFormData] = useState<Omit<Invoice, 'id'> | Invoice | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (invoice) {
        setFormData(JSON.parse(JSON.stringify(invoice))); // Deep copy to avoid mutation
    } else if (isOpen) {
        // New Invoice
        const today = new Date().toISOString().split('T')[0];
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        
        setFormData({
            invoice_number: '0001', // This should be fetched/calculated
            client_name: '',
            client_email: '',
            client_address: '',
            invoice_date: today,
            due_date: dueDate.toISOString().split('T')[0],
            items: [{ id: `item-${Date.now()}`, description: 'Real estate commission', quantity: 1, price: 0 }],
            status: 'draft',
            notes: 'Thank you for your business!',
            subtotal: 0,
            hst_amount: 0,
            total_amount: 0,
        });
    }
  }, [invoice, isOpen]);
  
  // Recalculate totals whenever items change
  useEffect(() => {
      if (formData) {
          const subtotal = formData.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
          const hst_amount = subtotal * ONTARIO_HST_RATE;
          const total_amount = subtotal + hst_amount;
          setFormData(prev => prev ? { ...prev, subtotal, hst_amount, total_amount } : null);
      }
  }, [formData?.items]);

  if (!isOpen || !formData) return null;

  const handleChange = (field: keyof Invoice, value: any) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
  };
  
  const handleItemChange = (itemId: string, field: keyof LineItem, value: any) => {
      setFormData(prev => {
          if (!prev) return null;
          const newItems = prev.items.map(item => {
              if (item.id === itemId) {
                  return { ...item, [field]: value };
              }
              return item;
          });
          return { ...prev, items: newItems };
      });
  };

  const addItem = () => {
    setFormData(prev => prev ? {
        ...prev,
        items: [...prev.items, { id: `item-${Date.now()}`, description: '', quantity: 1, price: 0 }]
    } : null);
  };
  
  const removeItem = (itemId: string) => {
      setFormData(prev => prev ? {
          ...prev,
          items: prev.items.filter(item => item.id !== itemId)
      } : null);
  };

  const handleSaveWrapper = async (newStatus?: Invoice['status']) => {
    if (!formData) return;
    setIsSaving(true);
    const dataToSave = { ...formData };
    if (newStatus) {
        dataToSave.status = newStatus;
    }
    try {
        await onSave(dataToSave);
        onClose();
    } catch(err) {
        console.error("Save invoice failed", err);
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 p-4 sm:p-6 animate-slide-up">
      <div className="max-w-4xl mx-auto h-full flex flex-col">
        {/* Header */}
        <header className="flex-shrink-0 flex justify-between items-center py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <FileText size={24} className="text-rose-400" />
            <h2 className="text-xl font-bold text-white">
              { 'id' in formData ? `Edit Invoice #${formData.invoice_number}` : 'Create New Invoice' }
            </h2>
          </div>
          <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700">
            <X size={18} className="text-zinc-400" />
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto hide-scrollbar py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* Left Column: Client & Dates */}
             <div className="space-y-6">
                <section>
                    <h3 className="text-sm font-semibold text-zinc-400 mb-2">Bill To</h3>
                    <div className="space-y-2">
                        <input type="text" placeholder="Client Name" value={formData.client_name} onChange={e => handleChange('client_name', e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-md p-2 text-white" />
                        <input type="email" placeholder="Client Email" value={formData.client_email} onChange={e => handleChange('client_email', e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-md p-2 text-white" />
                        <textarea placeholder="Client Address" value={formData.client_address} onChange={e => handleChange('client_address', e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-md p-2 text-white min-h-[80px]"></textarea>
                    </div>
                </section>
                <section>
                    <h3 className="text-sm font-semibold text-zinc-400 mb-2">Details</h3>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="text-xs text-zinc-500 block mb-1">Invoice #</label>
                           <input type="text" value={formData.invoice_number} onChange={e => handleChange('invoice_number', e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-md p-2 text-white" />
                        </div>
                         <div>
                           <label className="text-xs text-zinc-500 block mb-1">Status</label>
                           <p className={`p-2 rounded-md font-semibold text-xs text-center ${formData.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-300'}`}>{formData.status.toUpperCase()}</p>
                        </div>
                        <div>
                           <label className="text-xs text-zinc-500 block mb-1">Invoice Date</label>
                           <input type="date" value={formData.invoice_date} onChange={e => handleChange('invoice_date', e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-md p-2 text-white" />
                        </div>
                        <div>
                           <label className="text-xs text-zinc-500 block mb-1">Due Date</label>
                           <input type="date" value={formData.due_date} onChange={e => handleChange('due_date', e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-md p-2 text-white" />
                        </div>
                     </div>
                </section>
             </div>
             
             {/* Right Column: Items & Totals */}
             <div className="space-y-6">
                 <section>
                    <h3 className="text-sm font-semibold text-zinc-400 mb-2">Items</h3>
                    <div className="space-y-2">
                        {formData.items.map((item, index) => (
                            <div key={item.id} className="grid grid-cols-[1fr,80px,100px,auto] gap-2 items-center">
                                <input type="text" placeholder="Description" value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} className="bg-zinc-900 border border-white/10 rounded-md p-2 text-white" />
                                <input type="number" placeholder="Qty" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', parseFloat(e.target.value))} className="bg-zinc-900 border border-white/10 rounded-md p-2 text-white text-right" />
                                <input type="number" placeholder="Price" value={item.price} onChange={e => handleItemChange(item.id, 'price', parseFloat(e.target.value))} className="bg-zinc-900 border border-white/10 rounded-md p-2 text-white text-right" />
                                <button onClick={() => removeItem(item.id)} className="text-zinc-500 hover:text-rose-400 p-2"><Trash2 size={14}/></button>
                            </div>
                        ))}
                    </div>
                    <button onClick={addItem} className="mt-2 text-rose-400 text-xs font-semibold flex items-center gap-1"><Plus size={14}/> Add Item</button>
                 </section>
                 
                 <section className="bg-zinc-900 border border-white/10 rounded-lg p-4 space-y-3">
                     <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Subtotal</span>
                        <span className="text-white">${formData.subtotal.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">HST (13%)</span>
                        <span className="text-white">${formData.hst_amount.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between font-bold text-lg border-t border-white/10 pt-3 mt-3">
                        <span className="text-white">Total</span>
                        <span className="text-rose-400">${formData.total_amount.toFixed(2)}</span>
                     </div>
                 </section>
                 <section>
                    <h3 className="text-sm font-semibold text-zinc-400 mb-2">Notes</h3>
                    <textarea placeholder="Optional notes for the client..." value={formData.notes} onChange={e => handleChange('notes', e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-md p-2 text-white min-h-[80px]"></textarea>
                 </section>
             </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="flex-shrink-0 flex flex-wrap justify-between items-center gap-4 py-4 border-t border-white/10">
          <div>
            {'id' in formData && onDelete && (
                <button 
                  onClick={() => onDelete( (formData as Invoice).id )}
                  disabled={isDeleting}
                  className="px-4 py-2 text-rose-400 text-sm font-semibold flex items-center gap-2"
                >
                    <Trash2 size={16}/> Delete Invoice
                </button>
            )}
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => handleSaveWrapper('draft')} disabled={isSaving} className="px-4 py-2 text-white text-sm font-semibold bg-zinc-700 rounded-lg hover:bg-zinc-600 disabled:opacity-50">
                Save Draft
             </button>
             {formData.status !== 'paid' && (
                <button onClick={() => handleSaveWrapper('sent')} disabled={isSaving} className="px-4 py-2 text-white text-sm font-semibold bg-zinc-700 rounded-lg hover:bg-zinc-600 disabled:opacity-50 flex items-center gap-2">
                    <Send size={14}/> Mark as Sent
                </button>
             )}
              {formData.status !== 'paid' ? (
                <button onClick={() => handleSaveWrapper('paid')} disabled={isSaving} className="px-5 py-2 text-black text-sm font-bold bg-emerald-400 rounded-lg hover:bg-emerald-300 disabled:opacity-50 flex items-center gap-2">
                    <CheckCircle size={14}/> Mark as Paid
                </button>
              ) : (
                 <button onClick={() => handleSaveWrapper()} disabled={isSaving} className="px-5 py-2 text-black text-sm font-bold bg-white rounded-lg hover:bg-zinc-200 disabled:opacity-50 flex items-center gap-2">
                    <Save size={14}/> Save Changes
                </button>
              )}
          </div>
        </footer>
      </div>
    </div>
  );
};
