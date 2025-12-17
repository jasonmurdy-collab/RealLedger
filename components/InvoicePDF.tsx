import React from 'react';
import { Invoice, UserProfile } from '../types';

interface InvoicePDFProps {
  invoice: Omit<Invoice, 'id'> | Invoice;
  profile: UserProfile | null;
}

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
    });
};

export const InvoicePDF = React.forwardRef<HTMLDivElement, InvoicePDFProps>(({ invoice, profile }, ref) => {
    return (
        <div ref={ref} className="bg-white text-gray-800 p-12 font-sans" style={{ width: '210mm', minHeight: '297mm', color: '#1f2937'}}>
            <header className="flex justify-between items-start pb-8 border-b border-gray-200">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{profile?.full_name || 'Real Estate Professional'}</h1>
                    <p className="text-gray-500">{profile?.role}</p>
                    {profile?.cra_business_number && <p className="text-gray-500 mt-1">HST/GST: {profile.cra_business_number}</p>}
                </div>
                <div className="text-right">
                    <h2 className="text-4xl font-bold uppercase text-gray-400 tracking-widest">Invoice</h2>
                    <p className="text-gray-500 mt-2"># {invoice.invoice_number}</p>
                </div>
            </header>

            <section className="grid grid-cols-2 gap-8 my-8">
                <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Billed To</h3>
                    <p className="font-bold text-gray-800">{invoice.client_name}</p>
                    {invoice.client_address && <p className="text-gray-600 whitespace-pre-line">{invoice.client_address}</p>}
                    {invoice.client_email && <p className="text-gray-600">{invoice.client_email}</p>}
                </div>
                <div className="text-right">
                    <div className="mb-2">
                        <p className="text-sm font-semibold text-gray-500">Invoice Date</p>
                        <p className="font-medium text-gray-800">{formatDate(invoice.invoice_date)}</p>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-500">Due Date</p>
                        <p className="font-medium text-gray-800">{formatDate(invoice.due_date)}</p>
                    </div>
                </div>
            </section>

            <section>
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-100 text-gray-600 text-sm uppercase">
                            <th className="p-3 font-semibold">Description</th>
                            <th className="p-3 font-semibold text-right">Quantity</th>
                            <th className="p-3 font-semibold text-right">Price</th>
                            <th className="p-3 font-semibold text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {invoice.items.map(item => (
                            <tr key={item.id}>
                                <td className="p-3">{item.description}</td>
                                <td className="p-3 text-right">{item.quantity}</td>
                                <td className="p-3 text-right">${item.price.toFixed(2)}</td>
                                <td className="p-3 text-right">${(item.quantity * item.price).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            <section className="flex justify-end mt-8">
                <div className="w-full max-w-xs space-y-2">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium text-gray-800">${invoice.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">HST (13%)</span>
                        <span className="font-medium text-gray-800">${invoice.hst_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                        <span className="font-bold text-lg text-gray-900">Total Amount Due</span>
                        <span className="font-bold text-lg text-gray-900">${invoice.total_amount.toFixed(2)}</span>
                    </div>
                </div>
            </section>

            {invoice.notes && (
                <section className="mt-12 pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-500 mb-2">Notes</h4>
                    <p className="text-gray-600 text-sm whitespace-pre-line">{invoice.notes}</p>
                </section>
            )}

            <footer className="absolute bottom-10 left-12 right-12 text-center text-xs text-gray-400">
                <p>Thank you for choosing our services.</p>
            </footer>
        </div>
    );
});
