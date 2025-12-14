import React, { useState, useEffect } from 'react';
import { User, Settings, CreditCard, Lock, HelpCircle, ChevronRight, LogOut, ShieldCheck, FileText, Plus, Edit2, Save, X } from 'lucide-react';
import { BankAccount, UserProfile } from '../types';

interface ProfileViewProps {
  accounts: BankAccount[];
  profile: UserProfile | null;
  onLogout: () => void;
  onConnectBank: () => void;
  onUpdateProfile: (profile: UserProfile) => Promise<void>;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ accounts, profile, onLogout, onConnectBank, onUpdateProfile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserProfile>({
    full_name: '',
    role: '',
    cra_business_number: '',
    sin_last_4: '',
    is_pro_member: false
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    await onUpdateProfile(formData);
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleChange = (field: keyof UserProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="animate-slide-up space-y-6">
      
      {/* Profile Header */}
      <div className="bg-zinc-900 border border-white/5 p-6 rounded-3xl relative overflow-hidden">
        <div className="flex items-center gap-4 relative z-10">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-500 to-orange-500 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-rose-500/20 shrink-0">
            {formData.full_name ? formData.full_name.charAt(0) : 'U'}
            </div>
            
            {isEditing ? (
                <div className="flex-1 space-y-2">
                    <input 
                        type="text" 
                        value={formData.full_name}
                        onChange={(e) => handleChange('full_name', e.target.value)}
                        placeholder="Full Name"
                        className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-white text-lg font-bold focus:outline-none focus:border-rose-500"
                    />
                    <input 
                        type="text" 
                        value={formData.role}
                        onChange={(e) => handleChange('role', e.target.value)}
                        placeholder="Job Title (e.g. Broker)"
                        className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-zinc-400 text-sm focus:outline-none focus:border-rose-500"
                    />
                </div>
            ) : (
                <div className="flex-1">
                    <h2 className="text-xl font-bold text-white">{formData.full_name || 'Guest User'}</h2>
                    <p className="text-zinc-500 text-sm">{formData.role || 'Real Estate Professional'}</p>
                    {formData.is_pro_member && (
                        <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/20">Pro Member</span>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Edit Toggle */}
        <div className="absolute top-4 right-4 z-20">
            {isEditing ? (
                <div className="flex gap-2">
                    <button onClick={() => setIsEditing(false)} className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white">
                        <X size={16} />
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="p-2 bg-rose-500 rounded-full text-white hover:bg-rose-600">
                        <Save size={16} />
                    </button>
                </div>
            ) : (
                <button onClick={() => setIsEditing(true)} className="p-2 bg-zinc-800/50 rounded-full text-zinc-500 hover:text-white transition-colors">
                    <Edit2 size={16} />
                </button>
            )}
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-4">
        
        {/* Tax Identity */}
        <section>
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-2">Tax Identity</h3>
          <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden p-1">
             <div className="space-y-1">
                 {isEditing ? (
                     <>
                        <div className="p-3">
                            <label className="text-xs text-zinc-500 mb-1 block">CRA Business Number</label>
                            <input 
                                type="text" 
                                value={formData.cra_business_number} 
                                onChange={(e) => handleChange('cra_business_number', e.target.value)}
                                className="w-full bg-zinc-800 border border-white/10 rounded p-2 text-white text-sm"
                            />
                        </div>
                        <div className="p-3 pt-0">
                            <label className="text-xs text-zinc-500 mb-1 block">SIN (Last 3 Digits)</label>
                            <input 
                                type="text" 
                                value={formData.sin_last_4} 
                                onChange={(e) => handleChange('sin_last_4', e.target.value)}
                                maxLength={3}
                                className="w-full bg-zinc-800 border border-white/10 rounded p-2 text-white text-sm"
                            />
                        </div>
                     </>
                 ) : (
                     <>
                        <SettingItem icon={<FileText size={18} />} label="CRA Business Number" value={formData.cra_business_number || 'Not Set'} />
                        <div className="h-px bg-white/5 mx-4" />
                        <SettingItem icon={<ShieldCheck size={18} />} label="Social Insurance Number" value={formData.sin_last_4 ? `●●● ●●● ${formData.sin_last_4}` : 'Not Set'} />
                     </>
                 )}
             </div>
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
             {accounts.length > 0 ? accounts.map((acc, index) => (
                <React.Fragment key={acc.id}>
                    <SettingItem 
                        icon={<CreditCard size={18} />} 
                        label={`${acc.institution} ${acc.type}`} 
                        value={`**** ${acc.mask}`} 
                        subValue={acc.defaultContext ? acc.defaultContext.charAt(0).toUpperCase() + acc.defaultContext.slice(1) : undefined}
                    />
                    {index < accounts.length - 1 && <div className="h-px bg-white/5" />}
                </React.Fragment>
             )) : (
                 <div className="p-4 text-center text-zinc-500 text-sm">No accounts connected</div>
             )}
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

      <p className="text-center text-xs text-zinc-600 pb-4">Version 2.4.1 (Pro Build)</p>
    </div>
  );
};

const SettingItem = ({ icon, label, value, subValue }: { icon: React.ReactNode, label: string, value?: string, subValue?: string }) => (
  <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left">
    <div className="flex items-center gap-3 text-zinc-400">
      {icon}
      <span className="text-sm font-medium text-white">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {value && <span className="text-sm text-zinc-400">{value}</span>}
      {subValue && <span className="text-[10px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-full">{subValue}</span>}
      <ChevronRight size={16} className="text-zinc-500" />
    </div>
  </button>
);