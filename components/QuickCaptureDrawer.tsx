import React, { useState } from 'react';
import { X, Receipt, Building, Briefcase, Calculator, Camera, Check, UploadCloud, Trash2 } from 'lucide-react';
import { ComplianceAssistant } from './ComplianceAssistant';
import { Property, Transaction, LedgerType } from '../types';
import { ONTARIO_HST_RATE } from '../constants';
import { GoogleGenAI, Type } from "@google/genai";

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

export const QuickCaptureDrawer: React.FC<QuickCaptureDrawerProps> = ({ isOpen, onClose, onAddTransaction, properties }) => {
  const [amount, setAmount] = useState<string>('');
  const [vendor, setVendor] = useState('');
  const [splitRatio, setSplitRatio] = useState(50);
  const [includeHST, setIncludeHST] = useState(true);
  const [category, setCategory] = useState('Supplies');
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState(properties.length > 0 ? properties[0].id : '');

  if (!isOpen) return null;

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
              text: "Analyze this receipt image. Extract the vendor name and the final total amount as a number. Respond with a JSON object only."
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
            },
            required: ["vendor", "amount"]
          },
        },
      });

      const jsonString = response.text.trim();
      const parsedData = JSON.parse(jsonString);

      if (parsedData.vendor) setVendor(parsedData.vendor);
      if (parsedData.amount) setAmount(parsedData.amount.toString());
      
    } catch (error) {
      console.error("OCR Scan failed:", error);
      // You could set an error state here to show in the UI
      setReceiptImage(null); // Clear preview on error
    } finally {
      setIsScanning(false);
    }
  };
  
  const handleLogTransaction = async () => {
    setIsSaving(true);
    try {
      const numAmount = parseFloat(amount) || 0;
      const isSplit = splitRatio > 0 && splitRatio < 100;
      const date = new Date().toISOString().split('T')[0];
      
      // This will be a mock URL. In a real app, you'd upload the base64 image to Supabase Storage and get a public URL.
      const mockReceiptUrl = receiptImage ? `https://storage.supabase.com/receipts/${Date.now()}.jpg` : undefined;

      if (isSplit) {
        const hstAmount = includeHST ? numAmount - (numAmount / (1 + ONTARIO_HST_RATE)) : 0;
        const subtotal = numAmount - hstAmount;
        
        const activeAllocation = subtotal * (splitRatio / 100);
        const passiveAllocation = subtotal * ((100 - splitRatio) / 100);
        
        const activeHst = hstAmount * (splitRatio / 100);
        const passiveHst = hstAmount * ((100 - splitRatio) / 100);

        const transactionsToCreate: Omit<Transaction, 'id' | 'status'>[] = [];

        if (activeAllocation > 0) {
          transactionsToCreate.push({
            date, vendor, category,
            amount: -(activeAllocation + activeHst),
            type: 'active' as LedgerType,
            taxForm: 't2125',
            isSplit: true,
            hstIncluded: includeHST,
            hstAmount: activeHst,
            receiptUrl: mockReceiptUrl,
          });
        }
        
        if (passiveAllocation > 0) {
          transactionsToCreate.push({
            date, vendor, category,
            amount: -(passiveAllocation + passiveHst),
            type: 'passive' as LedgerType,
            taxForm: 't776',
            isSplit: true,
            hstIncluded: includeHST,
            hstAmount: passiveHst,
            propertyId: selectedProperty,
            receiptUrl: mockReceiptUrl,
          });
        }
        await onAddTransaction(transactionsToCreate);

      } else {
        const primaryType = splitRatio === 100 ? 'active' : 'passive';
        const newTransaction: Omit<Transaction, 'id' | 'status'> = {
          date, vendor, category,
          amount: -numAmount,
          type: primaryType,
          isSplit: false,
          hstIncluded: includeHST,
          propertyId: primaryType === 'passive' ? selectedProperty : undefined,
          taxForm: primaryType === 'active' ? 't2125' : 't776',
          receiptUrl: mockReceiptUrl,
        };
        await onAddTransaction(newTransaction);
      }
      onClose();
    } catch (error) {
      console.error("Failed to log transaction:", error);
      // You could display an error toast here
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
                autoFocus={!isScanning}
                />
            </div>
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
                {['Supplies', 'Repairs', 'Fuel/Auto', 'Meals', 'Advertising'].map(cat => (
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
                disabled={isSaving || isScanning}
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