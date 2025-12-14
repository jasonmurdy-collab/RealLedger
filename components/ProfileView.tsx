import React from 'react';
import { User, Settings, CreditCard, Lock, HelpCircle, ChevronRight, LogOut, ShieldCheck, FileText, Plus } from 'lucide-react';
import { BankAccount } from '../types';

interface ProfileViewProps {
  accounts: BankAccount[];
  onLogout: () => void;
  onConnectBank: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ accounts, onLogout, onConnectBank }) => {
  return (
    <div className="animate-slide-up space-y-6">
      
      {/* Profile Header */}
      <div className="flex items-center gap-4 bg-zinc-900 border border-white/5 p-6 rounded-3xl">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-500 to-orange-500 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-rose-500/20">
          JD
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">John Doe</h2>
          <p className="text-zinc-500 text-sm">Real Estate Broker & Investor</p>
          <div className="flex items-center gap-1 mt-1">
             <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/20">Pro Member</span>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-4">
        
        {/* Tax Identity */}
        <section>
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-2">Tax Identity</h3>
          <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden">
             <SettingItem icon={<FileText size={18} />} label="CRA Business Number" value="84920 1234 RT0001" />
             <div className="h-px bg-white/5" />
             <SettingItem icon={<ShieldCheck size={18} />} label="Social Insurance Number" value="●●● ●●● 492" />
          </div>
        </section>

        {/* Connections */}
        <section>
          <div className="flex justify-between items-end mb-2 ml-2 mr-2">
             <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Connected Accounts</h3>
             <button onClick={onConnectBank} className="text-xs font-bold text-rose-500 flex items-center gap-1 hover:text-rose-400 transition-colors">
                <Plus size={12} /> Add Bank
             </button>
          </div>
          <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden">
             {accounts.map((acc, index) => (
                <React.Fragment key={acc.id}>
                    <SettingItem 
                        icon={<CreditCard size={18} />} 
                        label={`${acc.institution} ${acc.type}`} 
                        value={`**** ${acc.mask}`} 
                        subValue={acc.defaultContext ? acc.defaultContext.charAt(0).toUpperCase() + acc.defaultContext.slice(1) : undefined}
                    />
                    {index < accounts.length - 1 && <div className="h-px bg-white/5" />}
                </React.Fragment>
             ))}
          </div>
        </section>

        {/* App Settings */}
        <section>
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-2">Preferences</h3>
          <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden">
             <SettingItem icon={<Settings size={18} />} label="Notifications" value="On" />
             <div className="h-px bg-white/5" />
             <SettingItem icon={<Lock size={18} />} label="Security & FaceID" value="Enabled" />
             <div className="h-px bg-white/5" />
             <SettingItem icon={<HelpCircle size={18} />} label="Support" />
          </div>
        </section>

      </div>

      <button onClick={onLogout} className="w-full py-4 text-rose-500 font-medium bg-zinc-900/50 rounded-2xl border border-white/5 hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-2">
        <LogOut size={18} />
        Sign Out
      </button>

      <p className="text-center text-xs text-zinc-600 pb-4">Version 2.4.0 (Build 492)</p>
    </div>
  );
};

const SettingItem = ({ icon, label, value, subValue }: { icon: any, label: string, value?: string, subValue?: string }) => (
  <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left">
    <div className="flex items-center gap-3 text-zinc-300">
      <div className="text-zinc-500">{icon}</div>
      <div className="flex flex-col">
        <span className="font-medium text-sm">{label}</span>
        {subValue && <span className="text-[10px] text-zinc-500">{subValue}</span>}
      </div>
    </div>
    <div className="flex items-center gap-2">
      {value && <span className="text-xs text-zinc-500">{value}</span>}
      <ChevronRight size={16} className="text-zinc-600" />
    </div>
  </button>
);
