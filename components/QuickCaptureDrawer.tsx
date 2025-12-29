import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Receipt, Building, Briefcase, Calculator, Camera, Check, UploadCloud, Trash2, Mic, Sparkles, XCircle, CreditCard, Wallet, ArrowDown, ArrowUp, Zap, Target } from 'lucide-react';
import { ComplianceAssistant } from './ComplianceAssistant';
import { Property, Transaction, LedgerType, TaxForm, BudgetCategory } from '../types';
import { ONTARIO_HST_RATE } from '../constants';
import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from '../supabaseClient';
import { generateJournalEntryPayload } from '../utils/accountingEngine';

interface QuickCaptureDrawerProps {
  isOpen: boolean; // Kept for consistency and potential parent animations, though mounting handles visibility now
  onClose: () => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'status'> | Omit<Transaction, 'id' | 'status'>[]) => Promise<void>;
  properties: Property[];
  budgets: BudgetCategory[];
}

const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => {
    const result = reader.result as string;
    resolve(result.split(',')[1]);
  };
  reader.onerror = error => reject(error);
});

interface AiSuggestion {
  ledgerType?: LedgerType;
  taxForm?: TaxForm;
  hstIncluded?: boolean;
  propertyId?: string;
  category?: string;
}

const expenseCategories = ['Supplies', 'Repairs', 'Fuel/Auto', 'Meals', 'Advertising', 'Utilities', 'Rent', 'Insurance'];
const incomeCategories = ['Commission', 'Rental Income', 'Consulting', 'Referral Fee', 'Other Income'];

export const QuickCaptureDrawer: React.FC<QuickCaptureDrawerProps> = ({ isOpen, onClose, onAddTransaction, properties, budgets }) => {
  // Initial state logic is now clean because component remounts on open
  const [entryType, setEntryType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState<string>('');
  const [vendor, setVendor] = useState('');
  const [splitRatio, setSplitRatio] = useState(50);
  const [includeHST, setIncludeHST] = useState(true);
  const [category, setCategory] = useState('Supplies');
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState(properties.length > 0 ? properties[0].id : '');
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'bank' | 'cash'>('credit_card');
  const recognitionRef = useRef<any | null>(null);

  const currentLedger = splitRatio === 100 ? 'active' : (splitRatio === 0 ? 'passive' : 'personal');

  // Budget Impact Calculation
  const budgetImpact = useMemo(() => {
    if (entryType === 'income' || !amount) return null;
    const numAmt = parseFloat(amount) || 0;
    
    // Filter budgets for the currently implied ledger
    const relevantBudgets = budgets.filter(b => b.ledger_type === currentLedger);
    const targetBudget = relevantBudgets.find(b => b.category.toLowerCase() === category.toLowerCase());
    
    if (!targetBudget) return null;

    const newTotal = targetBudget.spent + numAmt;
    const percentage = Math.min((newTotal / targetBudget.limit) * 100, 100);
    const isOver = newTotal > targetBudget.limit;
    
    return {
        category: targetBudget.category,
        limit: targetBudget.limit,
        current: targetBudget.spent,
        impact: numAmt,
        percentage,
        isOver
    };
  }, [category, amount, budgets, entryType, currentLedger]);

  useEffect(() => {
    setCategory(entryType === 'expense' ? 'Supplies' : 'Commission');
  }, [entryType]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
        if (amount && vendor && vendor.length > 2 && category && isOpen) {
            getAiSuggestions();
        } else {
            setAiSuggestions(null);
        }
    }, 800);
    return () => clearTimeout(debounceTimer);
  }, [amount, vendor, category, isOpen, entryType]);

  const getAiSuggestions = async () => {
    if (!amount || !vendor || !category) return;
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const prompt = `Based on an ${entryType} of $${amount} from ${vendor} categorized as ${category}, suggest the most likely LedgerType (active, passive, personal), TaxForm (t2125, t776, or undefined), if HST is typically Included (boolean), and if it's for a property (provide a propertyId from this list if applicable, otherwise undefined: ${properties.map(p => `{id: "${p.id}", address: "${p.address}"}`).join(', ')}). Respond with a JSON object only.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        ledgerType: { type: Type.STRING, enum: ['active', 'passive', 'personal'] },
                        taxForm: { type: Type.STRING, enum: ['t2125', 't776'] },
                        hstIncluded: { type: Type.BOOLEAN },
                        propertyId: { type: Type.STRING },
                        category: { type: Type.STRING } 
                    },
                },
            },
        });
        const parsedData = JSON.parse(response.text.trim());
        if (parsedData.propertyId && !properties.some(p => p.id === parsedData.propertyId)) {
            parsedData.propertyId = undefined;
        }
        setAiSuggestions(parsedData);
    } catch (error) {
        setAiSuggestions(null);
    }
  };

  const handleLogTransaction = async () => {
    setIsSaving(true);
    try {
      const numAmount = parseFloat(amount) || 0;
      if (numAmount === 0) return;
      const finalAmount = entryType === 'expense' ? -numAmount : numAmount;
      const isSplit = splitRatio > 0 && splitRatio < 100;
      const date = new Date().toISOString().split('T')[0];
      let finalReceiptUrl: string | undefined = undefined;

      if (receiptImage) {
        try {
            const response = await fetch(receiptImage);
            const blob = await response.blob();
            const fileName = `${Date.now()}.jpg`;
            const user = (await supabase.auth.getUser()).data.user;
            if (user) {
                const filePath = `${user.id}/${fileName}`;
                const { error: uploadError } = await supabase.storage.from('receipts').upload(filePath, blob);
                if (!uploadError) {
                    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(filePath);
                    finalReceiptUrl = urlData.publicUrl;
                }
            }
        } catch (storageErr) {}
      }
      
      const hstAmount = includeHST ? numAmount - (numAmount / (1 + ONTARIO_HST_RATE)) : 0;
      const subtotal = numAmount - hstAmount;
      const activeAllocation = (subtotal * (splitRatio / 100));
      const passiveAllocation = (subtotal * ((100 - splitRatio) / 100));
      const isCommission = entryType === 'income' && category === 'Commission';

      if (isSplit) {
        const transactionsToCreate: Omit<Transaction, 'id' | 'status'>[] = [];
        if (activeAllocation > 0) {
           transactionsToCreate.push({
             date, vendor, amount: entryType === 'expense' ? -activeAllocation : activeAllocation,
             type: 'active', category, taxForm: 't2125', isSplit: true, hstIncluded: includeHST,
             hstAmount: hstAmount * (splitRatio / 100), receiptUrl: finalReceiptUrl, is_commission: isCommission,
           });
        }
        if (passiveAllocation > 0) {
           transactionsToCreate.push({
             date, vendor, amount: entryType === 'expense' ? -passiveAllocation : passiveAllocation,
             type: 'passive', category, taxForm: 't776', isSplit: true, propertyId: selectedProperty,
             hstIncluded: includeHST, hstAmount: hstAmount * ((100 - splitRatio) / 100), receiptUrl: finalReceiptUrl,
           });
        }
        await onAddTransaction(transactionsToCreate);
      } else {
        const ledgerType: LedgerType = splitRatio === 100 ? 'active' : (splitRatio === 0 ? 'passive' : 'personal'); 
        const newTransaction: Omit<Transaction, 'id' | 'status'> = {
          date, vendor, amount: finalAmount, type: ledgerType, category,
          taxForm: ledgerType === 'active' ? 't2125' : ledgerType === 'passive' ? 't776' : undefined,
          isSplit: false, propertyId: ledgerType === 'passive' ? selectedProperty : undefined,
          hstIncluded: includeHST, hstAmount, receiptUrl: finalReceiptUrl, is_commission: isCommission,
        };
        await onAddTransaction(newTransaction);
      }
      onClose();
    } catch (error) {
      alert("Error saving transaction.");
    } finally {
      setIsSaving(false);
    }
  };

  const numAmount = parseFloat(amount) || 0;
  const hstAmount = includeHST ? numAmount - (numAmount / (1 + ONTARIO_HST_RATE)) : 0;
  const categoriesToShow = entryType === 'expense' ? expenseCategories : incomeCategories;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-[#0e0e11] rounded-t-3xl border-t border-zinc-200 dark:border-white/10 shadow-2xl animate-slide-up h-[92vh] overflow-y-auto hide-scrollbar transition-colors">
        
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#0e0e11]/95 backdrop-blur-md pb-4 pt-4 px-6 border-b border-zinc-100 dark:border-white/5">
          <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-6" />
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Intelligent Capture</h2>
            <button onClick={onClose} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
              <X size={20} className="text-zinc-500 dark:text-zinc-400" />
            </button>
          </div>

          <div className="flex flex-col items-center justify-center mb-2 relative">
            <div className="flex items-center gap-2">
                <span className={`text-4xl font-light transition-colors ${entryType === 'expense' ? 'text-rose-500' : 'text-emerald-500'}`}>$</span>
                <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="bg-transparent text-5xl font-bold text-zinc-900 dark:text-white text-center w-48 focus:outline-none placeholder:text-zinc-200 dark:placeholder:text-zinc-700"
                autoFocus={true}
                />
            </div>
          </div>
        </div>

        <div className="p-6 pt-2 space-y-6">
          <div className="space-y-4">
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-white/5">
                <button onClick={() => setEntryType('expense')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${entryType === 'expense' ? 'bg-rose-500 text-white shadow' : 'text-zinc-500'}`}><ArrowDown size={14}/> Expense</button>
                <button onClick={() => setEntryType('income')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${entryType === 'income' ? 'bg-emerald-500 text-white shadow' : 'text-zinc-500'}`}><ArrowUp size={14}/> Income</button>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-1 rounded-xl flex gap-1 border border-zinc-200 dark:border-white/5">
                <input 
                    type="text" 
                    placeholder={entryType === 'expense' ? "Vendor (e.g. Home Depot)" : "Source (e.g. Brokerage)"}
                    className="flex-1 bg-transparent px-4 py-3 text-zinc-900 dark:text-white focus:outline-none font-medium"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                />
            </div>

            <div className="space-y-3">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Allocation Category</label>
                <div className="grid grid-cols-3 gap-2">
                    {categoriesToShow.map(cat => {
                        const isSuggested = aiSuggestions?.category?.toLowerCase() === cat.toLowerCase();
                        return (
                            <button 
                                key={cat}
                                onClick={() => setCategory(cat)}
                                className={`relative py-3 rounded-xl text-[10px] font-black uppercase tracking-tight border transition-all ${category === cat ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white shadow-lg' : isSuggested ? 'bg-violet-500/10 text-violet-600 border-violet-500/30' : 'bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800'}`}
                            >
                                {isSuggested && <div className="absolute -top-1.5 -right-1.5 p-0.5 bg-violet-600 text-white rounded-full"><Zap size={10} fill="currentColor" /></div>}
                                {cat}
                            </button>
                        );
                    })}
                </div>
            </div>
          </div>

          {budgetImpact && (
              <div className={`p-4 rounded-2xl border animate-slide-up shadow-sm transition-colors ${budgetImpact.isOver ? 'bg-rose-500/5 border-rose-500/20' : 'bg-violet-500/5 border-violet-500/20'}`}>
                 <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        <Target size={14} className={budgetImpact.isOver ? 'text-rose-500' : 'text-violet-500'} />
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Budget Impact: {budgetImpact.category}</span>
                    </div>
                    <span className={`text-[10px] font-black uppercase ${budgetImpact.isOver ? 'text-rose-500' : 'text-violet-500'}`}>
                        {budgetImpact.percentage.toFixed(0)}% Utilized
                    </span>
                 </div>
                 <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden shadow-inner">
                    <div 
                        className={`h-full transition-all duration-700 ease-out ${budgetImpact.isOver ? 'bg-rose-500' : 'bg-violet-600'}`} 
                        style={{ width: `${budgetImpact.percentage}%` }}
                    />
                 </div>
                 {budgetImpact.isOver && (
                     <p className="text-[10px] text-rose-500 font-bold mt-2 flex items-center gap-1">
                        <XCircle size={10} /> This transaction exceeds your planned {budgetImpact.category} limit.
                     </p>
                 )}
              </div>
          )}

          <div className="bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl p-5 border border-zinc-200 dark:border-white/5 shadow-sm">
            <div className="flex justify-between items-end mb-4">
              <div className="text-left text-rose-500">
                <p className="text-[10px] font-black tracking-widest uppercase">ACTIVE</p>
                <p className="text-xl font-black">${((numAmount - hstAmount) * (splitRatio / 100)).toFixed(2)}</p>
              </div>
              <div className="text-right text-cyan-600 dark:text-cyan-400">
                <p className="text-[10px] font-black tracking-widest uppercase">PASSIVE</p>
                <p className="text-xl font-black">${((numAmount - hstAmount) * ((100 - splitRatio) / 100)).toFixed(2)}</p>
              </div>
            </div>
            <div className="relative h-8 flex items-center mb-4 touch-none">
              <div className="absolute w-full h-3 rounded-full flex bg-zinc-200 dark:bg-zinc-800">
                <div className="h-full bg-rose-500" style={{ width: `${splitRatio}%` }}></div>
                <div className="h-full bg-cyan-500" style={{ width: `${100 - splitRatio}%` }}></div>
              </div>
              <input type="range" min="0" max="100" step="5" value={splitRatio} onChange={(e) => setSplitRatio(Number(e.target.value))} className="absolute w-full z-20 opacity-0 cursor-pointer h-full" />
              <div className="absolute z-10 w-8 h-8 bg-white rounded-full shadow-lg border border-zinc-200 flex items-center justify-center pointer-events-none" style={{ left: `calc(${splitRatio}% - 16px)` }}><div className="w-1 h-3 bg-zinc-300 rounded-full"></div></div>
            </div>
            {splitRatio < 100 && properties.length > 0 && (
                <div className="bg-white dark:bg-zinc-900/80 rounded-lg p-2 border border-zinc-200 dark:border-white/5 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase whitespace-nowrap pl-2">Property:</span>
                    <select value={selectedProperty} onChange={(e) => setSelectedProperty(e.target.value)} className="bg-transparent text-sm text-cyan-600 dark:text-cyan-400 font-bold w-full focus:outline-none">
                        {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
                    </select>
                </div>
            )}
          </div>

          <ComplianceAssistant category={category} amount={numAmount} isVisible={entryType==='expense'} />

          <div className="pt-4 pb-8">
             <button onClick={handleLogTransaction} disabled={isSaving || numAmount === 0 || !vendor} className="w-full py-4 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black font-black text-lg shadow-xl hover:opacity-90 transition-all flex items-center justify-center gap-2">
                {isSaving ? <div className="w-6 h-6 border-2 border-zinc-500 border-t-zinc-900 rounded-full animate-spin"></div> : <><UploadCloud size={20} /> Finalize Entry</>}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};