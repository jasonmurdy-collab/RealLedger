import React from 'react';
import { Notification } from '../types';
import { X, Bell, AlertTriangle, FileWarning } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
}

const IconMap: { [key in Notification['type']]: React.ReactNode } = {
    pending_tx: <FileWarning size={18} className="text-amber-400" />,
    budget_over: <AlertTriangle size={18} className="text-rose-400" />,
    lease_expiry: <FileWarning size={18} className="text-cyan-400" />
};

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose, notifications }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
      <div className="bg-zinc-900 w-full max-w-md rounded-2xl p-6 border border-white/10 animate-slide-up">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell size={20} /> Notifications
          </h3>
          <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700">
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto hide-scrollbar">
          {notifications.length > 0 ? (
            notifications.map((notif) => (
              <div key={notif.id} className="p-4 rounded-xl bg-zinc-800/50 border border-white/5 flex gap-4 items-start">
                 <div className="mt-1">{IconMap[notif.type]}</div>
                 <div>
                    <p className="text-white text-sm font-medium leading-snug">{notif.message}</p>
                    <p className="text-xs text-zinc-500 mt-1">{notif.date.toLocaleDateString()}</p>
                 </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-zinc-600">
              <Bell size={32} className="mx-auto mb-2" />
              <p>You're all caught up!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
