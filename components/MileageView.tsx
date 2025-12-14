import React, { useMemo } from 'react';
import { Car, MapPin, Plus, TrendingUp } from 'lucide-react';
import { MileageLog } from '../types';

interface MileageViewProps {
  logs: MileageLog[];
  onAddTrip: () => void;
}

export const MileageView: React.FC<MileageViewProps> = ({ logs, onAddTrip }) => {
  const totalKm = useMemo(() => logs.reduce((acc, log) => acc + log.distance, 0), [logs]);
  const estimatedDeduction = totalKm * 0.68; // Using 2024 CRA rate for first 5000 km

  return (
    <div className="space-y-6 animate-slide-up">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4">
           <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
                <Car size={16} />
              </div>
              <span className="text-xs text-zinc-400 font-medium">Total Distance</span>
           </div>
           <p className="text-2xl font-bold text-white">{totalKm.toLocaleString()} km</p>
           <p className="text-xs text-zinc-500 mt-1">For Tax Year 2024</p>
        </div>
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4">
           <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                <TrendingUp size={16} />
              </div>
              <span className="text-xs text-zinc-400 font-medium">Est. Deduction</span>
           </div>
           <p className="text-2xl font-bold text-emerald-400">${estimatedDeduction.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
           <p className="text-xs text-zinc-500 mt-1">@ $0.68/km</p>
        </div>
      </div>

      {/* Trip Log */}
      <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-white text-lg">
            Mileage Log
          </h3>
          <button onClick={onAddTrip} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors hover:bg-white/5 bg-rose-500/10 text-rose-400 border-rose-500/20">
             <Plus size={12} /> Log Trip
          </button>
        </div>
        
        <div className="space-y-3">
            {logs.length > 0 ? logs.map((log) => (
                <div key={log.id} className="p-4 rounded-xl bg-zinc-800/50 border border-white/5">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-semibold text-white mb-1">{log.purpose}</p>
                            <div className="flex items-center gap-2 text-xs text-zinc-400">
                                <MapPin size={12} />
                                <span>{log.startLocation} → {log.endLocation}</span>
                            </div>
                        </div>
                        <div className="text-right">
                           <p className="font-bold text-lg text-rose-400">{log.distance} km</p>
                           <p className="text-xs text-zinc-500">{log.date}</p>
                        </div>
                    </div>
                </div>
            )) : (
                <div className="text-center text-zinc-500 py-8">
                    <Car size={32} className="mx-auto mb-2" />
                    No trips logged yet.
                </div>
            )}
        </div>
      </div>
    </div>
  );
};