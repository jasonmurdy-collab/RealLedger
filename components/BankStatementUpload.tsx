import React, { useState } from 'react';
import { X, UploadCloud, FileText, Check, AlertTriangle, Loader2, ArrowRight, Trash2, Edit2, Download, ChevronDown } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, LedgerType, DraftTransaction, Property } from '../types';
import { ONTARIO_HST_RATE } from '../constants';

interface BankStatementUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (transactions: Omit<Transaction, 'id' | 'status'>[]) => Promise<void>;
  properties: Property[];
  currentMode: LedgerType;
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

export const BankStatementUpload: React.FC<BankStatementUploadProps> = ({ isOpen, onClose, onImport, properties, currentMode }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<DraftTransaction[]>([]);
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  
  // Bulk Edit States
  const [targetLedger, setTargetLedger] = useState<LedgerType>(currentMode);
  const [targetProperty, setTargetProperty] = useState<string>(properties.length > 0 ? properties[0].id : '');
  const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkLedgerType, setBulkLedgerType] = useState<LedgerType | ''>('');
  const [bulkProperty, setBulkProperty] = useState('');
  const [bulkHstIncluded, setBulkHstIncluded] = useState<boolean | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const processStatement = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const base64Data = await fileToBase64(file);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            {
                role: 'user',
                parts: [
                    { text: `Analyze this bank statement document. Extract all transaction line items. 
                             Return a JSON array where each object has:
                             - date (YYYY-MM-DD format, assume current year if missing)
                             - vendor (Clean name, remove store numbers)
                             - amount (Number. Negative for debits/spend, Positive for deposits)
                             - description (The raw description text)
                             - category_guess (Guess the expense category based on the vendor, e.g., 'Meals', 'Office', 'Travel', 'Rent', 'Utilities', 'Insurance', 'Repairs')
                             
                             Ignore opening/closing balances or header information. Only extraction transactions.` 
                    },
                    { inlineData: { mimeType: file.type, data: base64Data } }
                ]
            }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    date: { type: Type.STRING },
                    vendor: { type: Type.STRING },
                    amount: { type: Type.NUMBER },
                    description: { type: Type.STRING },
                    category_guess: { type: Type.STRING }
                },
                required: ["date", "vendor", "amount", "category_guess"]
            }
          }
        }
      });

      const rawData = JSON.parse(response.text.trim());
      
      // Add local IDs and selection state
      const drafted: DraftTransaction[] = rawData.map((item: any, idx: number) => ({
          ...item,
          id: `draft-${idx}-${Date.now()}`,
          selected: true
      }));

      setParsedData(drafted);
      setStep('review');

    } catch (error) {
      console.error("Gemini Parsing Error:", error);
      alert("Failed to parse the statement. Please ensure it's a clear PDF or Image.");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelection = (id: string) => {
      setParsedData(prev => prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t));
  };

  const deleteRow = (id: string) => {
      setParsedData(prev => prev.filter(t => t.id !== id));
  };

  const handleApplyBulkAction = (actionType: 'category' | 'ledgerType' | 'property' | 'hstIncluded') => {
    setParsedData(prev => prev.map(t => {
      if (t.selected) {
        let updated = { ...t };
        if (actionType === 'category' && bulkCategory) {
          updated.category_guess = bulkCategory;
        } else if (actionType === 'ledgerType' && bulkLedgerType) {
          // This doesn't directly update the DraftTransaction type which only has `category_guess`
          // For actual import, the `targetLedger` is used. This bulk update is more for a visual hint.
          // For now, we'll keep `targetLedger` as the primary bulk control for ledger type.
        } else if (actionType === 'property' && bulkProperty) {
            // Need a way to link `DraftTransaction` to `propertyId` if needed for visual feedback
            // For now, `targetProperty` is the global bulk property.
        } else if (actionType === 'hstIncluded' && bulkHstIncluded !== null) {
            // This would require modifying DraftTransaction to include hstIncluded if we want to preview it
            // For now, apply it during final import based on bulkHstIncluded state.
        }
        return updated;
      }
      return t;
    }));
    // Reset bulk action states and close dropdown
    setBulkCategory('');
    setBulkLedgerType('');
    setBulkProperty('');
    setBulkHstIncluded(null);
    setIsBulkActionsOpen(false);
  };

  const handleFinalImport = async () => {
      const selectedItems = parsedData.filter(t => t.selected);
      if (selectedItems.length === 0) return;

      const transactionsToImport: Omit<Transaction, 'id' | 'status'>[] = selectedItems.map(draft => {
         // Auto-calculate HST if strictly negative (expense) AND if bulkHstIncluded is not explicitly set to false
         const isExpense = draft.amount < 0;
         const absAmount = Math.abs(draft.amount);
         const shouldIncludeHST = bulkHstIncluded !== null ? bulkHstIncluded : isExpense; // Use bulk value if set, else auto-detect

         const hstAmount = shouldIncludeHST ? absAmount - (absAmount / (1 + ONTARIO_HST_RATE)) : 0;
         
         const finalLedgerType = bulkLedgerType || targetLedger;
         const finalCategory = bulkCategory || draft.category_guess || 'Uncategorized';
         const finalPropertyId = finalLedgerType === 'passive' ? (bulkProperty || targetProperty) : undefined;

         return {
             date: draft.date,
             vendor: draft.vendor,
             amount: draft.amount,
             type: finalLedgerType as LedgerType,
             category: finalCategory,
             taxForm: finalLedgerType === 'active' ? 't2125' : finalLedgerType === 'passive' ? 't776' : undefined,
             propertyId: finalPropertyId,
             hstIncluded: shouldIncludeHST,
             hstAmount: hstAmount,
             isSplit: false
         };
      });

      await onImport(transactionsToImport);
      onClose();
      // Reset state
      setFile(null);
      setParsedData([]);
      setStep('upload');
      setBulkCategory('');
      setBulkLedgerType('');
      setBulkProperty('');
      setBulkHstIncluded(null);
  };

  const selectedCount = parsedData.filter(t => t.selected).length;
  const commonCategories = ['Supplies', 'Repairs', 'Fuel/Auto', 'Meals', 'Advertising', 'Utilities', 'Rent', 'Insurance', 'Mortgage'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-3xl p-6 border border-zinc-200 dark:border-white/10 animate-slide-up flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 shrink-0">
            <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <UploadCloud size={24} className="text-rose-500" />
                    Import Bank Statement
                </h3>
                <p className="text-sm text-zinc-500">AI-Powered Parsing & Reconciliation</p>
            </div>
            <button onClick={onClose} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700">
                <X size={18} className="text-zinc-500" />
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
            
            {step === 'upload' && (
                <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl bg-zinc-50 dark:bg-zinc-800/20 p-12 transition-colors hover:border-rose-500/50">
                    {isProcessing ? (
                        <div className="text-center">
                            <Loader2 size={48} className="text-rose-500 animate-spin mx-auto mb-4" />
                            <h4 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Analyzing Document...</h4>
                            <p className="text-zinc-500">Gemini is extracting transaction lines.</p>
                        </div>
                    ) : (
                        <>
                            <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-6">
                                <FileText size={40} />
                            </div>
                            <h4 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Upload Statement PDF or Image</h4>
                            <p className="text-zinc-500 text-center max-w-md mb-8">
                                Drag and drop your monthly bank statement here. We'll parse the dates, vendors, and amounts automatically.
                            </p>
                            
                            <label className="relative cursor-pointer">
                                <input 
                                    type="file" 
                                    accept=".pdf,.jpg,.jpeg,.png" 
                                    className="hidden" 
                                    onChange={handleFileChange}
                                />
                                <div className="px-8 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold rounded-xl hover:opacity-90 transition-opacity">
                                    Select File
                                </div>
                            </label>
                            {file && (
                                <div className="mt-6 flex items-center gap-4 animate-slide-up">
                                    <div className="flex items-center gap-2 px-4 py-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                        <Check size={14} className="text-emerald-500" />
                                        {file.name}
                                    </div>
                                    <button 
                                        onClick={processStatement}
                                        className="px-6 py-2 bg-rose-500 text-white font-bold rounded-lg hover:bg-rose-600 transition-colors flex items-center gap-2"
                                    >
                                        Parse <ArrowRight size={16} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {step === 'review' && (
                <div className="flex flex-col h-full">
                    {/* Controls */}
                    <div className="flex gap-4 mb-4 p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-white/5 shrink-0 relative">
                        <div className="flex-1">
                            <label className="text-xs text-zinc-500 block mb-1">Import As (Ledger)</label>
                            <div className="flex bg-zinc-200 dark:bg-zinc-900 rounded-lg p-1">
                                <button onClick={() => setTargetLedger('active')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${targetLedger === 'active' ? 'bg-rose-500 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}>Active</button>
                                <button onClick={() => setTargetLedger('passive')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${targetLedger === 'passive' ? 'bg-cyan-500 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}>Passive</button>
                                <button onClick={() => setTargetLedger('personal')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${targetLedger === 'personal' ? 'bg-violet-500 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}>Personal</button>
                            </div>
                        </div>
                        {targetLedger === 'passive' && (
                             <div className="flex-1">
                                <label className="text-xs text-zinc-500 block mb-1">Assign Property</label>
                                <select 
                                    value={targetProperty}
                                    onChange={(e) => setTargetProperty(e.target.value)}
                                    className="w-full bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm text-zinc-900 dark:text-white focus:outline-none"
                                >
                                    {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
                                </select>
                             </div>
                        )}
                        <div className="flex items-end">
                            <div className="px-4 py-2 bg-zinc-200 dark:bg-zinc-900 rounded-lg border border-zinc-300 dark:border-white/10 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                {selectedCount} Items Selected
                            </div>
                        </div>
                    </div>

                    {/* Card List */}
                    <div className="flex-1 overflow-y-auto hide-scrollbar -mx-2 px-2 py-2 space-y-2">
                        {parsedData.map((row) => (
                            <div key={row.id} className={`p-3 rounded-xl border transition-all duration-200 flex items-center gap-3 ${row.selected ? 'bg-zinc-100 dark:bg-zinc-800/50 border-zinc-200 dark:border-white/10' : 'bg-transparent border-transparent hover:bg-zinc-100/50 dark:hover:bg-zinc-800/20'}`}>
                                <div className="p-1">
                                    <input 
                                        type="checkbox" 
                                        checked={row.selected} 
                                        onChange={() => toggleSelection(row.id)}
                                        className="w-5 h-5 rounded border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-rose-500 focus:ring-rose-500/50"
                                    />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                        <p className="font-bold text-sm text-zinc-900 dark:text-white">{row.vendor}</p>
                                        <p className={`font-bold text-sm ${row.amount > 0 ? 'text-emerald-500' : 'text-zinc-900 dark:text-white'}`}>
                                            {row.amount > 0 ? '+' : ''}{row.amount.toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs text-zinc-500">{new Date(row.date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</p>
                                            <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-white/10 text-xs border border-zinc-300 dark:border-white/10 text-zinc-600 dark:text-zinc-400">
                                                {row.category_guess}
                                            </span>
                                        </div>
                                        <button onClick={() => deleteRow(row.id)} className="text-zinc-400 hover:text-rose-500 p-1 rounded-full">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 mt-2 border-t border-zinc-200 dark:border-white/5 flex justify-end gap-3">
                        <button onClick={() => { setParsedData([]); setStep('upload'); }} className="px-6 py-3 text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-medium">
                            Cancel
                        </button>
                        <button 
                            onClick={handleFinalImport}
                            className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold rounded-xl hover:opacity-90 shadow-lg flex items-center gap-2"
                        >
                            <Download size={18} />
                            Import {selectedCount} Transactions
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
