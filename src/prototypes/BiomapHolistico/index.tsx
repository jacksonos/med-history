import React, { useState } from 'react';
import { GlobalHealthProfile, TreatmentData } from '../../data/mockData';
import { AnatomicalBodyMap } from '../../components/AnatomicalBodyMap';
import { MedicationItinerary } from '../../components/MedicationItinerary';
import { 
  Activity, ShieldAlert, Sparkles, Filter, ChevronRight, 
  Calendar, Heart, Pill, AlertTriangle, FileText, CheckCircle
} from 'lucide-react';

interface Props {
  profile: GlobalHealthProfile;
  onUpdateProfile: (p: GlobalHealthProfile) => void;
}

export const BiomapHolisticoPrototype: React.FC<Props> = ({ profile, onUpdateProfile }) => {
  const [selectedRegion, setSelectedRegion] = useState<'cabeza_dental' | 'estomago' | 'respiratorio' | null>(null);
  const [activeTab, setActiveTab] = useState<'cuerpo' | 'itinerario' | 'resumen'>('cuerpo');

  const handleToggleTaken = (scheduleId: string) => {
    const updatedSchedule = profile.dailySchedule.map(item => 
      item.id === scheduleId ? { ...item, taken: !item.taken } : item
    );
    onUpdateProfile({
      ...profile,
      dailySchedule: updatedSchedule
    });
  };

  const filteredTreatments = selectedRegion
    ? profile.activeTreatments.filter(t => t.bodyRegion === selectedRegion)
    : profile.activeTreatments;

  return (
    <div className="font-sans max-w-5xl mx-auto min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 antialiased selection:bg-blue-600">
      {/* Top Holistic Header */}
      <header className="border-b border-zinc-800 pb-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
            <span>BIOMAP HOLÍSTICO // ANATOMICAL SPATIAL HEALTH</span>
            <span className="text-zinc-600">|</span>
            <span>PACIENTE: {profile.patientName} ({profile.age} AÑOS)</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Resumen General & Mapa Anatómico
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            {profile.activeTreatments.length} tratamientos activos concurrentes · {profile.dailySchedule.length} tomas diarias programadas
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 p-1 rounded-xl text-xs font-medium">
          <button
            onClick={() => setActiveTab('cuerpo')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'cuerpo' ? 'bg-blue-600 text-white font-bold shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Mapa Corporal</span>
          </button>
          <button
            onClick={() => setActiveTab('itinerario')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'itinerario' ? 'bg-blue-600 text-white font-bold shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Itinerario 24h</span>
          </button>
          <button
            onClick={() => setActiveTab('resumen')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'resumen' ? 'bg-blue-600 text-white font-bold shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Interacciones ({profile.knownInteractionsAlerts.length})</span>
          </button>
        </div>
      </header>

      {/* VIEW 1: MAPA CORPORAL + TRATAMIENTOS LOCALIZADOS */}
      {activeTab === 'cuerpo' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Interactive Vector Body Canvas (5 cols) */}
          <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col items-center">
            <div className="w-full flex justify-between items-center text-xs font-mono text-zinc-400 mb-2">
              <span>EXPLORADOR ANATÓMICO</span>
              {selectedRegion && (
                <button
                  onClick={() => setSelectedRegion(null)}
                  className="text-blue-400 hover:text-blue-300 underline text-[11px]"
                >
                  Restablecer
                </button>
              )}
            </div>

            <AnatomicalBodyMap
              treatments={profile.activeTreatments}
              selectedRegion={selectedRegion}
              onSelectRegion={setSelectedRegion}
              theme="dark"
            />

            {/* Quick Region Selector Pills */}
            <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
              {[
                { id: 'cabeza_dental', label: 'Mandíbula & Dientes', color: 'border-blue-500/40 text-blue-400' },
                { id: 'respiratorio', label: 'Vías Aéreas', color: 'border-purple-500/40 text-purple-400' },
                { id: 'estomago', label: 'Estómago', color: 'border-emerald-500/40 text-emerald-400' }
              ].map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRegion(selectedRegion === r.id ? null : r.id as any)}
                  className={`text-[11px] font-mono px-2.5 py-1 rounded-full border transition-all ${
                    selectedRegion === r.id ? 'bg-zinc-800 border-white text-white font-bold' : `${r.color} bg-zinc-900/60`
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Localized Treatments and Pills (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-mono text-zinc-400 uppercase tracking-wider">
                Tratamientos en la zona seleccionada ({filteredTreatments.length})
              </span>
              <span className="text-zinc-500 font-mono text-[11px]">
                {profile.location}
              </span>
            </div>

            <div className="space-y-3">
              {filteredTreatments.map(treatment => (
                <div
                  key={treatment.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-sm hover:border-zinc-700 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase bg-blue-950 text-blue-400 border border-blue-800 px-2 py-0.5 rounded">
                          {treatment.bodyRegionLabel}
                        </span>
                        <span className="text-xs text-zinc-400 font-mono">
                          Día {treatment.daysElapsed} de {treatment.daysTotal}
                        </span>
                      </div>
                      <h3 className="font-bold text-base text-white mt-1.5">
                        {treatment.title}
                      </h3>
                      <p className="text-xs text-zinc-400">
                        {treatment.doctor} · {treatment.clinic}
                      </p>
                    </div>

                    <span className="text-xs font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded">
                      {treatment.status}
                    </span>
                  </div>

                  {/* Medications list */}
                  <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                      Medicamentos e Indicaciones de Ingesta:
                    </span>
                    {treatment.medications.map(med => (
                      <div key={med.id} className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 text-xs flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-zinc-200">{med.name}</span>
                          <span className="text-zinc-500 ml-1.5 font-mono text-[11px]">({med.dosage} · {med.frequency})</span>
                          <p className="text-zinc-400 text-[11px] mt-0.5">"{med.instructions}"</p>
                        </div>
                        <div className="flex gap-1">
                          {med.requirements.map((req, rIdx) => (
                            <span key={rIdx} className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-mono" title={req.detail}>
                              {req.icon} {req.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: ITINERARIO 24H CON REQUISITOS DE INGESTA */}
      {activeTab === 'itinerario' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">
                Itinerario Consolidado de Tomas Diarias
              </h3>
              <p className="text-xs text-zinc-400">
                Agrupa las tomas de tus 3 tratamientos según tu ritmo biológico diario.
              </p>
            </div>
            <div className="text-right text-xs font-mono text-zinc-400">
              Progreso: {profile.dailySchedule.filter(s => s.taken).length} / {profile.dailySchedule.length} tomas
            </div>
          </div>

          <MedicationItinerary
            schedule={profile.dailySchedule}
            onToggleTaken={handleToggleTaken}
            filterRegion={selectedRegion}
            theme="dark"
          />
        </div>
      )}

      {/* VIEW 3: SEMÁFORO DE INTERACCIONES FARMACOLÓGICAS CRUZADAS */}
      {activeTab === 'resumen' && (
        <div className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              Auditoría de Interacciones Cruzadas entre Recetas
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Como tienes recetas de distintas especialidades (Odontología, Gastro y Alergología), la app analiza posibles incompatibilidades o precauciones alimenticias.
            </p>

            <div className="mt-4 space-y-3">
              {profile.knownInteractionsAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border text-xs space-y-2 ${
                    alert.severity === 'moderada'
                      ? 'bg-amber-950/30 border-amber-800/80 text-amber-200'
                      : 'bg-blue-950/30 border-blue-800/80 text-blue-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm font-mono uppercase">
                      {alert.drugs.join(' ⇄ ')}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold bg-amber-900 text-amber-200">
                      Severidad {alert.severity}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300">{alert.message}</p>
                  <div className="bg-zinc-950/70 p-2.5 rounded-lg border border-zinc-800 text-[11px] font-mono text-emerald-400">
                    💡 <strong>Conducta sugerida:</strong> {alert.actionAdvice}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
