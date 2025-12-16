import React from 'react';
import { Property, Transaction } from '../types';
import { Home, TrendingUp, Users } from 'lucide-react';

interface PropertyCardProps {
  property: Property;
  transactions: Transaction[];
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property, transactions }) => {
  const mortgage = property.mortgageBalance || 0;
  const equity = property.currentValue - mortgage; 
  
  // Real Cap Rate Calc: (NOI / Current Value) * 100
  const propertyTransactions = transactions.filter(t => t.propertyId === property.id);
  const noi = propertyTransactions.reduce((acc, t) => acc + t.amount, 0); // Sum of income and expenses
  const capRate = property.currentValue > 0 ? (noi / property.currentValue) * 100 : 0;

  return (
    <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 mb-4 relative overflow-hidden group hover:border-cyan-500/30 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-cyan-900/30 flex items-center justify-center text-cyan-400">
            <Home size={18} />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">{property.address}</h3>
            <p className="text-zinc-500 text-xs">Class {property.ccaClass} Asset</p>
          </div>
        </div>
        <div className={`px-2 py-0.5 rounded text-[10px] font-medium border ${property.tenantName !== 'Vacant' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
          {property.tenantName !== 'Vacant' ? 'Occupied' : 'Vacant'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 py-3 border-t border-white/5">
        <div>
          <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1">Current Value</p>
          <p className="text-white font-bold">${(property.currentValue / 1000).toFixed(0)}k</p>
        </div>
        <div>
          <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1">UCC Balance</p>
          <p className="text-cyan-400 font-bold">${(property.uccBalance / 1000).toFixed(0)}k</p>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-2">
         <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <TrendingUp size={12} />
            <span>Cap Rate: {capRate.toFixed(1)}%</span>
         </div>
         <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Users size={12} />
            <span>Lease: {property.leaseEnd}</span>
         </div>
      </div>
    </div>
  );
};