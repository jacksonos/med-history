import React, { useState } from 'react';
import { GlobalHealthProfile } from '../../data/mockData';
import { AnatomicalBodyMap } from '../../components/AnatomicalBodyMap';
import { 
  Box, Layers, ShieldCheck, Clock, Zap, 
  Sparkles, Calendar, ChevronRight, Activity, ArrowUpRight
} from 'lucide-react';

interface Props {
  profile: GlobalHealthProfile;
  onUpdateProfile: (p: GlobalHealthProfile) => void;
}

export const NexusBento3DPrototype: React.FC<Props> = ({ profile, onUpdateProfile }) => {
  const [selectedRegion, setSelectedRegion] = useState<'cabeza_dental' | 'estomago' | 'respiratorio' | null>(null);

  const completedCount = profile.dailySchedule.filter(s => s.taken).length;
  const adherencePercent = Math.round((completedCount / profile.dailySchedule.length) * 100);

  return (
    <div className="font-sans max-w-6xl mx-auto min-h-screen bg-black text-white p-4 sm:p-6 antialiased selection:bg-purple-600">
      {/* Top Futuristic Bar */}
      <header className="border-b border-zinc-800/80 pb-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-purple-400">
            <Box className="w-3.5 h-3.5" />
            <span>NEXUS BENTO 3D // SPATIAL HEALTH MATRIX</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Centro de Mando Holístico
          </h1>
          <p className="text-xs text-zinc-400">
            Visión espacial unificada de tratamientos, anatomía y cronograma metabólico.
          </p>
        </div>

        {/* Global adherence badge */}
        <div className="flex items-center gap-3 bg-zinc-900/90 border border-zinc-800 p-2.5 rounded-2xl">
          <div className="text-right text-xs">
            <span className="text-zinc-400 font-mono text-[10px] block">ADHERENCIA DIARIA</span>
            <span className="font-mono font-bold text-emerald-400">{adherencePercent}% ({completedCount}/{profile.dailySchedule.length})</span>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-emerald-500/80 flex items-center justify-center font-mono text-xs font-bold text-emerald-400">
            {adherencePercent}%
          </div>
        </div>
      </header>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* BENTO CARD 1: 3D Holographic Anatomical Silhouette (5 cols, spans 2 rows) */}
        <div className="md:col-span-5 bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden flex flex-col items-center justify-between">
          <div className="w-full flex justify-between items-center text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5 text-purple-400">
              <Sparkles className="w-3.5 h-3.5" /> Silueta Anatómica
            </span>
            <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">
              Hotspots Interactivos
            </span>
          </div>

          <div className="my-2 transform hover:scale-[1.02] transition-transform duration-300">
            <AnatomicalBodyMap
              treatments={profile.activeTreatments}
              selectedRegion={selectedRegion}
              onSelectRegion={setSelectedRegion}
              theme="dark"
            />
          </div>

          <div className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl p-2.5 text-center text-xs text-zinc-400 font-mono">
            {selectedRegion ? `Filtrando por: ${selectedRegion}` : '3 Regiones Anatómicas Activas'}
          </div>
        </div>

        {/* BENTO CARD 2: Daily Intake Itinerary Stream (7 cols) */}
        <div className="md:col-span-7 bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Próximas Tomas & Requisitos
            </span>
            <span className="text-[11px] font-mono text-cyan-400">
              Itinerario del Día
            </span>
          </div>

          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {profile.dailySchedule.map((s) => (
              <div 
                key={s.id}
                className="bg-zinc-950/90 border border-zinc-800/80 rounded-xl p-3 flex items-center justify-between text-xs hover:border-zinc-700 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-cyan-300 text-xs">{s.time}</span>
                    <span className="font-semibold text-white">{s.medicationName}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{s.treatmentName}</p>
                  <div className="mt-1 flex gap-1">
                    {s.requirements.map((r, i) => (
                      <span key={i} className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.2 rounded font-mono">
                        {r.icon} {r.label}
                      </span>
                    ))}
                  </div>
                </div>

                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  s.taken ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {s.taken ? 'Tomado' : 'Pendiente'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* BENTO CARD 3: Active Treatments Overview (6 cols) */}
        <div className="md:col-span-6 bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 space-y-3">
          <span className="text-xs font-mono uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            Tratamientos Concurrentes ({profile.activeTreatments.length})
          </span>

          <div className="space-y-2">
            {profile.activeTreatments.map(t => (
              <div key={t.id} className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80 text-xs flex justify-between items-center">
                <div>
                  <span className="font-bold text-white block">{t.title}</span>
                  <span className="text-zinc-400 text-[11px]">{t.doctor} · Día {t.daysElapsed}/{t.daysTotal}</span>
                </div>
                <span className="text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded">
                  {t.bodyRegionLabel}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* BENTO CARD 4: Drug Safety & Food Precaution Matrix (6 cols) */}
        <div className="md:col-span-6 bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 space-y-3">
          <span className="text-xs font-mono uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            Matriz de Seguridad Cruzada
          </span>

          {profile.knownInteractionsAlerts.map((a, idx) => (
            <div key={idx} className="bg-amber-950/20 border border-amber-900/60 p-3 rounded-xl text-xs space-y-1">
              <span className="font-bold text-amber-300 font-mono text-[11px]">
                ⚠️ {a.drugs.join(' ⇄ ')}
              </span>
              <p className="text-zinc-300 text-[11px]">{a.actionAdvice}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
