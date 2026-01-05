import React, { useMemo, useState, useEffect } from 'react';
import { Car, MapPin, Plus, TrendingUp, Calendar, Gauge, Save, Loader2, Info, AlertCircle, CheckCircle } from 'lucide-react';
import { MileageLog, MileageAnnualStats } from '../types';
import { useData } from '../context/DataContext';

interface MileageViewProps {
  logs: MileageLog[];
  onAddTrip: () => void;
}

export const MileageView: React.FC<MileageViewProps> = ({ logs, onAddTrip }) => {
  const { mileageAnnualStats, saveAnnualMileageStats } = useData();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [startOdo, setStartOdo] = useState('');
  const [endOdo, setEndOdo] = useState('');
  const [isUpdatingStart, setIsUpdatingStart] = useState(false);
  const [isUpdatingEnd, setIsUpdatingEnd] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear + 1; i >= currentYear - 4; i--) {
      years.push(i);
    }
    return years;
  }, []);

  useEffect(() => {
    const data = mileageAnnualStats || [];
    const stats = data.find(s => s.year === selectedYear);
    if (stats) {
      setStartOdo(stats.start_odometer?.toString() || '');
      setEndOdo(stats.end_odometer?.toString() || '');
    } else {
      setStartOdo('');
      setEndOdo('');
    }
    setShowSuccess(false);
  }, [selectedYear, mileageAnnualStats]);

  const yearLogs = useMemo(() => {
    const data = logs || [];
    return data.filter(log => {
        const parts = log.date.split('-').map(Number);
        return parts[0] === selectedYear;
    });
  }, [logs, selectedYear]);

  const totalBusinessKm = useMemo(() => yearLogs.reduce((acc, log) => acc + (log.distance || 0), 0), [yearLogs]);
  
  const startVal = parseInt(startOdo) || 0;
  const endVal = parseInt(endOdo) || 0;
  const totalDrivenKm = Math.max(0, endVal - startVal);
  const isInvalidOdo = endVal > 0 && endVal < startVal;
  
  const businessPercentage = (totalDrivenKm > 0 && !isInvalidOdo) 
    ? Math.min(100, (totalBusinessKm / totalDrivenKm) * 100) 
    : 0;
  
  const estimatedDeduction = totalBusinessKm * 0.70; 

  const handleSaveOdometer = async (type: 'start' | 'end') => {
    if (type === 'start') setIsUpdatingStart(true);
    else setIsUpdatingEnd(true);
    
    try {
      await saveAnnualMileageStats({
        year: selectedYear,
        start_odometer: type === 'start' ? startVal : undefined,
        end_odometer: type === 'end' ? endVal : undefined
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Database Error: Ensure the 'mileage_annual_stats' table is correctly configured with RLS.");
    } finally {
      setIsUpdatingStart(false);
      setIsUpdatingEnd(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200 dark:border-white/5 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight">CRA Compliance Tracker</h2>
          <p className="text-xs text-zinc-500 font-medium">Tracking for Tax Form T2125 / T776</p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl w-full sm:w-auto">
            <Calendar size={14} className="ml-3 text-zinc-400" />
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-transparent text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-white py-2 pl-1 pr-8 outline-none cursor-pointer"
            >
              {availableYears.map(y => (
                <option key={y} value={y} className="bg-white dark:bg-zinc-900">{y}</option>
              ))}
            </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-3xl p-6 shadow-sm relative overflow-hidden">
             <div className="flex justify-between items-start relative z-10">
                <div>
                   <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Business Utilization Rate</p>
                   <h3 className={`text-4xl font-black tracking-tighter ${businessPercentage > 0 ? 'text-zinc-900 dark:text-white' : 'text-zinc-300 dark:text-zinc-700'}`}>
                    {(businessPercentage || 0).toFixed(1)}%
                   </h3>
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${businessPercentage > 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                    <Gauge size={24} />
                </div>
             </div>
             
             <div className="mt-8 relative z-10">
                <div className="flex justify-between text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                    <span>Business Use: {(totalBusinessKm || 0).toLocaleString()} KM</span>
                    <span className={isInvalidOdo ? 'text-rose-500 flex items-center gap-1' : ''}>
                      {isInvalidOdo && <AlertCircle size={10} />}
                      Total Driven: {(totalDrivenKm > 0 ? totalDrivenKm.toLocaleString() : 0)} KM
                    </span>
                </div>
                <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden border border-zinc-200 dark:border-white/5 shadow-inner">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${isInvalidOdo ? 'bg-rose-500/30' : 'bg-rose-500'}`} 
                      style={{ width: `${businessPercentage}%` }} 
                    />
                </div>
             </div>

             <div className="mt-6 flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-white/5">
                <Info size={16} className="text-zinc-400 mt-0.5 shrink-0" />
                <p className="text-[10px] text-zinc-500 font-bold leading-relaxed uppercase tracking-tight">
                    CRA requires your total kilometers driven for the year to calculate vehicle deductions.
                </p>
             </div>
          </div>

          <div className="bg-zinc-900 dark:bg-zinc-800 text-white rounded-3xl p-6 shadow-xl flex flex-col justify-between relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
             <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Est. Deductible Amount</p>
                <h3 className="text-3xl font-black text-emerald-400 tracking-tighter">
                  ${(estimatedDeduction || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </h3>
             </div>
             <div className="mt-4">
                <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black rounded-lg inline-flex items-center gap-1.5 uppercase tracking-widest">
                    <TrendingUp size={12} /> $0.70 / KM Rate
                </div>
             </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-3xl p-6 shadow-sm">
            <h3 className="font-black text-zinc-900 dark:text-white uppercase tracking-tighter mb-6 flex items-center gap-2">
                <Car size={18} className="text-rose-500" /> Fiscal Odometer Readings
            </h3>
            
            <div className="space-y-6">
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Jan 1 Reading (Start of Year)</label>
                    <div className="flex gap-2">
                        <input 
                            type="number"
                            value={startOdo}
                            onChange={(e) => setStartOdo(e.target.value)}
                            placeholder="Starting KM"
                            className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-rose-500 transition-colors"
                        />
                        <button 
                            onClick={() => handleSaveOdometer('start')}
                            disabled={isUpdatingStart || !startOdo}
                            className="px-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center hover:opacity-90 disabled:opacity-50 transition-all shadow-md active:scale-95"
                        >
                            {isUpdatingStart ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Dec 31 Reading (End of Year)</label>
                    <div className="flex gap-2">
                        <input 
                            type="number"
                            value={endOdo}
                            onChange={(e) => setEndOdo(e.target.value)}
                            placeholder="Ending KM"
                            className={`flex-1 bg-zinc-50 dark:bg-zinc-800 border rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none transition-colors ${isInvalidOdo ? 'border-rose-500 text-rose-500' : 'border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white focus:border-rose-500'}`}
                        />
                        <button 
                            onClick={() => handleSaveOdometer('end')}
                            disabled={isUpdatingEnd || !endOdo || isInvalidOdo}
                            className="px-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center hover:opacity-90 disabled:opacity-50 transition-all shadow-md active:scale-95"
                        >
                            {isUpdatingEnd ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        </button>
                    </div>
                </div>

                {showSuccess && (
                    <div className="flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-widest animate-pulse">
                        <CheckCircle size={14} /> Fiscal Log Synced
                    </div>
                )}
            </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-zinc-900 dark:text-white uppercase tracking-tighter">Business Trip Log</h3>
                <button onClick={onAddTrip} className="px-4 py-2 bg-rose-500 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-rose-500/20 active:scale-95 transition-all flex items-center gap-1.5">
                    <Plus size={14} /> Log Trip
                </button>
            </div>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto hide-scrollbar">
                {yearLogs.length > 0 ? yearLogs.map((log) => (
                    <div key={log.id} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-white/5 flex justify-between items-center group hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all">
                        <div className="space-y-1">
                            <p className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight">{log.purpose || 'Business Trip'}</p>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold">
                                <MapPin size={10} className="text-zinc-400" />
                                <span>{log.start_location || 'Start'} → {log.end_location || 'End'}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-black text-rose-500 tracking-tighter">{(log.distance || 0)} KM</p>
                            <p className="text-[10px] text-zinc-400 font-bold">{new Date(log.date + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric'})}</p>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-16 text-zinc-400 border-2 border-dashed border-zinc-100 dark:border-white/5 rounded-3xl">
                        <Car size={32} className="mx-auto mb-2 opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest">No trips logged for {selectedYear}</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};