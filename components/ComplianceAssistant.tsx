import React, { useState, useEffect } from 'react';
import { Bot, Wifi, Car, FileText } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface ComplianceAssistantProps {
  category: string;
  amount: number;
  isVisible: boolean;
}

export const ComplianceAssistant: React.FC<ComplianceAssistantProps> = ({ category, amount, isVisible }) => {
  const [isTyping, setIsTyping] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);

useEffect(() => {
    if (!isVisible || !amount || !category) return;
    
    // Simple debounce to avoid spamming API while typing amounts
    const timer = setTimeout(async () => {
        setIsTyping(true);
        setMessage(null);
        setShowActions(false);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const prompt = `
                I am a Canadian Real Estate Agent. I just spent $${amount} on "${category}".
                Is this likely a current expense (fully deductible) or a capital expense (CCA)? 
                And are there any specific CRA compliance warnings I should know (like meals 50%, mileage logs, etc)?
                Keep the answer under 20 words. Be direct.
            `;

            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt
            });
            
            const responseText = result.text;
            setMessage(responseText);
            
            // Simple keyword check to show actions
            if (responseText && (responseText.toLowerCase().includes('capital') || responseText.toLowerCase().includes('cca'))) {
                setShowActions(true);
            }
        } catch (err) {
            console.error(err);
            setMessage("Could not connect to AI Compliance service.");
        } finally {
            setIsTyping(false);
        }
    }, 1000); // 1 second delay

    return () => clearTimeout(timer);
  }, [category, amount, isVisible]);

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