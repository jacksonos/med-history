import React, { useState } from 'react';
import { TreatmentData } from '../../data/mockData';
import { PrescriptionCanvas } from '../../components/PrescriptionCanvas';
import { 
  GitCommit, Clock, Check, AlertCircle, Plus, 
  Terminal, Calendar, MessageSquare, ChevronDown, ChevronRight, FileText
} from 'lucide-react';

interface Props {
  treatment: TreatmentData;
  onUpdateTreatment: (t: TreatmentData) => void;
}

export const RadarTimelinePrototype: React.FC<Props> = ({ treatment, onUpdateTreatment }) => {
  const [filter, setFilter] = useState<'all' | 'logs' | 'questions'>('all');
  const [quickInput, setQuickInput] = useState('');
  const [openAccordion, setOpenAccordion] = useState<string | null>(treatment.medications[0].id);
  const [showRecipeModal, setShowRecipeModal] = useState(false);

  const handleAddQuickEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;

    const newLog = {
      id: `log-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      relativeDay: `Día ${treatment.daysElapsed}`,
      moodLevel: 4,
      tolerability: 'Buena' as const,
      notes: quickInput.trim(),
      reportedSymptoms: ['Entrada en consola'],
      medicationTakenId: treatment.medications[0].id
    };

    onUpdateTreatment({
      ...treatment,
      logs: [newLog, ...treatment.logs]
    });
    setQuickInput('');
  };

  return (
    <div className="font-sans max-w-4xl mx-auto min-h-screen bg-zinc-950 text-zinc-200 p-4 sm:p-6 pb-20 selection:bg-zinc-800 selection:text-white">
      {/* Top Bar with Linear / shadcn style breadcrumb */}
      <div className="border-b border-zinc-800 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
            <span>app</span>
            <span>/</span>
            <span>tratamientos</span>
            <span>/</span>
            <span className="text-zinc-200 font-semibold">{treatment.id}</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1 flex items-center gap-2">
            {treatment.title}
            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
              En curso
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            {treatment.doctor} · Día {treatment.daysElapsed} de {treatment.daysTotal}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRecipeModal(true)}
            className="text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 px-3 py-1.5 rounded-md font-mono flex items-center gap-1.5 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-zinc-400" />
            <span>Ver Receta</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Collapsible Medication Cards (shadcn accordion style) */}
        <div className="md:col-span-5 space-y-4">
          <div className="flex justify-between items-center text-xs font-mono text-zinc-400 uppercase tracking-wider">
            <span>Fármacos Prescritos</span>
            <span className="text-zinc-500">Radix / Accordion</span>
          </div>

          <div className="space-y-2">
            {treatment.medications.map((med) => {
              const isOpen = openAccordion === med.id;
              const hasAlert = med.uncertainFields.length > 0;

              return (
                <div 
                  key={med.id} 
                  className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenAccordion(isOpen ? null : med.id)}
                    className="w-full text-left p-3.5 flex items-center justify-between text-xs hover:bg-zinc-800/40"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-100">{med.name}</span>
                        {hasAlert && (
                          <span className="w-2 h-2 rounded-full bg-amber-400" title="Requiere revisión"></span>
                        )}
                      </div>
                      <p className="text-zinc-400 text-[11px] mt-0.5 font-mono">{med.dosage} · {med.frequency}</p>
                    </div>
                    {isOpen ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
                  </button>

                  {isOpen && (
                    <div className="px-3.5 pb-3.5 pt-1 text-xs border-t border-zinc-800/80 space-y-2.5 font-sans">
                      <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800 text-[11px]">
                        <span className="text-zinc-400 font-mono block mb-1">PAUTA & CUIDADOS:</span>
                        <p className="text-zinc-300">{med.instructions}</p>
                      </div>

                      <div className="text-[11px] text-zinc-400 space-y-1">
                        <span className="font-mono text-zinc-500 block">DURACIÓN:</span>
                        <span className="text-zinc-200">{med.duration}</span>
                      </div>

                      <div className="text-[10px] text-zinc-500 font-mono pt-1">
                        Fuente verificada: {med.education.sources[0]?.name}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Context box */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-lg p-3.5 text-xs">
            <span className="font-mono text-zinc-400 text-[10px] uppercase block mb-1.5">
              Contexto Clínico del Paciente
            </span>
            <ul className="text-zinc-300 text-[11px] space-y-1">
              {treatment.healthContext.allergies.map((a, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-zinc-500"></span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column (7 cols): Continuous Timeline Stream */}
        <div className="md:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-zinc-400 uppercase tracking-wider">Feed Cronológico</span>
              <div className="flex bg-zinc-900 border border-zinc-800 rounded p-0.5 text-[11px]">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-2 py-0.5 rounded ${filter === 'all' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400'}`}
                >
                  Todo
                </button>
                <button
                  onClick={() => setFilter('logs')}
                  className={`px-2 py-0.5 rounded ${filter === 'logs' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400'}`}
                >
                  Registros
                </button>
                <button
                  onClick={() => setFilter('questions')}
                  className={`px-2 py-0.5 rounded ${filter === 'questions' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400'}`}
                >
                  Dudas
                </button>
              </div>
            </div>
          </div>

          {/* Quick command bar input */}
          <form onSubmit={handleAddQuickEvent} className="relative">
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="Registra una toma, molestia o duda (Enter para enviar)..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 pl-3 pr-20 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 font-mono"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] px-2.5 py-1 rounded font-mono font-medium"
            >
              Post
            </button>
          </form>

          {/* Timeline Feed items */}
          <div className="relative pl-6 space-y-4 border-l border-zinc-800 mt-2">
            {/* Timeline Item: Today's logs */}
            {treatment.logs.map((log) => (
              <div key={log.id} className="relative group">
                <span className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-zinc-950"></span>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs">
                  <div className="flex justify-between items-center text-zinc-400 text-[11px] font-mono mb-1">
                    <span className="font-semibold text-zinc-200">{log.relativeDay}</span>
                    <span>{log.date} · {log.time}</span>
                  </div>
                  <p className="text-zinc-300 font-sans">{log.notes}</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-mono">
                      Tolerancia {log.tolerability}
                    </span>
                    {log.reportedSymptoms.map((sym, idx) => (
                      <span key={idx} className="text-[10px] bg-amber-950/60 text-amber-300 border border-amber-900/60 px-1.5 py-0.5 rounded">
                        {sym}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Timeline Item: Doctor Questions */}
            {treatment.questions.map((q) => (
              <div key={q.id} className="relative group">
                <span className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-zinc-950"></span>
                <div className="bg-zinc-900 border border-zinc-800/90 rounded-lg p-3 text-xs">
                  <div className="flex justify-between items-center text-[11px] font-mono text-emerald-400 mb-1">
                    <span>Duda preparada para Consulta</span>
                    <span className="text-zinc-500">{q.category}</span>
                  </div>
                  <p className="text-zinc-200 font-medium font-sans">{q.question}</p>
                </div>
              </div>
            ))}

            {/* Timeline Item: Prescription Creation Event */}
            <div className="relative">
              <span className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-zinc-600 ring-4 ring-zinc-950"></span>
              <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-lg p-3 text-xs text-zinc-400 font-mono">
                <div className="flex justify-between items-center text-[11px] mb-1">
                  <span className="text-zinc-300 font-bold">Receta Registrada & Verificada</span>
                  <span>{treatment.dateIssued}</span>
                </div>
                <p className="text-zinc-400 font-sans text-xs">
                  Documento digitalizado expedido por {treatment.doctor} ({treatment.clinic}).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RECETA POPUP */}
      {showRecipeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-xl rounded-xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-mono text-sm font-bold text-white">
                Documento Fuente // Receta Original
              </h3>
              <button 
                onClick={() => setShowRecipeModal(false)}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1 rounded font-mono"
              >
                Cerrar
              </button>
            </div>
            <PrescriptionCanvas medications={treatment.medications} />
          </div>
        </div>
      )}
    </div>
  );
};
