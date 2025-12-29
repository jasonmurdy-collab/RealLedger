import React from 'react';
import { ArrowUpRight, ArrowDownLeft, Edit2 } from 'lucide-react';
import { Transaction } from '../types';

interface TransactionItemProps {
  tx: Transaction;
  onEdit: () => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({ tx, onEdit }) => {
    const isIncome = tx.amount > 0;
    return (
        <div className="flex items-center gap-3 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded-lg group transition-colors">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isIncome ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                {isIncome ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
            </div>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-zinc-900 dark:text-white">{tx.vendor}</p>
                    <button onClick={onEdit} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                        <Edit2 size={12} />
                    </button>
                </div>
                <p className="text-xs text-zinc-500">{tx.category}</p>
            </div>
            <div className="text-right">
                <p className={`font-bold text-sm ${isIncome ? 'text-emerald-600 dark:text-emerald-500' : 'text-zinc-900 dark:text-white'}`}>
                    {isIncome ? '+' : ''}${Math.abs(tx.amount).toLocaleString()}
                </p>
                <p className="text-[10px] text-zinc-400 uppercase">{new Date(tx.date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</p>
            </div>
        </div>
    );
};