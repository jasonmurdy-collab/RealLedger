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
  
  const [drafts, setDrafts] = useState<DraftTransaction[]>([]);
  const [reviewed, setReviewed] = useState<AssignedDraft[]>([]);
  const [businessContext, setBusinessContext] = useState<BusinessContext>({ type: 'active' });
  
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardPosition, setCardPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
      if (!isOpen) {
          setFile(null);
          setIsProcessing(false);
          setStep('upload');
          setDrafts([]);
          setReviewed([]);
          setBusinessContext({ type: 'active' });
      }
  }, [isOpen]);

  const processStatement = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const base64Data = await fileToBase64(file);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
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
    if (cardPosition.x > threshold) swipe('right');
    else if (cardPosition.x < -threshold) swipe('left');
    setCardPosition({ x: 0, y: 0 });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/80 backdrop-blur-sm p-4 sm:p-6">
      <div className="bg-white dark:bg-zinc-950 w-full max-w-lg rounded-3xl p-6 border border-zinc-200 dark:border-white/10 animate-slide-up flex flex-col max-h-[95vh] h-full shadow-2xl">
        <div className="flex justify-between items-center mb-6 shrink-0">
            <div><h3 className="text-xl font-black text-zinc-900 dark:text-white flex items-center gap-2 uppercase tracking-tighter"><UploadCloud size={24} className="text-rose-500"/> Bookkeeping Session</h3><p className="text-sm text-zinc-500 font-medium">Rapid Statement Reconciliation</p></div>
            <button onClick={onClose} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"><X size={18} className="text-zinc-500"/></button>
        </div>
        
        {step === 'upload' && (
            <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 p-12 transition-colors hover:border-rose-500/50">
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
                        <h4 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Upload Statement</h4>
                        <p className="text-zinc-500 text-center max-w-md mb-8 font-medium">
                            Select a PDF or bank export to begin categorization.
                        </p>
                        
                        <label className="relative cursor-pointer">
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => e.target.files && setFile(e.target.files[0])} />
                            <div className="px-8 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black font-black rounded-xl hover:opacity-90 transition-all shadow-lg">
                                Select File
                            </div>
                        </label>
                        {file && (
                            <div className="mt-6 flex flex-col items-center gap-4 animate-slide-up">
                                <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs font-bold text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-white/5">
                                    {file.name}
                                </div>
                                <button onClick={processStatement} className="px-8 py-2 bg-rose-500 text-white font-black rounded-lg hover:bg-rose-600 transition-all flex items-center gap-2 shadow-lg">
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
              <div className="mb-4 p-2 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-white/5 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                <span className="text-zinc-400 pl-2">Context:</span>
                <button onClick={() => setBusinessContext({type: 'active'})} className={`px-2 py-1.5 rounded-md transition-all ${businessContext.type === 'active' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-500/20' : 'text-zinc-400'}`}><Briefcase size={12}/></button>
                <select onChange={(e) => setBusinessContext({type: 'passive', propertyId: e.target.value})} value={businessContext.type === 'passive' ? businessContext.propertyId : ''} className={`px-2 py-1.5 rounded-md bg-transparent ${businessContext.type === 'passive' ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border border-cyan-500/20' : 'text-zinc-400'}`}>
                    <option value="" disabled>Passive</option>
                    {properties.map(p => <option key={p.id} value={p.id} className="bg-white dark:bg-zinc-900">{p.address}</option>)}
                </select>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center relative">
                {drafts.length > 0 ? (
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
                                transform: isTopCard ? `translate(${cardPosition.x}px, ${cardPosition.y}px) rotate(${cardPosition.x/20}deg)` : `translateY(${(2-index) * -12}px) scale(${1 - (2-index)*0.04})`,
                                opacity: isTopCard ? 1 - Math.abs(cardPosition.x)/400 : 1,
                                zIndex: 10 + index,
                                touchAction: 'none'
                              }}
                            >
                                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-3xl w-full max-w-xs p-8 shadow-2xl space-y-6">
                                  <div className="space-y-1">
                                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Vendor</p>
                                      <p className="font-black text-zinc-900 dark:text-white text-2xl truncate">{draft.vendor}</p>
                                  </div>
                                  <div className="flex justify-between items-end border-t border-zinc-100 dark:border-white/5 pt-4">
                                      <div>
                                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Amount</p>
                                          <p className={`font-black text-2xl ${draft.amount > 0 ? 'text-emerald-500' : 'text-zinc-900 dark:text-white'}`}>
                                            {draft.amount > 0 ? '+' : ''}${Math.abs(draft.amount).toFixed(2)}
                                          </p>
                                      </div>
                                      <div className="text-right">
                                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Date</p>
                                          <p className="text-xs font-bold text-zinc-500">{new Date(draft.date).toLocaleDateString('en-CA', {month: 'short', day: 'numeric'})}</p>
                                      </div>
                                  </div>
                                  <div className="bg-zinc-50 dark:bg-black/20 p-3 rounded-2xl text-center">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{draft.category_guess}</span>
                                  </div>
                                </div>
                            </div>
                          );
                        })}
                    </div>
                ) : (
                    <div className="text-center animate-slide-up">
                        <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
                            <Check size={40} />
                        </div>
                        <h4 className="text-2xl font-black text-zinc-900 dark:text-white mb-2 uppercase tracking-tighter">Session Complete</h4>
                        <p className="text-zinc-500 font-medium">Reconciled {reviewed.length} transactions.</p>
                    </div>
                )}
              </div>
              <div className="h-32 shrink-0 flex items-center justify-around px-4">
                <button onClick={() => swipe('left')} className="w-16 h-16 rounded-full bg-rose-500 text-white shadow-xl shadow-rose-500/20 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"><Briefcase size={28} /></button>
                <button onClick={() => { if (reviewed.length > 0) { const last = reviewed[reviewed.length-1]; setDrafts(p => [...p, last]); setReviewed(p => p.slice(0,-1)); } }} className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition-all shadow-sm"><RefreshCw size={18}/></button>
                <button onClick={() => swipe('right')} className="w-16 h-16 rounded-full bg-violet-600 text-white shadow-xl shadow-violet-600/20 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"><UserCircle size={28} /></button>
              </div>
            </div>
        )}
        {(step === 'review' && reviewed.length > 0) && (
            <div className="pt-6 border-t border-zinc-100 dark:border-white/5">
                <button onClick={async () => {
                    const txs = reviewed.map(d => ({
                        date: d.date, vendor: d.vendor, amount: d.amount, type: d.assignedLedger, category: d.category_guess,
                        taxForm: d.assignedLedger === 'active' ? 't2125' : d.assignedLedger === 'passive' ? 't776' : undefined,
                        propertyId: d.assignedLedger === 'passive' ? d.propertyId : undefined,
                        hstIncluded: d.amount < 0, hstAmount: d.amount < 0 ? Math.abs(d.amount) - (Math.abs(d.amount)/(1.13)) : 0, isSplit: false,
                    }));
                    await onImport(txs);
                    onClose();
                }} className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-black font-black rounded-2xl flex items-center justify-center gap-3 hover:opacity-90 shadow-xl transition-all">
                    <Download size={20}/> Deploy {reviewed.length} Items
                </button>
            </div>
        )}
      </div>
    </div>
  );
};