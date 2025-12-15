import React, { useState } from 'react';
import { MileageLog } from '../types';
import { X, Save, Car, MapPin } from 'lucide-react';

interface MileageEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (log: Omit<MileageLog, 'id'>) => Promise<void>;
}

export const MileageEditor: React.FC<MileageEditorProps> = ({ isOpen, onClose, onSave }) => {
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [purpose, setPurpose] = useState('');
  const [distance, setDistance] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        date: new Date().toISOString().split('T')[0],
        start_location: startLocation,
        end_location: endLocation,
        purpose,
        distance: parseFloat(distance) || 0,
      });
      onClose();
    } catch (err: any) {
        console.error("Failed to save mileage log:", err);
        setError(err.message || "Could not save trip. Please try again.");
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
      <div className="bg-zinc-900 w-full max-w-md rounded-2xl p-6 border border-white/10 animate-slide-up">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Car size={20} className="text-rose-500" />
            Log New Trip
          </h3>
          <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700">
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-500 ml-1 mb-1 block">Purpose</label>
            <input 
              type="text" 
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Client Meeting, Property Showing"
              className="w-full bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="text-xs text-zinc-500 ml-1 mb-1 block">Start Location</label>
                <input 
                    type="text" 
                    value={startLocation}
                    onChange={(e) => setStartLocation(e.target.value)}
                    placeholder="e.g. Office"
                    className="w-full bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition-colors"
                />
             </div>
             <div>
                <label className="text-xs text-zinc-500 ml-1 mb-1 block">End Location</label>
                <input 
                    type="text" 
                    value={endLocation}
                    onChange={(e) => setEndLocation(e.target.value)}
                    placeholder="e.g. 123 Main St"
                    className="w-full bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition-colors"
                />
             </div>
          </div>
          
           <div>
              <label className="text-xs text-zinc-500 ml-1 mb-1 block">Distance (km)</label>
              <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-3.5 text-zinc-500" />
                  <input 
                  type="number" 
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  className="w-full bg-zinc-800/50 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white focus:outline-none focus:border-rose-500 transition-colors"
                  />
              </div>
           </div>
        </div>

        {error && (
            <p className="text-xs text-rose-500 text-center bg-rose-500/10 p-2 rounded-lg mt-4">{error}</p>
        )}

        <button 
            onClick={handleSubmit} 
            disabled={!purpose || !distance || isSaving}
            className="w-full mt-6 py-3 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors disabled:opacity-50"
        >
            {isSaving ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
            ) : (
                <><Save size={18} /> Add Trip Log</>
            )}
        </button>
      </div>
    </div>
  );
};