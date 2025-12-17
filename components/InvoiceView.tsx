import React from 'react';
import { FileText, Zap } from 'lucide-react';

export const InvoiceView: React.FC = () => {
  return (
    <div className="animate-slide-up flex flex-col items-center justify-center h-full text-center p-6">
      <div className="w-24 h-24 bg-zinc-800/50 border border-white/10 rounded-full flex items-center justify-center mb-6">
        <FileText size={48} className="text-zinc-500" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Invoice Management</h2>
      <p className="text-zinc-400 max-w-sm mb-6">
        Create, send, and track professional invoices directly from RealLedger. This feature is currently in development.
      </p>
      <div className="px-4 py-2 bg-yellow-500/10 text-yellow-400 text-sm font-semibold rounded-full flex items-center gap-2">
        <Zap size={16} />
        Coming Soon
      </div>
    </div>
  );
};
