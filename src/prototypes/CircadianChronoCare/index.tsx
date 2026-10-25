import React, { useState } from 'react';
import { GlobalHealthProfile } from '../../data/mockData';
import { 
  Sun, Moon, Sunrise, Sunset, Clock, AlertTriangle, 
  Check, CheckCircle2, Circle, Coffee, Utensils, Droplet, Sparkles
} from 'lucide-react';

interface Props {
  profile: GlobalHealthProfile;
  onUpdateProfile: (p: GlobalHealthProfile) => void;
}

export const CircadianChronoCarePrototype: React.FC<Props> = ({ profile, onUpdateProfile }) => {
  const [selectedSlot, setSelectedSlot] = useState<string>(profile.dailySchedule[0].id);

  const handleToggleTaken = (scheduleId: string) => {
    const updated = profile.dailySchedule.map(s => 
      s.id === scheduleId ? { ...s, taken: !s.taken } : s
    );
    onUpdateProfile({ ...profile, dailySchedule: updated });
  };

  const selectedItem = profile.dailySchedule.find(s => s.id === selectedSlot) || profile.dailySchedule[0];

  return (
    <div className="font-sans max-w-4xl mx-auto min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 antialiased">
      {/* Top Chrono Header */}
      <header className="border-b border-slate-800 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <Sun className="w-3.5 h-3.5" />
              <span>CIRCADIAN CHRONOCARE // RITMO METABÓLICO 24H</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
              Itinerario Biológico de Medicamentos
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Sincroniza la absorción con tus comidas, sueño y pH gástrico.
            </p>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-mono text-slate-400 block">Hora Local (Lima)</span>
            <span className="text-lg font-mono font-bold text-cyan-300">14:30 PET</span>
          </div>
        </div>

        {/* Circadian Arc Bar Simulation */}
        <div className="mt-5 bg-gradient-to-r from-amber-500/20 via-sky-500/20 to-indigo-900/40 border border-slate-800 rounded-2xl p-4">
          <div className="flex justify-between items-center text-xs font-mono text-slate-300">
            <div className="flex items-center gap-1.5 text-amber-400">
              <Sunrise className="w-4 h-4" />
              <span>07:00 Despertar</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-300">
              <Sun className="w-4 h-4" />
              <span>13:30 Almuerzo</span>
            </div>
            <div className="flex items-center gap-1.5 text-indigo-400">
              <Sunset className="w-4 h-4" />
              <span>19:00 Cena</span>
            </div>
            <div className="flex items-center gap-1.5 text-indigo-300">
              <Moon className="w-4 h-4" />
              <span>23:00 Reposo</span>
            </div>
          </div>

          {/* Timeline dots for each pill */}
          <div className="relative mt-3 h-2 bg-slate-800 rounded-full flex items-center justify-between px-2">
            {profile.dailySchedule.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setSelectedSlot(s.id)}
                title={`${s.time} - ${s.medicationName}`}
                className={`w-4 h-4 rounded-full border-2 transition-all transform hover:scale-125 ${
                  selectedSlot === s.id
                    ? 'bg-cyan-400 border-white ring-2 ring-cyan-400/40 scale-125'
                    : s.taken
                    ? 'bg-emerald-500 border-emerald-300'
                    : 'bg-slate-700 border-slate-500'
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Main Split Grid: Left Itinerary Timeline / Right Intake Detail */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Chronological Time Blocks */}
        <div className="md:col-span-7 space-y-3">
          <h3 className="text-xs font-mono uppercase text-slate-400 tracking-wider">
            Secuencia de Ingesta Diaria
          </h3>

          <div className="space-y-2.5">
            {profile.dailySchedule.map((item) => {
              const isSelected = selectedSlot === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedSlot(item.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-500/80 ring-1 ring-cyan-500/30 shadow-lg'
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleTaken(item.id);
                      }}
                      className="text-slate-400 hover:text-emerald-400 transition-colors"
                    >
                      {item.taken ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-500/20" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-500" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-300">
                          {item.time}
                        </span>
                        <span className={`text-xs font-semibold ${item.taken ? 'line-through text-slate-500' : 'text-white'}`}>
                          {item.medicationName}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        {item.treatmentName} · {item.dosage}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {item.requirements.map((r, i) => (
                      <span key={i} className="text-xs" title={`${r.label}: ${r.detail}`}>
                        {r.icon}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (5 cols): Focused Intake Protocol Card */}
        <div className="md:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-[10px] font-mono uppercase bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded">
              Protocolo de Ingesta // {selectedItem.time}
            </span>
            <h3 className="font-bold text-lg text-white mt-2">
              {selectedItem.medicationName}
            </h3>
            <p className="text-xs text-slate-400">{selectedItem.treatmentName}</p>
          </div>

          {/* Critical Dietary Rules */}
          <div className="space-y-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wide block">
              Requisitos Metabólicos Obligatorios:
            </span>
            {selectedItem.requirements.map((req, idx) => (
              <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex items-start gap-2.5">
                <span className="text-lg">{req.icon}</span>
                <div>
                  <span className="font-bold text-slate-200">{req.label}</span>
                  <p className="text-slate-400 text-[11px] mt-0.5">{req.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Action button */}
          <button
            onClick={() => handleToggleTaken(selectedItem.id)}
            className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
              selectedItem.taken
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold'
            }`}
          >
            {selectedItem.taken ? 'Desmarcar toma' : '✓ Confirmar toma realizada'}
          </button>
        </div>
      </div>
    </div>
  );
};
