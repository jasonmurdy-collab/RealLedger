import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, UploadCloud, FileText, Check, Loader2, ArrowRight, Download, RefreshCw, Briefcase, Building, UserCircle } from 'lucide-react';
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

type BusinessContext = { type: 'active' } | { type: 'passive', propertyId: string };
type AssignedDraft = DraftTransaction & { assignedLedger: LedgerType, propertyId?: string };

export const BankStatementUpload: React.FC<BankStatementUploadProps> = ({ isOpen, onClose, onImport, properties, currentMode }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  
  // Swipe state
  const [drafts, setDrafts] = useState<DraftTransaction[]>([]);
  const [reviewed, setReviewed] = useState<AssignedDraft[]>([]);
  const [businessContext, setBusinessContext] = useState<BusinessContext>({ type: 'active' });
  
  // Card interaction state
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardPosition, setCardPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
      // Reset component state when it's closed
      if (!isOpen) {
          setFile(null);
          setIsProcessing(false);
          setStep('upload');
          setDrafts([]);
          setReviewed([]);
          setBusinessContext({ type: 'active' });
      }
  }, [isOpen]);

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
        contents: [{ parts: [{ text: `Analyze this bank statement document. Extract all transaction line items. Return a JSON array of objects, each with: date (YYYY-MM-DD), vendor (clean name), amount (number, negative for debits), description (raw text), and category_guess.` }, { inlineData: { mimeType: file.type, data: base64Data } }] }],
        config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { date: { type: Type.STRING }, vendor: { type: Type.STRING }, amount: { type: Type.NUMBER }, description: { type: Type.STRING }, category_guess: { type: Type.STRING } }, required: ["date", "vendor", "amount", "category_guess"] } } }
      });

      const rawData = JSON.parse(response.text.trim());
      const drafted: DraftTransaction[] = rawData.map((item: any, idx: number) => ({ ...item, id: `draft-${idx}-${Date.now()}`, selected: true }));
      setDrafts(drafted);
      setStep('review');
    } catch (error) { console.error("Gemini Parsing Error:", error); alert("Failed to parse the statement."); } finally { setIsProcessing(false); }
  };

  const currentDraft = useMemo(() => drafts.length > 0 ? drafts[drafts.length - 1] : null, [drafts]);

  const swipe = (direction: 'left' | 'right') => {
      if (!currentDraft) return;

      const assignedLedger = direction === 'left' ? businessContext.type : 'personal';
      const propertyId = (direction === 'left' && businessContext.type === 'passive') ? businessContext.propertyId : undefined;
      
      const newReviewed: AssignedDraft = { ...currentDraft, assignedLedger, propertyId };
      
      setReviewed(prev => [...prev, newReviewed]);
      setDrafts(prev => prev.slice(0, -1));
  };
  
  const undoLastSwipe = () => {
      if (reviewed.length === 0) return;
      const lastReviewed = reviewed[reviewed.length - 1];
      setDrafts(prev => [...prev, lastReviewed]);
      setReviewed(prev => prev.slice(0, -1));
  };

  const handleFinalImport = async () => {
      if (reviewed.length === 0) return;
      const transactionsToImport: Omit<Transaction, 'id' | 'status'>[] = reviewed.map(draft => {
         const isExpense = draft.amount < 0;
         const absAmount = Math.abs(draft.amount);
         const hstAmount = isExpense ? absAmount - (absAmount / (1 + ONTARIO_HST_RATE)) : 0;
         return {
             date: draft.date, vendor: draft.vendor, amount: draft.amount, type: draft.assignedLedger, category: draft.category_guess,
             taxForm: draft.assignedLedger === 'active' ? 't2125' : draft.assignedLedger === 'passive' ? 't776' : undefined,
             propertyId: draft.assignedLedger === 'passive' ? draft.propertyId : undefined,
             hstIncluded: isExpense, hstAmount, isSplit: false,
         };
      });
      await onImport(transactionsToImport);
      onClose();
  };
  
  // Simple swipe logic
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!cardRef.current) return;
    setIsDragging(true);
    cardRef.current.setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !cardRef.current) return;
    setCardPosition({ x: cardPosition.x + e.movementX, y: cardPosition.y + e.movementY });
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging || !cardRef.current) return;
    setIsDragging(false);
    cardRef.current.releasePointerCapture(e.pointerId);
    
    const threshold = window.innerWidth / 4;
    if (cardPosition.x > threshold) {
        swipe('right');
    } else if (cardPosition.x < -threshold) {
        swipe('left');
    }
    setCardPosition({ x: 0, y: 0 });
  };

  const rotation = cardPosition.x / 20;
  const cardOpacity = 1 - Math.abs(cardPosition.x) / (window.innerWidth / 2);

  // FIX: Prevent component from rendering if isOpen is false.
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6">
      <div className="bg-zinc-950 w-full max-w-lg rounded-3xl p-6 border border-white/10 animate-slide-up flex flex-col max-h-[95vh] h-full shadow-2xl">
        <div className="flex justify-between items-center mb-6 shrink-0">
            <div><h3 className="text-xl font-bold text-white flex items-center gap-2"><UploadCloud size={24} className="text-rose-500"/> Bookkeeping Session</h3><p className="text-sm text-zinc-500">Rapid Statement Reconciliation</p></div>
            <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700"><X size={18} className="text-zinc-500"/></button>
        </div>
        
        {step === 'upload' && (
            <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-zinc-700 rounded-2xl bg-zinc-900/50 p-12 transition-colors hover:border-rose-500/50">
                {isProcessing ? (
                    <div className="text-center">
                        <Loader2 size={48} className="text-rose-500 animate-spin mx-auto mb-4" />
                        <h4 className="text-xl font-bold text-white mb-2">Analyzing Document...</h4>
                        <p className="text-zinc-500">Gemini is extracting transaction lines.</p>
                    </div>
                ) : (
                    <>
                        <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-6">
                            <FileText size={40} />
                        </div>
                        <h4 className="text-xl font-bold text-white mb-2">Upload Your Statement</h4>
                        <p className="text-zinc-500 text-center max-w-md mb-8">
                            Select a PDF or image of your bank statement to begin a rapid categorization session.
                        </p>
                        
                        <label className="relative cursor-pointer">
                            <input 
                                type="file" 
                                accept=".pdf,.jpg,.jpeg,.png" 
                                className="hidden" 
                                onChange={handleFileChange}
                            />
                            <div className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-opacity">
                                Select File
                            </div>
                        </label>
                        {file && (
                            <div className="mt-6 flex items-center gap-4 animate-slide-up">
                                <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-lg text-sm font-medium text-zinc-300">
                                    <Check size={14} className="text-emerald-500" />
                                    {file.name}
                                </div>
                                <button 
                                    onClick={processStatement}
                                    className="px-6 py-2 bg-rose-500 text-white font-bold rounded-lg hover:bg-rose-600 transition-colors flex items-center gap-2"
                                >
                                    Start Session <ArrowRight size={16} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        )}

        {step === 'review' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="mb-4 p-2 bg-zinc-900 rounded-xl border border-white/5 flex items-center gap-2 text-xs">
                <span className="text-zinc-500 font-medium pl-2">Business Context:</span>
                <button onClick={() => setBusinessContext({type: 'active'})} className={`px-2 py-1 rounded-md font-bold flex items-center gap-1 ${businessContext.type === 'active' ? 'bg-rose-500/20 text-rose-300' : 'text-zinc-400'}`}><Briefcase size={12}/> Active</button>
                <select onChange={(e) => setBusinessContext({type: 'passive', propertyId: e.target.value})} value={businessContext.type === 'passive' ? businessContext.propertyId : ''} className={`px-2 py-1 rounded-md font-bold flex items-center gap-1 appearance-none bg-transparent ${businessContext.type === 'passive' ? 'bg-cyan-500/20 text-cyan-300' : 'text-zinc-400'}`}>
                    <option value="" disabled>Passive</option>
                    {properties.map(p => <option key={p.id} value={p.id} className="bg-zinc-800">{p.address}</option>)}
                </select>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center relative">
                {drafts.length > 0 ? (
                    <>
                      <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-full text-rose-500 font-bold uppercase tracking-widest text-lg opacity-20 -rotate-12">Business</div>
                      <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-full text-violet-500 font-bold uppercase tracking-widest text-lg opacity-20 rotate-12">Personal</div>
                      <div className="absolute w-full h-full">
                        {drafts.slice(-3).map((draft, index) => {
                          const isTopCard = index === drafts.slice(-3).length - 1;
                          return (
                            <div key={draft.id}
                              ref={isTopCard ? cardRef : null}
                              onPointerDown={isTopCard ? handlePointerDown : undefined}
                              onPointerMove={isTopCard ? handlePointerMove : undefined}
                              onPointerUp={isTopCard ? handlePointerUp : undefined}
                              className="absolute inset-0 w-full h-full flex items-center justify-center transition-transform duration-300 ease-out"
                              style={{
                                transform: isTopCard ? `translate(${cardPosition.x}px, ${cardPosition.y}px) rotate(${rotation}deg) scale(1)` : `translateY(${(2-index) * -10}px) scale(${1 - (2-index)*0.05})`,
                                opacity: isTopCard ? cardOpacity : 1,
                                zIndex: 10 + index,
                                touchAction: 'none'
                              }}
                            >
                                <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-xs p-6 shadow-2xl space-y-4">
                                  <div className="flex justify-between items-baseline">
                                      <p className="font-bold text-white text-lg">{draft.vendor}</p>
                                      <p className={`font-bold text-lg ${draft.amount > 0 ? 'text-emerald-400' : 'text-white'}`}>{draft.amount > 0 ? '+' : ''}${Math.abs(draft.amount).toFixed(2)}</p>
                                  </div>
                                  <div className="text-center">
                                      <p className="text-xs text-zinc-500">{new Date(draft.date).toLocaleDateString('en-CA', {weekday: 'long', month: 'long', day: 'numeric'})}</p>
                                      <span className="px-2 py-0.5 mt-2 inline-block rounded-full bg-white/5 text-xs border border-white/10 text-zinc-400">{draft.category_guess}</span>
                                  </div>
                                </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                ) : (
                    <div className="text-center">
                        <Check size={48} className="text-emerald-500 mx-auto mb-4" />
                        <h4 className="text-xl font-bold text-white mb-2">All Done!</h4>
                        <p className="text-zinc-500 max-w-xs">You've categorized all {reviewed.length} transactions from this statement.</p>
                    </div>
                )}
              </div>
              <div className="h-28 shrink-0 flex items-center justify-around">
                <button onClick={() => swipe('left')} className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 border-2 border-rose-500/30 flex items-center justify-center"><Briefcase size={28} /></button>
                <button onClick={undoLastSwipe} disabled={reviewed.length === 0} className="text-zinc-500 hover:text-white disabled:opacity-30"><RefreshCw size={20}/></button>
                <button onClick={() => swipe('right')} className="w-16 h-16 rounded-full bg-violet-500/20 text-violet-400 border-2 border-violet-500/30 flex items-center justify-center"><UserCircle size={28} /></button>
              </div>
            </div>
        )}
        {(step === 'review' && reviewed.length > 0) && (
            <div className="pt-4 border-t border-white/5">
                <button onClick={handleFinalImport} className="w-full py-3 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200"><Download size={18}/> Import {reviewed.length} Transactions</button>
            </div>
        )}
      </div>
    </div>
  );
};
