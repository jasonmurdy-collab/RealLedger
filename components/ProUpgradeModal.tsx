import React from 'react';
import { X, CheckCircle, Star } from 'lucide-react';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const proFeatures = [
    "Unlimited Property Tracking",
    "Advanced Tax Analytics (CCA)",
    "AI-Powered Compliance Insights",
    "Quarterly HST Reminders"
];

export const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
      <div className="bg-zinc-900 w-full max-w-sm rounded-2xl p-6 border border-white/10 animate-slide-up relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-violet-500/20 to-transparent"></div>
        
        <div className="relative z-10">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <Star size={18} className="text-amber-400" />
                    <h3 className="text-xl font-bold text-white">Upgrade to Pro</h3>
                </div>
                <button onClick={onClose} className="p-1">
                    <X size={18} className="text-zinc-500" />
                </button>
            </div>
            
            <p className="text-sm text-zinc-400 mb-6">Unlock powerful tools to maximize your real estate wealth.</p>

            <div className="space-y-3 mb-8">
                {proFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                        <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                        <span className="text-zinc-200 text-sm">{feature}</span>
                    </div>
                ))}
            </div>

            <button 
                onClick={onConfirm}
                className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors"
            >
                Confirm Upgrade
            </button>
            <button
                onClick={onClose}
                className="w-full py-2 text-zinc-500 font-medium text-sm mt-2 hover:text-white transition-colors"
            >
                Maybe Later
            </button>
        </div>
      </div>
    </div>
  );
};