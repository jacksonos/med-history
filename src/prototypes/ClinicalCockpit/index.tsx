import React, { useState } from 'react';
import { GlobalHealthProfile } from '../../data/mockData';
import { AnatomicalBodyMap } from '../../components/AnatomicalBodyMap';
import { 
  Sliders, Shield, Users, Printer, FileText, 
  Activity, AlertTriangle, CheckCircle, Crosshair, ArrowRight
} from 'lucide-react';

interface Props {
  profile: GlobalHealthProfile;
  onUpdateProfile: (p: GlobalHealthProfile) => void;
}

export const ClinicalCockpitPrototype: React.FC<Props> = ({ profile, onUpdateProfile }) => {
  const [selectedRegion, setSelectedRegion] = useState<'cabeza_dental' | 'estomago' | 'respiratorio' | null>(null);
  const [showUnifiedTicket, setShowUnifiedTicket] = useState(false);

  return (
    <div className="font-swiss max-w-6xl mx-auto min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 antialiased">
      {/* Flight Deck Header */}
      <header className="border-b border-slate-800 pb-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <Crosshair className="w-4 h-4" />
            <span>CLINICAL COCKPIT // GESTIÓN DE POLIFARMACIA & CUIDADOR</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Tablero de Control Médico Multitratamiento
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Supervisión integral de 3 tratamientos concurrentes (Odontología, Gastro, Alergología).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUnifiedTicket(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs font-mono flex items-center gap-1.5 shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>Generar Boleto Médico Unificado</span>
          </button>
        </div>
      </header>

      {/* Grid: Cockpit Instruments */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (4 cols): Anatomical Radar */}
        <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex justify-between items-center text-xs font-mono text-slate-400">
            <span>RADAR ANATÓMICO</span>
            <span className="text-emerald-400 font-bold">3 Focos Activos</span>
          </div>

          <AnatomicalBodyMap
            treatments={profile.activeTreatments}
            selectedRegion={selectedRegion}
            onSelectRegion={setSelectedRegion}
            theme="dark"
          />

          <div className="text-[11px] font-mono text-slate-400 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
            Al seleccionar un foco anatómico, el tablero filtra la medicación diana y el historial de tomas correspondiente.
          </div>
        </div>

        {/* Right Column (8 cols): Treatments & Cross-Prescription Matrix */}
        <div className="lg:col-span-8 space-y-5">
          {/* Active Treatments Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-mono uppercase text-slate-300 tracking-wider">
                Resumen de Tratamientos Concurrentes
              </h3>
              <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                Contexto: Lima, Perú
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 px-2">ESPECIALIDAD</th>
                    <th className="py-2 px-2">MÉDICO / CMP</th>
                    <th className="py-2 px-2">CURSO</th>
                    <th className="py-2 px-2">FÁRMACOS PRINCIPALES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {profile.activeTreatments.map(t => (
                    <tr key={t.id} className="hover:bg-slate-900/60 font-sans">
                      <td className="py-3 px-2 font-bold text-white text-xs">
                        {t.category}
                        <span className="block font-mono text-[10px] text-slate-400 font-normal">
                          {t.bodyRegionLabel}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-slate-300 text-xs font-mono">
                        {t.doctor}
                        <span className="block text-[10px] text-slate-500">{t.doctorCmp}</span>
                      </td>
                      <td className="py-3 px-2 font-mono text-emerald-400 text-xs">
                        Día {t.daysElapsed}/{t.daysTotal}
                      </td>
                      <td className="py-3 px-2 text-slate-300 text-xs">
                        {t.medications.map(m => m.name).join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Intake Requirements & Dietary Protocol Matrix */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-mono uppercase text-slate-300 tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              Matriz de Requisitos Alimenticios y Precauciones
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="font-mono text-amber-400 font-bold block mb-1">
                  ⚡ En Ayunas Estricto:
                </span>
                <p className="text-slate-300">
                  <strong>Omeprazol 20mg:</strong> Al despertar con 1/2 vaso de agua. Esperar 30 min antes de ingerir el desayuno.
                </p>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="font-mono text-emerald-400 font-bold block mb-1">
                  🍽️ Con Alimentos Copiosos:
                </span>
                <p className="text-slate-300">
                  <strong>Amoxicilina + Clavulánico:</strong> Al inicio de comidas para prevenir náuseas.<br />
                  <strong>Naproxeno 550mg:</strong> Siempre con estómago lleno para evitar daño gástrico.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: BOLETO MÉDICO UNIFICADO (PRINT-READY) */}
      {showUnifiedTicket && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-zinc-900 w-full max-w-3xl rounded-2xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto font-sans">
            <div className="border-b-2 border-zinc-900 pb-4 mb-5 flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase">
                  My Med History // Resumen Clínico Transversal
                </span>
                <h2 className="text-xl font-bold text-zinc-900 mt-1">
                  Boleto Médico Unificado de Medicación Concurrente
                </h2>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Reúne 3 recetas de distintas clínicas para revisión del médico tratante.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-zinc-900 text-white px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir
                </button>
                <button
                  onClick={() => setShowUnifiedTicket(false)}
                  className="bg-zinc-200 text-zinc-800 px-3 py-1.5 rounded-lg text-xs font-mono"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs bg-zinc-50 p-3 rounded-lg border border-zinc-200 mb-5 font-mono">
              <div>
                <span className="text-zinc-500 block">PACIENTE:</span>
                <span className="font-bold text-zinc-900">{profile.patientName} ({profile.age}a)</span>
              </div>
              <div>
                <span className="text-zinc-500 block">UBICACIÓN:</span>
                <span className="text-zinc-800">{profile.location}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">ALERGIAS DECLARADAS:</span>
                <span className="text-amber-800 font-bold">Sulfas (Sospecha)</span>
              </div>
            </div>

            {/* Consolidated Treatments List */}
            <div className="space-y-4 text-xs">
              {profile.activeTreatments.map(t => (
                <div key={t.id} className="border border-zinc-200 rounded-xl p-3 bg-zinc-50/50">
                  <div className="flex justify-between items-center border-b border-zinc-200 pb-1.5 mb-2 font-mono">
                    <span className="font-bold text-zinc-900">{t.title}</span>
                    <span className="text-zinc-600">{t.doctor} ({t.doctorCmp}) · {t.clinic}</span>
                  </div>
                  <div className="space-y-1">
                    {t.medications.map(m => (
                      <div key={m.id} className="flex justify-between items-center text-zinc-800">
                        <span>• <strong>{m.name}</strong> ({m.presentation}): {m.dosage} — {m.frequency}</span>
                        <span className="font-mono text-zinc-500">{m.duration}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-200 text-[10px] text-zinc-500 font-mono text-center">
              Documento informativo elaborado por el paciente en My Med History · No sustituye criterio médico oficial.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
