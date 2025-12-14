import React, { useState, useEffect } from 'react';
import { Bot, Wifi, Car, FileText } from 'lucide-react';

interface ComplianceAssistantProps {
  category: string;
  amount: number;
  isVisible: boolean;
}

export const ComplianceAssistant: React.FC<ComplianceAssistantProps> = ({ category, amount, isVisible }) => {
  const [isTyping, setIsTyping] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);

  // Simulate AI "Thinking" based on category
  useEffect(() => {
    if (!isVisible) return;
    
    // Reset state
    setIsTyping(false);
    setMessage(null);
    setShowActions(false);

    const cat = category.toLowerCase();
    
    if (cat.includes('repair') || cat.includes('renovation') || amount > 1000) {
      triggerAi("Compliance Check 🧐: For T776 line 9960, is this a current expense (patch) or capital improvement (CCA Class 1)?");
      setShowActions(true);
    } else if (cat.includes('fuel') || cat.includes('auto') || cat.includes('vehicle')) {
      triggerAi("Vehicle Expense 🚗: Are you tracking mileage? CRA requires a detailed logbook to claim the business portion on Form T2125.");
    } else if (cat.includes('meal') || cat.includes('entertainment')) {
      triggerAi("Meals & Ent 🍔: Remember, only 50% of this amount is deductible for business purposes. I'll auto-adjust the T2125 entry.");
    }

  }, [category, amount, isVisible]);

  const triggerAi = (msg: string) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessage(msg);
    }, 1200);
  };

  if (!isVisible || (!isTyping && !message)) return null;

  return (
    <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 backdrop-blur-md relative overflow-hidden animate-slide-up">
      {/* Sync Status Indicator */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium tracking-wide uppercase">
        <Wifi size={10} />
        <span>Synced</span>
      </div>

      <div className="flex gap-3">
        <div className="shrink-0 relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Bot size={20} className="text-white" />
          </div>
        </div>

        <div className="flex-1 pt-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-indigo-300">Compliance Assistant</span>
          </div>
          
          {isTyping ? (
             <div className="flex gap-1 h-4 items-center">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
             </div>
          ) : (
            <p className="text-sm text-indigo-100 leading-snug">
              {message}
            </p>
          )}

          {!isTyping && showActions && message && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/50 rounded-lg text-xs font-medium text-indigo-200 transition-colors">
                Current Expense
              </button>
              <button className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/50 rounded-lg text-xs font-medium text-indigo-200 transition-colors">
                Capital (CCA)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};