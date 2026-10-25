import React from 'react';
import { ScheduleItem } from '../data/mockData';
import { Clock, CheckCircle2, Circle, AlertCircle, Info } from 'lucide-react';

interface MedicationItineraryProps {
  schedule: ScheduleItem[];
  onToggleTaken: (id: string) => void;
  filterRegion?: string | null;
  theme?: 'dark' | 'light' | 'warm';
}

export const MedicationItinerary: React.FC<MedicationItineraryProps> = ({
  schedule,
  onToggleTaken,
  filterRegion = null,
  theme = 'dark'
}) => {
  const filteredSchedule = filterRegion
    ? schedule.filter(item => item.bodyRegion === filterRegion)
    : schedule;

  const periods: ('Mañana' | 'Mediodía' | 'Tarde' | 'Noche')[] = ['Mañana', 'Mediodía', 'Tarde', 'Noche'];

  const isDark = theme === 'dark';
  const isWarm = theme === 'warm';

  return (
    <div className="space-y-4">
      {periods.map(period => {
        const items = filteredSchedule.filter(i => i.period === period);
        if (items.length === 0) return null;

        return (
          <div key={period} className="space-y-2">
            {/* Period header */}
            <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider uppercase text-zinc-400">
              <span className={`w-2 h-2 rounded-full ${
                period === 'Mañana' ? 'bg-amber-400' :
                period === 'Mediodía' ? 'bg-orange-400' :
                period === 'Tarde' ? 'bg-blue-400' : 'bg-indigo-400'
              }`}></span>
              <span>{period}</span>
              <span className="text-[10px] text-zinc-500 font-normal">({items.length} tomas)</span>
            </div>

            {/* Items list */}
            <div className="space-y-2">
              {items.map(item => {
                return (
                  <div
                    key={item.id}
                    onClick={() => onToggleTaken(item.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      item.taken
                        ? isDark 
                          ? 'bg-zinc-900/40 border-zinc-800/60 opacity-60' 
                          : isWarm 
                          ? 'bg-warm-100/50 border-warm-200/50 opacity-60' 
                          : 'bg-zinc-100 border-zinc-200 opacity-60'
                        : isDark
                        ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 shadow-sm'
                        : isWarm
                        ? 'bg-white border-warm-200/80 hover:border-warm-300 shadow-xs'
                        : 'bg-white border-zinc-200 hover:border-zinc-300 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleTaken(item.id);
                        }}
                        className="mt-0.5 text-zinc-400 hover:text-emerald-500 transition-colors"
                      >
                        {item.taken ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
                        ) : (
                          <Circle className="w-5 h-5 text-zinc-400" />
                        )}
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono font-bold ${
                            isDark ? 'text-zinc-200' : 'text-zinc-900'
                          }`}>
                            {item.time}
                          </span>
                          <span className={`text-xs font-semibold ${
                            item.taken ? 'line-through text-zinc-500' : isDark ? 'text-white' : 'text-zinc-900'
                          }`}>
                            {item.medicationName}
                          </span>
                          <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 px-1.5 py-0.2 rounded">
                            {item.dosage}
                          </span>
                        </div>

                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {item.treatmentName}
                        </p>

                        {/* Dietary & Intake Requirements pills */}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.requirements.map((req, rIdx) => (
                            <span
                              key={rIdx}
                              className={`text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 font-medium border ${
                                req.type === 'ayunas'
                                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                  : req.type === 'con_comida'
                                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                  : req.type === 'condicional'
                                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              }`}
                              title={req.detail}
                            >
                              <span>{req.icon}</span>
                              <span>{req.label}</span>
                              <span className="text-[9px] opacity-75 font-normal">({req.detail})</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        item.taken 
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {item.taken ? 'Completado' : 'Pendiente'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
