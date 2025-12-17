import React, { useState, useRef, useEffect } from 'react';
import { X, Receipt, Building, Briefcase, Calculator, Camera, Check, UploadCloud, Trash2, Mic, Sparkles, XCircle } from 'lucide-react';
import { ComplianceAssistant } from './ComplianceAssistant';
import { Property, Transaction, LedgerType, TaxForm } from '../types';
import { ONTARIO_HST_RATE } from '../constants';
import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from '../supabaseClient';

interface QuickCaptureDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'status'> | Omit<Transaction, 'id' | 'status'>[]) => Promise<void>;
  properties: Property[];
}

const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => {
    const result = reader.result as string;
    // Remove the data URL prefix e.g. "data:image/png;base64,"
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

export const QuickCaptureDrawer: React.FC<QuickCaptureDrawerProps> = ({ isOpen, onClose, onAddTransaction, properties }) => {
  const [amount, setAmount] = useState<string>('');
  const [vendor, setVendor] = useState('');
  const [splitRatio, setSplitRatio] = useState(50);
  const [includeHST, setIncludeHST] = useState(true);
  const [category, setCategory] = useState('Supplies');
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion | null>(null);
  // FIX: Changed SpeechRecognition type to 'any' to resolve TypeScript error as it's a browser-specific, non-standard API type.
  const recognitionRef = useRef<any | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset states when drawer closes
      setAmount('');
      setVendor('');
      setSplitRatio(50);
      setIncludeHST(true);
      setCategory('Supplies');
      setIsScanning(false);
      setIsSaving(false);
      setReceiptImage(null);
      setSelectedProperty(properties.length > 0 ? properties[0].id : '');
      setAiSuggestions(null);
      setLiveTranscription('');
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsVoiceRecording(false);
      }
    } else {
        // Set default property if available when opening
        setSelectedProperty(properties.length > 0 ? properties[0].id : '');
    }
  }, [isOpen, properties]);

  // AI Categorization effect
  useEffect(() => {
    if (amount && vendor && category && isOpen) {
        getAiSuggestions();
    } else {
        setAiSuggestions(null);
    }
  }, [amount, vendor, category, isOpen]);

  if (!isOpen) return null;

  const getAiSuggestions = async () => {
    if (!amount || !vendor || !category) return;
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const prompt = `Based on a transaction of $${amount} from ${vendor} categorized as ${category}, suggest the most likely LedgerType (active, passive, personal), TaxForm (t2125, t776, or undefined), if HST is typically Included (boolean), and if it's for a property (provide a propertyId from this list if applicable, otherwise undefined: ${properties.map(p => `{id: "${p.id}", address: "${p.address}"}`).join(', ')}). Respond with a JSON object only.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
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
                        category: { type: Type.STRING } // Allow AI to suggest category too
                    },
                },
            },
        });

        const jsonString = response.text.trim();
        const parsedData = JSON.parse(jsonString);

        // Filter out propertyId if it doesn't exist in the provided list
        if (parsedData.propertyId && !properties.some(p => p.id === parsedData.propertyId)) {
            parsedData.propertyId = undefined;
        }

        setAiSuggestions(parsedData);

    } catch (error) {
        console.error("AI suggestion failed:", error);
        setAiSuggestions(null);
    }
  };

  const applySuggestion = (key: keyof AiSuggestion, value: any) => {
    switch (key) {
      case 'ledgerType':
        if (value === 'active') setSplitRatio(100);
        else if (value === 'passive') setSplitRatio(0);
        // Personal ledger isn't handled by split ratio directly here, need to rethink how that applies if it's a direct suggestion
        break;
      case 'taxForm': // Tax form is implicitly linked to ledgerType via splitRatio, so maybe not directly applicable
        break;
      case 'hstIncluded':
        setIncludeHST(value);
        break;
      case 'propertyId':
        setSelectedProperty(value);
        setSplitRatio(0); // If property is suggested, it's likely passive
        break;
      case 'category':
        setCategory(value);
        break;
      default:
        break;
    }
  };

  const performOcr = async (file: File) => {
    if (!file) return;
    setIsScanning(true);
    setAmount('');
    setVendor('');
    setReceiptImage(URL.createObjectURL(file)); // Show local preview immediately

    try {
      const base64Image = await fileToBase64(file);
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            {
              text: "Analyze this receipt image. Extract the vendor name, the final total amount as a number, and a likely category (e.g., Supplies, Meals, Fuel/Auto). Respond with a JSON object only."
            },
            {
              inlineData: {
                mimeType: file.type,
                data: base64Image,
              },
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              vendor: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              category: { type: Type.STRING },
            },
            required: ["vendor", "amount"]
          },
        },
      });

      const jsonString = response.text.trim();
      const parsedData = JSON.parse(jsonString);

      if (parsedData.vendor) setVendor(parsedData.vendor);
      if (parsedData.amount) setAmount(parsedData.amount.toString());
      if (parsedData.category) setCategory(parsedData.category);
      
    } catch (error) {
      console.error("OCR Scan failed:", error);
      setReceiptImage(null); // Clear preview on error
    } finally {
      setIsScanning(false);
    }
  };

  const startVoiceRecording = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }

    // FIX: Access SpeechRecognition from window.
    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-CA'; // Canadian English

    recognitionRef.current.onstart = () => {
      setIsVoiceRecording(true);
      setLiveTranscription('');
      setAmount('');
      setVendor('');
      setCategory('Supplies'); // Reset category for voice input
      setSelectedProperty(''); // Reset property for voice input
    };

    // FIX: Changed SpeechRecognitionEvent type to 'any' to resolve TypeScript error.
    recognitionRef.current.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setLiveTranscription(finalTranscript || interimTranscript);
    };

    recognitionRef.current.onend = async () => {
      setIsVoiceRecording(false);
      if (liveTranscription) {
        await processVoiceInput(liveTranscription);
      }
      setLiveTranscription('');
    };

    // FIX: Changed SpeechRecognitionErrorEvent type to 'any' to resolve TypeScript error.
    recognitionRef.current.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsVoiceRecording(false);
      alert(`Voice input error: ${event.error}. Please try again.`);
    };

    recognitionRef.current.start();
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const processVoiceInput = async (text: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const prompt = `Extract transaction details from this text: "${text}". I need the amount (number), vendor, category, ledger type (active, passive, personal, default to active), whether HST is included (boolean, default to false), and property ID (if mentioned, from this list: ${properties.map(p => `{id: "${p.id}", address: "${p.address}"}`).join(', ')}, otherwise undefined). Respond with a JSON object only.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.NUMBER },
              vendor: { type: Type.STRING },
              category: { type: Type.STRING },
              ledgerType: { type: Type.STRING, enum: ['active', 'passive', 'personal'] },
              hstIncluded: { type: Type.BOOLEAN },
              propertyId: { type: Type.STRING },
            },
            required: ["amount", "vendor", "category"]
          },
        },
      });

      const jsonString = response.text.trim();
      const parsedData = JSON.parse(jsonString);

      if (parsedData.amount) setAmount(parsedData.amount.toString());
      if (parsedData.vendor) setVendor(parsedData.vendor);
      if (parsedData.category) setCategory(parsedData.category);
      if (parsedData.hstIncluded !== undefined) setIncludeHST(parsedData.hstIncluded);
      if (parsedData.ledgerType) {
        if (parsedData.ledgerType === 'active') setSplitRatio(100);
        else if (parsedData.ledgerType === 'passive') setSplitRatio(0);
        else setSplitRatio(50); // Default for personal, or if voice can't determine business/passive
      }
      if (parsedData.propertyId && properties.some(p => p.id === parsedData.propertyId)) {
        setSelectedProperty(parsedData.propertyId);
        setSplitRatio(0); // If property is mentioned, it's likely passive
      } else {
        setSelectedProperty('');
      }

    } catch (error) {
      console.error("AI voice processing failed:", error);
      alert("Failed to process voice input. Please try again or enter manually.");
    }
  };
  
const handleLogTransaction = async () => {
    setIsSaving(true);
    try {
      const numAmount = parseFloat(amount) || 0;
      if (numAmount === 0) return;

      const isSplit = splitRatio > 0 && splitRatio < 100;
      const date = new Date().toISOString().split('T')[0];
      
      let finalReceiptUrl: string | undefined = undefined;

      if (receiptImage) {
        try {
            const response = await fetch(receiptImage);
            const blob = await response.blob();
            const fileExt = blob.type.split('/')[1] || 'jpg';
            const fileName = `${Date.now()}.${fileExt}`;
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) throw new Error("User not found");

            const filePath = `${user.id}/${fileName}`;

            // Attempt upload, catch error if bucket missing
            const { error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(filePath, blob);

            if (uploadError) {
                console.warn("Receipt upload failed (Storage bucket 'receipts' likely missing):", uploadError.message);
                // Proceed without image URL
            } else {
                const { data: urlData } = supabase.storage
                .from('receipts')
                .getPublicUrl(filePath);
                
                finalReceiptUrl = urlData.publicUrl;
            }
        } catch (storageErr) {
            console.error("Receipt processing error:", storageErr);
            // Ignore receipt processing errors to allow transaction saving
        }
      }
      
      const hstAmount = includeHST ? numAmount - (numAmount / (1 + ONTARIO_HST_RATE)) : 0;
      const subtotal = numAmount - hstAmount;
      const activeAllocation = (subtotal * (splitRatio / 100));
      const passiveAllocation = (subtotal * ((100 - splitRatio) / 100));

      if (isSplit) {
        const transactionsToCreate: Omit<Transaction, 'id' | 'status'>[] = [];
        if (activeAllocation > 0) {
           transactionsToCreate.push({
             date,
             vendor,
             amount: -activeAllocation,
             type: 'active',
             category,
             taxForm: 't2125',
             isSplit: true,
             hstIncluded: includeHST,
             hstAmount: hstAmount * (splitRatio / 100),
             receiptUrl: finalReceiptUrl, 
           });
        }
        if (passiveAllocation > 0) {
           transactionsToCreate.push({
             date,
             vendor,
             amount: -passiveAllocation,
             type: 'passive',
             category,
             taxForm: 't776',
             isSplit: true,
             propertyId: selectedProperty,
             hstIncluded: includeHST,
             hstAmount: hstAmount * ((100 - splitRatio) / 100),
             receiptUrl: finalReceiptUrl,
           });
        }
        await onAddTransaction(transactionsToCreate);
      } else {
        const ledgerType: LedgerType = splitRatio === 100 ? 'active' : (splitRatio === 0 ? 'passive' : 'personal'); // Assuming 50% split would be personal if not active/passive
        const newTransaction: Omit<Transaction, 'id' | 'status'> = {
          date,
          vendor,
          amount: -numAmount,
          type: ledgerType,
          category,
          taxForm: ledgerType === 'active' ? 't2125' : ledgerType === 'passive' ? 't776' : undefined,
          isSplit: false,
          propertyId: ledgerType === 'passive' ? selectedProperty : undefined,
          hstIncluded: includeHST,
          hstAmount,
          receiptUrl: finalReceiptUrl,
        };
        await onAddTransaction(newTransaction);
      }
      onClose();
    } catch (error) {
      console.error("Failed to log transaction:", error);
      alert("Error saving transaction. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const numAmount = parseFloat(amount) || 0;
  const hstAmount = includeHST ? numAmount - (numAmount / (1 + ONTARIO_HST_RATE)) : 0;
  const subtotal = numAmount - hstAmount;
  const activeAllocation = (subtotal * (splitRatio / 100));
  const passiveAllocation = (subtotal * ((100 - splitRatio) / 100));
  
  const handleRemoveReceipt = () => {
    setReceiptImage(null);
    const fileInput = document.getElementById('ocr-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-[#0e0e11] rounded-t-3xl border-t border-white/10 shadow-2xl animate-slide-up h-[90vh] overflow-y-auto hide-scrollbar">
        
        <div className="sticky top-0 z-20 bg-[#0e0e11]/95 backdrop-blur-md pb-4 pt-4 px-6 border-b border-white/5">
          <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-6" />
          
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Quick Capture</h2>
            <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 transition-colors">
              <X size={20} className="text-zinc-400" />
            </button>
          </div>

          <div className="flex flex-col items-center justify-center mb-2 relative">
            <div className="flex items-center gap-2">
                <span className="text-4xl text-zinc-500 font-light">$</span>
                <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="bg-transparent text-5xl font-bold text-white text-center w-48 focus:outline-none placeholder:text-zinc-700"
                autoFocus={!isScanning && !isVoiceRecording}
                />
                <button 
                  onClick={isVoiceRecording ? stopVoiceRecording : startVoiceRecording} 
                  className={`p-2 rounded-full transition-colors ${isVoiceRecording ? 'bg-rose-500 text-white animate-pulse' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                >
                  <Mic size={24} />
                </button>
            </div>
            {isVoiceRecording && liveTranscription && (
                <p className="text-sm text-zinc-400 mt-2">{liveTranscription}</p>
            )}
          </div>
        </div>

        <div className="p-6 pt-2 space-y-8">
          
          <div className="space-y-4">
            <input
              type="file"
              id="ocr-input"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                      performOcr(e.target.files[0]);
                  }
              }}
              disabled={isScanning || !!receiptImage}
            />
            {!receiptImage ? (
                <label htmlFor="ocr-input" className="cursor-pointer w-full h-24 bg-zinc-900/50 border-2 border-dashed border-zinc-700 rounded-xl flex flex-col items-center justify-center text-zinc-500 hover:border-rose-500 hover:text-rose-500 transition-colors">
                    <Receipt size={24} />
                    <span className="text-sm font-semibold mt-2">Scan Receipt with AI</span>
                </label>
            ) : (
                <div className="relative w-full h-24 rounded-xl overflow-hidden group">
                    <img src={receiptImage} alt="Receipt preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100">
                        {isScanning ? (
                             <div className="flex items-center gap-2 text-white">
                                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                                Scanning...
                             </div>
                        ) : (
                            <button onClick={handleRemoveReceipt} className="p-2 bg-rose-500/80 text-white rounded-full">
                                <Trash2 size={18}/>
                            </button>
                        )}
                    </div>
                </div>
            )}


            <div className="flex justify-center">
             <button 
                onClick={() => setIncludeHST(!includeHST)}
                className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors flex items-center gap-1 ${includeHST ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-zinc-800 text-zinc-500'}`}
             >
                <Calculator size={12} />
                {includeHST ? `HST ($${(hstAmount).toFixed(2)}) Included` : 'No HST'}
             </button>
          </div>

            <div className="bg-zinc-900/50 p-1 rounded-xl flex gap-1 border border-white/5">
                <input 
                    type="text" 
                    placeholder="Vendor (e.g. Home Depot)" 
                    className="flex-1 bg-transparent px-4 py-3 text-white focus:outline-none placeholder:text-zinc-600"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                {['Supplies', 'Repairs', 'Fuel/Auto', 'Meals', 'Advertising', 'Utilities', 'Rent', 'Insurance'].map(cat => (
                    <button 
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap border transition-all ${category === cat ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-400 border-zinc-800'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
          </div>

          {aiSuggestions && (
            <div className="bg-zinc-900/40 rounded-2xl p-5 border border-white/5 relative z-10 animate-slide-up">
                <h4 className="text-xs font-bold text-violet-300 mb-3 flex items-center gap-2"><Sparkles size={14} /> AI Suggestions</h4>
                <div className="flex flex-wrap gap-2">
                    {aiSuggestions.ledgerType && (
                        <button 
                            onClick={() => applySuggestion('ledgerType', aiSuggestions.ledgerType)}
                            className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 
                            ${aiSuggestions.ledgerType === 'active' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 
                               aiSuggestions.ledgerType === 'passive' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                               'bg-violet-500/20 text-violet-300 border border-violet-500/30'}`}
                        >
                            <Sparkles size={12} /> {aiSuggestions.ledgerType.charAt(0).toUpperCase() + aiSuggestions.ledgerType.slice(1)} Ledger
                        </button>
                    )}
                    {aiSuggestions.category && aiSuggestions.category !== category && (
                        <button 
                            onClick={() => applySuggestion('category', aiSuggestions.category)}
                            className="px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 bg-zinc-700/50 text-zinc-300 border border-zinc-600"
                        >
                            <Sparkles size={12} /> Category: {aiSuggestions.category}
                        </button>
                    )}
                    {aiSuggestions.taxForm && (
                        <button 
                            onClick={() => applySuggestion('taxForm', aiSuggestions.taxForm)}
                            className="px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 bg-zinc-700/50 text-zinc-300 border border-zinc-600"
                        >
                            <Sparkles size={12} /> {aiSuggestions.taxForm.toUpperCase()}
                        </button>
                    )}
                    {aiSuggestions.hstIncluded !== undefined && aiSuggestions.hstIncluded !== includeHST && (
                        <button 
                            onClick={() => applySuggestion('hstIncluded', aiSuggestions.hstIncluded)}
                            className="px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 bg-zinc-700/50 text-zinc-300 border border-zinc-600"
                        >
                            <Sparkles size={12} /> HST {aiSuggestions.hstIncluded ? 'Included' : 'Not Included'}
                        </button>
                    )}
                    {aiSuggestions.propertyId && (
                        <button 
                            onClick={() => applySuggestion('propertyId', aiSuggestions.propertyId)}
                            className="px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        >
                            <Sparkles size={12} /> Property: {properties.find(p => p.id === aiSuggestions.propertyId)?.address.split(',')[0]}
                        </button>
                    )}
                </div>
                <button onClick={() => setAiSuggestions(null)} className="absolute top-2 right-2 text-zinc-500 hover:text-white transition-colors">
                    <XCircle size={16} />
                </button>
            </div>
          )}


          <div className="bg-zinc-900/40 rounded-2xl p-5 border border-white/5">
            <div className="flex justify-between items-end mb-4">
              <div className="text-left">
                <div className="flex items-center gap-1.5 text-rose-400 mb-1">
                  <Briefcase size={14} />
                  <span className="text-xs font-bold tracking-wider">ACTIVE (T2125)</span>
                </div>
                <div className="text-xl font-bold text-white">${activeAllocation.toFixed(2)}</div>
              </div>

              <div className="text-right">
                <div className="flex items-center justify-end gap-1.5 text-cyan-400 mb-1">
                  <span className="text-xs font-bold tracking-wider">PASSIVE (T776)</span>
                  <Building size={14} />
                </div>
                <div className="text-xl font-bold text-white">${passiveAllocation.toFixed(2)}</div>
              </div>
            </div>

            <div className="relative h-8 flex items-center mb-4 select-none touch-none">
              <div className="absolute w-full h-3 rounded-full overflow-hidden flex">
                <div className="h-full bg-rose-600" style={{ width: `${splitRatio}%` }}></div>
                <div className="h-full bg-cyan-600" style={{ width: `${100 - splitRatio}%` }}></div>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                step="5"
                value={splitRatio}
                onChange={(e) => setSplitRatio(Number(e.target.value))}
                className="absolute w-full z-20 opacity-0 cursor-pointer h-full"
              />
              <div 
                className="absolute z-10 w-8 h-8 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center justify-center pointer-events-none transition-all duration-75"
                style={{ left: `calc(${splitRatio}% - 16px)` }}
              >
                <div className="w-1 h-3 bg-zinc-300 rounded-full"></div>
              </div>
            </div>

            {passiveAllocation > 0 && properties.length > 0 && (
                <div className="bg-zinc-900/80 rounded-lg p-2 border border-white/5 flex items-center gap-2">
                    <span className="text-xs text-zinc-500 whitespace-nowrap pl-2">Assign to:</span>
                    <select 
                        value={selectedProperty}
                        onChange={(e) => setSelectedProperty(e.target.value)}
                        className="bg-transparent text-sm text-cyan-400 font-medium w-full focus:outline-none"
                    >
                        {properties.map(p => (
                            <option key={p.id} value={p.id}>{p.address}</option>
                        ))}
                    </select>
                </div>
            )}
          </div>

          <ComplianceAssistant category={category} amount={numAmount} isVisible={true} />

          <div className="pt-4 pb-8">
             <button 
                onClick={handleLogTransaction} 
                disabled={isSaving || isScanning || numAmount === 0 || !vendor}
                className="w-full py-4 rounded-xl bg-white text-black font-bold text-lg shadow-lg hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                    <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                ) : (
                    <>
                        <UploadCloud size={20} />
                        Log Transaction
                    </>
                )}
             </button>
          </div>

        </div>
      </div>
    </div>
  );
};