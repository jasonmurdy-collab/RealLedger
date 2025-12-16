import React from 'react';
import { Property, Transaction } from '../types';
import { Home, TrendingUp, Users, DollarSign } from 'lucide-react';

interface PropertyCardProps {
  property: Property;
  transactions: Transaction[];
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property, transactions }) => {
  const mortgage = property.mortgageBalance || 0;
  
  const propertyTransactions = transactions.filter(t => t.propertyId === property.id);
  const noi = propertyTransactions.reduce((acc, t) => acc + t.amount, 0); 
  const capRate = property.currentValue > 0 ? (noi / property.currentValue) * 100 : 0;
  
  // Advanced CCA Logic (Phase 1)
  // Max Claim = (Opening UCC + (Additions * 0.5)) * Rate
  // Simplified Half-Year rule on additions
  const ccaRate = 0.04; // Class 1
  const maxCca = (property.openingUcc + (property.additions * 0.5)) * ccaRate;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-2xl p-4 mb-4 relative overflow-hidden group hover:border-cyan-500/30 transition-colors shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <Home size={18} />
          </div>
          <div>
            <h3 className="text-zinc-900 dark:text-white font-semibold text-sm">{property.address}</h3>
            <p className="text-zinc-500 text-xs">Class {property.ccaClass} Asset</p>
          </div>
        </div>
        <div className={`px-2 py-0.5 rounded text-[10px] font-medium border ${property.tenantName !== 'Vacant' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' : 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'}`}>
          {property.tenantName !== 'Vacant' ? 'Occupied' : 'Vacant'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 py-3 border-t border-zinc-100 dark:border-white/5">
        <div>
          <p className="text-zinc-400 text-[10px] uppercase tracking-wider mb-1">Current Value</p>
          <p className="text-zinc-900 dark:text-white font-bold">${(property.currentValue / 1000).toFixed(0)}k</p>
        </div>
        <div>
          <p className="text-zinc-400 text-[10px] uppercase tracking-wider mb-1">Max CCA Claim</p>
          <p className="text-cyan-600 dark:text-cyan-400 font-bold">${(maxCca).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-2">
         <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <TrendingUp size={12} />
            <span>Cap: {capRate.toFixed(1)}%</span>
         </div>
         <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <Users size={12} />
            <span>Lease: {property.leaseEnd}</span>
         </div>
      </div>
    </div>
  );
};