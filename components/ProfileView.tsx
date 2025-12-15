import React, { useState, useEffect, useRef } from 'react';
import { User, Settings, CreditCard, Lock, HelpCircle, ChevronRight, LogOut, ShieldCheck, FileText, Plus, Edit2, Save, X, Camera, UploadCloud } from 'lucide-react';
import { BankAccount, UserProfile } from '../types';
import { ProUpgradeModal } from './ProUpgradeModal';

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

interface ProfileViewProps {
  accounts: BankAccount[];
  profile: UserProfile | null;
  onLogout: () => void;
  onConnectBank: () => void;
  onUpdateProfile: (profile: UserProfile) => Promise<void>;
  onUploadAvatar: (file: File) => Promise<void>;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ accounts, profile, onLogout, onConnectBank, onUpdateProfile, onUploadAvatar }) => {
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
    setSaveError(null);
    try {
      await onUpdateProfile(formData);
      setSaveStatus('success');
      setIsEditing(false); 
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error: any) {
      console.error("Failed to save profile:", error);
      setSaveStatus('error');
      setSaveError(error.message || "An unknown error occurred.");
    }
  };
  
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setSaveError(null);
    try {
      await onUploadAvatar(file);
    } catch (error) {
      console.error("Avatar upload failed:", error);
      setSaveStatus('error');
      setSaveError("Avatar upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpgradePro = async () => {
    setIsProModalOpen(false);
    setSaveStatus('saving');
    setSaveError(null);
    try {
        const updatedProfile = { ...formData, is_pro_member: true };
        await onUpdateProfile(updatedProfile);
        setFormData(updatedProfile);
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error: any) {
        console.error("Failed to upgrade to pro:", error);
        setSaveStatus('error');
        setSaveError(error.message || "An unknown error occurred.");
    }
  };

  const handleChange = (field: keyof Omit<UserProfile, 'is_pro_member' | 'avatar_url'>, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSettingClick = (action: 'notifications' | 'security' | 'support') => {
      switch (action) {
          case 'notifications':
              alert('Notification settings would be configured here.');
              break;
          case 'security':
              alert('FaceID and other security options would be managed here.');
              break;
          case 'support':
              window.location.href = 'mailto:support@realledger.ca';
              break;
      }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setSaveStatus('idle');
    setSaveError(null);
  }

  return (
    <>
    <div className="animate-slide-up space-y-6">
      
      {/* Profile Header */}
      <div className="bg-zinc-900 border border-white/5 p-6 rounded-3xl relative overflow-hidden">
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
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {isUploading ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> : <Camera size={18} className="text-white" />}
                </div>
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
                    <button onClick={handleSave} disabled={saveStatus === 'saving'} className="p-2 bg-rose-500 rounded-full text-white hover:bg-rose-600">
                        {saveStatus === 'saving' ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> : <Save size={16} />}
                    </button>
                </div>
            ) : (
                <button onClick={handleEditClick} className="p-2 bg-zinc-800/50 rounded-full text-zinc-500 hover:text-white transition-colors">
                    <Edit2 size={16} />
                </button>
            )}
        </div>
        
        {saveStatus === 'success' && <p className="absolute bottom-2 right-4 text-xs text-emerald-400">Profile saved!</p>}
        {saveStatus === 'error' && <p className="absolute bottom-2 right-4 text-xs text-rose-400 max-w-[70%] text-right">{saveError}</p>}
      </div>
      
      {/* Pro Upgrade Banner */}
      {!formData.is_pro_member && (
          <div className="bg-gradient-to-r from-violet-600 to-rose-500 border border-white/10 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-white">Unlock Pro Features</h4>
                <p className="text-xs text-white/70">Advanced analytics & unlimited properties.</p>
              </div>
              <button onClick={() => setIsProModalOpen(true)} className="bg-white text-black font-bold px-4 py-1.5 rounded-lg text-sm hover:bg-zinc-200">Upgrade</button>
          </div>
      )}

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
                                value={formData.cra_business_number || ''} 
                                onChange={(e) => handleChange('cra_business_number', e.target.value)}
                                className="w-full bg-zinc-800 border border-white/10 rounded p-2 text-white text-sm"
                            />
                        </div>
                        <div className="p-3 pt-0">
                            <label className="text-xs text-zinc-500 mb-1 block">SIN (Last 4 Digits)</label>
                            <input 
                                type="text" 
                                value={formData.sin_last_4 || ''} 
                                onChange={(e) => handleChange('sin_last_4', e.target.value)}
                                maxLength={4}
                                className="w-full bg-zinc-800 border border-white/10 rounded p-2 text-white text-sm"
                            />
                        </div>
                     </>
                 ) : (
                     <>
                        <SettingItem icon={<FileText size={18} />} label="CRA Business Number" value={formData.cra_business_number || 'Not Set'} />
                        <div className="h-px bg-white/5 mx-4" />
                        <SettingItem icon={<ShieldCheck size={18} />} label="Social Insurance Number" value={formData.sin_last_4 ? `***-***-${formData.sin_last_4}` : 'Not Set'} />
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
             <SettingItem icon={<Settings size={18} />} label="Notifications" value="On" onClick={() => handleSettingClick('notifications')} />
             <div className="h-px bg-white/5" />
             <SettingItem icon={<Lock size={18} />} label="Security & FaceID" value="Enabled" onClick={() => handleSettingClick('security')} />
             <div className="h-px bg-white/5" />
             <SettingItem icon={<HelpCircle size={18} />} label="Support" onClick={() => handleSettingClick('support')} />
          </div>
        </section>

      </div>

      <button onClick={onLogout} className="w-full py-4 text-rose-500 font-medium bg-zinc-900/50 rounded-2xl border border-white/5 hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-2">
        <LogOut size={18} />
        Sign Out
      </button>

      <p className="text-center text-xs text-zinc-600 pb-4">Version 2.4.1 (Pro Build)</p>
    </div>
    <ProUpgradeModal isOpen={isProModalOpen} onClose={() => setIsProModalOpen(false)} onConfirm={handleUpgradePro} />
    </>
  );
};

const SettingItem = ({ icon, label, value, subValue, onClick }: { icon: React.ReactNode, label: string, value?: string, subValue?: string, onClick?: () => void }) => (
  <button onClick={onClick} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left disabled:opacity-50 disabled:hover:bg-transparent" disabled={!onClick}>
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