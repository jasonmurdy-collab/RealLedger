import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

interface ComplianceAssistantProps {
  category: string;
  amount: number;
  isVisible: boolean;
}

interface ComplianceRule {
    warning: boolean;
    message: string;
    type: 'info' | 'warning' | 'error';
}

export const ComplianceAssistant: React.FC<ComplianceAssistantProps> = ({ category, amount, isVisible }) => {
  const [ruleResult, setRuleResult] = useState<ComplianceRule | null>(null);

  useEffect(() => {
    if (!isVisible || !amount || !category) {
        setRuleResult(null);
        return;
    }
    
    // Phase 1: Rules-Based Logic
    const cat = category.toLowerCase();
    
    // Rule 1: Meals & Entertainment (50% Rule)
    if (cat.includes('meals') || cat.includes('entertainment') || cat.includes('food')) {
        setRuleResult({
            warning: true,
            message: "CRA Rule: Only 50% of this expense is deductible.",
            type: 'info'
        });
        return;
    }

    // Rule 2: Golf/Club Dues (Non-deductible)
    if (cat.includes('golf') || cat.includes('club') || cat.includes('gym')) {
        setRuleResult({
            warning: true,
            message: "Club dues are generally NOT deductible expenses.",
            type: 'error'
        });
        return;
    }

    // Rule 3: Capital Asset Threshold (> $500)
    if (amount > 500 && (cat.includes('supplies') || cat.includes('office') || cat.includes('equipment'))) {
        setRuleResult({
            warning: true,
            message: "Large purchase detected. Should this be capitalized (CCA) instead of expensed?",
            type: 'warning'
        });
        return;
    }
    
    // Rule 4: Automobile
    if (cat.includes('fuel') || cat.includes('auto') || cat.includes('car')) {
        setRuleResult({
            warning: false,
            message: "Ensure you have a mileage log to support this deduction.",
            type: 'info'
        });
        return;
    }

    setRuleResult(null);
  }, [category, amount, isVisible]);

  if (!ruleResult) return null;

  const bgClass = ruleResult.type === 'error' ? 'bg-rose-500/10 border-rose-500/30' : 
                  ruleResult.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30' : 
                  'bg-indigo-500/10 border-indigo-500/30';
  
  const textClass = ruleResult.type === 'error' ? 'text-rose-400' : 
                    ruleResult.type === 'warning' ? 'text-amber-400' : 
                    'text-indigo-400';

  const icon = ruleResult.type === 'error' ? <ShieldAlert size={18} /> : 
               ruleResult.type === 'warning' ? <AlertTriangle size={18} /> : 
               <Info size={18} />;

  return (
    <div className={`mt-4 p-3 rounded-xl border flex gap-3 items-start animate-slide-up ${bgClass}`}>
      <div className={`mt-0.5 ${textClass}`}>
        {icon}
      </div>
      <div>
        <p className={`text-sm font-medium ${textClass}`}>Compliance Check</p>
        <p className="text-xs text-zinc-300 dark:text-zinc-400 leading-snug mt-0.5">
          {ruleResult.message}
        </p>
      </div>
    </div>
  );
};