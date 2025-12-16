import React, { useState, useEffect, useRef } from 'react';
import { User, Settings, CreditCard, Lock, HelpCircle, ChevronRight, LogOut, ShieldCheck, FileText, Plus, Edit2, Save, X, Camera, UploadCloud, Trash2, Sun, Moon, Download } from 'lucide-react';
import { BankAccount, UserProfile, Transaction } from '../types';
import { ProUpgradeModal } from './ProUpgradeModal';

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

interface ProfileViewProps {
  accounts: BankAccount[];
  profile: UserProfile | null;
  onLogout: () => void;
  onConnectBank: () => void;
  onUpdateProfile: (profile: UserProfile) => Promise<void>;
  onUploadAvatar: (file: File) => Promise<void>;
  onDeleteAccount: (accountId: string) => Promise<void>;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  transactions: Transaction[];
}

export const ProfileView: React.FC<ProfileViewProps> = ({ accounts, profile, onLogout, onConnectBank, onUpdateProfile, onUploadAvatar, onDeleteAccount, theme, onToggleTheme, transactions }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserProfile>({
    full_name: '',
    role: '',
    cra_business_number: '',
    sin_last_4: '',
    is_pro_member: false,
    avatar_url: ''
  });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await onUpdateProfile(formData);
      setSaveStatus('success');
      setIsEditing(false); 
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error: any) {
      setSaveStatus('error');
      setSaveError(error.message);
    }
  };
  
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await onUploadAvatar(file);
    } catch (error) {
      setSaveStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleChange = (field: keyof Omit<UserProfile, 'is_pro_member' | 'avatar_url'>, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const exportTaxCsv = (formType: 't2125' | 't776') => {
      const formTx = transactions.filter(t => t.taxForm === formType);
      const headers = ['Date', 'Vendor', 'Category', 'Amount', 'HST', 'Note'];
      const rows = formTx.map(t => [
          t.date, 
          `"${t.vendor}"`, 
          `"${t.category}"`, 
          t.amount, 
          t.hstAmount || 0, 
          `"${t.id}"`
      ]);
      
      const csvContent = "data:text/csv;charset=utf-8," 
          + headers.join(",") + "\n" 
          + rows.map(e => e.join(",")).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${formType}_tax_export_2024.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <>
    <div className="animate-slide-up space-y-6">
      
      {/* Profile Header */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 p-6 rounded-3xl relative overflow-hidden shadow-sm">
        <div className="flex items-center gap-4 relative z-10">
            <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
            <div className="relative group shrink-0">
                <div onClick={() => fileInputRef.current?.click()} className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-500 to-orange-500 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-rose-500/20 cursor-pointer overflow-hidden">
                    {formData.avatar_url ? (
                        <img src={formData.avatar_url} alt="Profile" className="w-full h-full object-cover"/>
                    ) : (
                        formData.full_name ? formData.full_name.charAt(0) : 'U'
                    )}
                </div>
            </div>
            
            {isEditing ? (
                <div className="flex-1 space-y-2">
                    <input 
                        type="text" 
                        value={formData.full_name}
                        onChange={(e) => handleChange('full_name', e.target.value)}
                        className="w-full bg-zinc-100 dark:bg-black/40 border border-zinc-300 dark:border-white/10 rounded px-2 py-1 text-zinc-900 dark:text-white text-lg font-bold focus:outline-none focus:border-rose-500"
                    />
                    <input 
                        type="text" 
                        value={formData.role}
                        onChange={(e) => handleChange('role', e.target.value)}
                        className="w-full bg-zinc-100 dark:bg-black/40 border border-zinc-300 dark:border-white/10 rounded px-2 py-1 text-zinc-500 dark:text-zinc-400 text-sm focus:outline-none focus:border-rose-500"
                    />
                </div>
            ) : (
                <div className="flex-1">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{formData.full_name || 'Guest User'}</h2>
                    <p className="text-zinc-500 dark:text-zinc-500 text-sm">{formData.role || 'Real Estate Professional'}</p>
                </div>
            )}
        </div>

        {/* Edit/Theme Toggle */}
        <div className="absolute top-4 right-4 z-20 flex gap-2">
             <button onClick={onToggleTheme} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
             </button>
            {isEditing ? (
                <button onClick={handleSave} className="p-2 bg-rose-500 rounded-full text-white">
                    {saveStatus === 'saving' ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> : <Save size={16} />}
                </button>
            ) : (
                <button onClick={() => setIsEditing(true)} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                    <Edit2 size={16} />
                </button>
            )}
        </div>
      </div>

      {/* Official Tax Export (Phase 1) */}
      <section>
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-2">Official Tax Exports</h3>
          <div className="grid grid-cols-2 gap-3">
              <button onClick={() => exportTaxCsv('t2125')} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-xl p-4 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                  <div className="p-2 bg-rose-500/10 text-rose-500 rounded-lg"><FileText size={18} /></div>
                  <div className="text-left">
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">T2125 Data</p>
                      <p className="text-xs text-zinc-500">Active Business</p>
                  </div>
              </button>
              <button onClick={() => exportTaxCsv('t776')} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-xl p-4 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                  <div className="p-2 bg-cyan-500/10 text-cyan-500 rounded-lg"><FileText size={18} /></div>
                  <div className="text-left">
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">T776 Data</p>
                      <p className="text-xs text-zinc-500">Passive Rentals</p>
                  </div>
              </button>
          </div>
      </section>

      {/* Tax Identity */}
      <section>
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-2">Tax Identity</h3>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-2xl overflow-hidden p-1">
             <div className="space-y-1">
                 {isEditing ? (
                     <>
                        <div className="p-3">
                            <label className="text-xs text-zinc-500 mb-1 block">CRA Business Number</label>
                            <input 
                                type="text" 
                                value={formData.cra_business_number || ''} 
                                onChange={(e) => handleChange('cra_business_number', e.target.value)}
                                className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-white/10 rounded p-2 text-zinc-900 dark:text-white text-sm"
                            />
                        </div>
                        <div className="p-3 pt-0">
                            <label className="text-xs text-zinc-500 mb-1 block">SIN (Last 4 Digits)</label>
                            <input 
                                type="text" 
                                value={formData.sin_last_4 || ''} 
                                onChange={(e) => handleChange('sin_last_4', e.target.value)}
                                maxLength={4}
                                className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-white/10 rounded p-2 text-zinc-900 dark:text-white text-sm"
                            />
                        </div>
                     </>
                 ) : (
                     <>
                        <SettingItem icon={<FileText size={18} />} label="CRA Business Number" value={formData.cra_business_number || 'Not Set'} />
                        <div className="h-px bg-zinc-100 dark:bg-white/5 mx-4" />
                        <SettingItem icon={<ShieldCheck size={18} />} label="Social Insurance Number" value={formData.sin_last_4 ? `***-***-${formData.sin_last_4}` : 'Not Set'} />
                     </>
                 )}
             </div>
          </div>
      </section>

      <button onClick={onLogout} className="w-full py-4 text-rose-500 font-medium bg-zinc-200/50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-white/5 hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-2">
        <LogOut size={18} />
        Sign Out
      </button>

      <p className="text-center text-xs text-zinc-600 pb-4">Version 3.0.0 (Phase 1+2)</p>
    </div>
    <ProUpgradeModal isOpen={isProModalOpen} onClose={() => setIsProModalOpen(false)} onConfirm={() => {}} />
    </>
  );
};

const SettingItem = ({ icon, label, value, subValue, onClick }: { icon: React.ReactNode, label: string, value?: string, subValue?: string, onClick?: () => void }) => (
  <button onClick={onClick} className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors text-left disabled:opacity-50 disabled:hover:bg-transparent" disabled={!onClick}>
    <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
      {icon}
      <span className="text-sm font-medium text-zinc-900 dark:text-white">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {value && <span className="text-sm text-zinc-500 dark:text-zinc-400">{value}</span>}
      {subValue && <span className="text-[10px] bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-500 px-1.5 py-0.5 rounded-full">{subValue}</span>}
      {onClick && <ChevronRight size={16} className="text-zinc-400 dark:text-zinc-500" />}
    </div>
  </button>
);