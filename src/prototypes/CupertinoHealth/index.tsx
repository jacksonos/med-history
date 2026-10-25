import React, { useState } from 'react';
import { TreatmentData, MedicationItem } from '../../data/mockData';
import { PrescriptionCanvas } from '../../components/PrescriptionCanvas';
import { 
  Heart, Calendar, Clock, AlertTriangle, CheckCircle2, 
  HelpCircle, ChevronRight, Plus, Sparkles, FileText, ArrowLeft,
  Smile, Meh, Frown, ShieldCheck, Share2
} from 'lucide-react';

interface Props {
  treatment: TreatmentData;
  onUpdateTreatment: (t: TreatmentData) => void;
}

export const CupertinoHealthPrototype: React.FC<Props> = ({ treatment, onUpdateTreatment }) => {
  const [currentTab, setCurrentTab] = useState<'indicaciones' | 'comprender' | 'evolucion' | 'consulta'>('indicaciones');
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedMedId, setSelectedMedId] = useState<string>(treatment.medications[0].id);

  // Quick check-in state
  const [checkInMood, setCheckInMood] = useState<number>(4);
  const [checkInTolerability, setCheckInTolerability] = useState<'Buena' | 'Regular' | 'Difícil'>('Buena');
  const [checkInNote, setCheckInNote] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

  const toggleSymptom = (s: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  const handleSaveCheckIn = () => {
    const newLog = {
      id: `log-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      relativeDay: `Día ${treatment.daysElapsed} (Reciente)`,
      moodLevel: checkInMood,
      tolerability: checkInTolerability,
      notes: checkInNote || 'Registro rápido sin notas adicionales.',
      reportedSymptoms: selectedSymptoms,
      medicationTakenId: selectedMedId,
    };

    onUpdateTreatment({
      ...treatment,
      logs: [newLog, ...treatment.logs]
    });
    setShowCheckInModal(false);
    setCheckInNote('');
    setSelectedSymptoms([]);
  };

  const selectedMed = treatment.medications.find(m => m.id === selectedMedId) || treatment.medications[0];

  return (
    <div className="font-apple max-w-md mx-auto min-h-screen bg-[#F2F2F7] text-zinc-900 pb-24 shadow-2xl relative border-x border-zinc-200">
      {/* Top iOS Status Bar simulation */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-zinc-200/80 px-5 pt-3 pb-2 flex justify-between items-center text-xs font-semibold">
        <span className="text-zinc-800">9:41</span>
        <div className="flex items-center gap-1.5 text-zinc-700">
          <span className="text-[11px] font-medium bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">
            Apple HIG
          </span>
          <div className="w-4 h-2.5 border border-zinc-800 rounded-sm p-0.5 flex items-center">
            <div className="bg-zinc-800 w-full h-full rounded-xs"></div>
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold tracking-tight">
            <Heart className="w-3.5 h-3.5 fill-blue-600 text-blue-600" />
            <span>MY MED HISTORY · SALUD</span>
          </div>
          <button 
            onClick={() => setShowRecipeModal(true)}
            className="text-xs bg-white/90 border border-zinc-300 text-zinc-700 font-medium px-2.5 py-1 rounded-full shadow-2xs hover:bg-zinc-50 flex items-center gap-1"
          >
            <FileText className="w-3 h-3 text-zinc-500" />
            <span>Ver Receta</span>
          </button>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 mt-1">
          {treatment.title}
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
          <span>{treatment.doctor}</span> · <span>Día {treatment.daysElapsed} de {treatment.daysTotal}</span>
        </p>

        {/* Progress pill bar */}
        <div className="mt-3 bg-zinc-200/80 h-1.5 rounded-full overflow-hidden">
          <div 
            className="bg-blue-600 h-full rounded-full transition-all duration-500" 
            style={{ width: `${(treatment.daysElapsed / treatment.daysTotal) * 100}%` }}
          />
        </div>
      </div>

      {/* Segmented Control (Apple style) */}
      <div className="px-4 py-2">
        <div className="bg-zinc-200/90 p-1 rounded-xl flex text-xs font-semibold text-zinc-600 select-none shadow-inner">
          <button
            onClick={() => setCurrentTab('indicaciones')}
            className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
              currentTab === 'indicaciones' ? 'bg-white text-zinc-900 shadow-sm font-bold' : 'hover:text-zinc-900'
            }`}
          >
            Pauta
          </button>
          <button
            onClick={() => setCurrentTab('comprender')}
            className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
              currentTab === 'comprender' ? 'bg-white text-zinc-900 shadow-sm font-bold' : 'hover:text-zinc-900'
            }`}
          >
            Comprender
          </button>
          <button
            onClick={() => setCurrentTab('evolucion')}
            className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
              currentTab === 'evolucion' ? 'bg-white text-zinc-900 shadow-sm font-bold' : 'hover:text-zinc-900'
            }`}
          >
            Evolución
          </button>
          <button
            onClick={() => setCurrentTab('consulta')}
            className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
              currentTab === 'consulta' ? 'bg-white text-zinc-900 shadow-sm font-bold' : 'hover:text-zinc-900'
            }`}
          >
            Consulta
          </button>
        </div>
      </div>

      {/* TAB 1: INDICACIONES */}
      {currentTab === 'indicaciones' && (
        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-medium px-1">
            <span>MEDICAMENTOS EXTRAÍDOS ({treatment.medications.length})</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Cotejado con receta
            </span>
          </div>

          {treatment.medications.map((med) => {
            const hasUncertainty = med.uncertainFields.length > 0;
            return (
              <div 
                key={med.id}
                onClick={() => setSelectedMedId(med.id)}
                className={`bg-white rounded-2xl p-4 shadow-sm border transition-all cursor-pointer ${
                  selectedMedId === med.id ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-zinc-200/70'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm text-zinc-900">{med.name}</h3>
                    <p className="text-xs text-zinc-500">{med.presentation}</p>
                  </div>
                  <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                    {med.dosage}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-zinc-50 p-2 rounded-xl">
                    <span className="text-[10px] text-zinc-400 uppercase font-semibold">Frecuencia</span>
                    <p className="font-medium text-zinc-800 mt-0.5">{med.frequency}</p>
                  </div>
                  <div className="bg-zinc-50 p-2 rounded-xl">
                    <span className="text-[10px] text-zinc-400 uppercase font-semibold">Duración</span>
                    <p className={`font-medium mt-0.5 ${hasUncertainty && med.uncertainFields.includes('duration') ? 'text-amber-600 font-bold' : 'text-zinc-800'}`}>
                      {med.duration}
                    </p>
                  </div>
                </div>

                {hasUncertainty && (
                  <div className="mt-2.5 bg-amber-50 border border-amber-200/80 rounded-xl p-2 flex items-center gap-2 text-[11px] text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Dato ausente o dudoso en la receta. Confirmar con doctor.</span>
                  </div>
                )}

                <div className="mt-2.5 text-[11px] text-zinc-500 italic bg-zinc-50/60 p-2 rounded-lg">
                  "{med.instructions}"
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: COMPRENDER */}
      {currentTab === 'comprender' && (
        <div className="px-4 py-3 space-y-3">
          <div className="bg-blue-500 text-white rounded-2xl p-4 shadow-sm relative overflow-hidden">
            <Sparkles className="w-20 h-20 text-white/10 absolute -right-4 -bottom-4" />
            <span className="text-[10px] font-bold tracking-wider uppercase bg-white/20 px-2 py-0.5 rounded-full">
              Educación & Respaldos
            </span>
            <h3 className="font-bold text-base mt-2">{selectedMed.name}</h3>
            <p className="text-xs text-blue-100 mt-1 leading-relaxed">
              {selectedMed.education.purpose}
            </p>
          </div>

          {/* How it works */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-200/70 space-y-2">
            <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wide">
              ¿Cómo funciona en tu organismo?
            </h4>
            <p className="text-xs text-zinc-600 leading-relaxed">
              {selectedMed.education.howItWorks}
            </p>
          </div>

          {/* Precautions */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-200/70 space-y-2">
            <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wide flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Cuidados Clave
            </h4>
            <ul className="text-xs text-zinc-600 space-y-1.5 list-disc list-inside">
              {selectedMed.education.precautions.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>

          {/* Verified sources */}
          <div className="bg-zinc-100 rounded-xl p-3 text-[11px] text-zinc-500 space-y-1">
            <span className="font-semibold text-zinc-600">Fuentes oficiales consultadas:</span>
            {selectedMed.education.sources.map((s, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
                <span>{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: EVOLUCIÓN */}
      {currentTab === 'evolucion' && (
        <div className="px-4 py-3 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
              Tus Registros de Sensaciones
            </h3>
            <button
              onClick={() => setShowCheckInModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Registrar cómo me siento
            </button>
          </div>

          <div className="space-y-2.5">
            {treatment.logs.map((log) => (
              <div key={log.id} className="bg-white rounded-2xl p-3.5 shadow-sm border border-zinc-200/70">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-zinc-900">{log.relativeDay}</span>
                  <span className="text-zinc-400 font-mono text-[11px]">{log.date} · {log.time}</span>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-zinc-100 px-2 py-0.5 rounded-md text-xs font-medium">
                    {log.moodLevel >= 4 ? <Smile className="w-3.5 h-3.5 text-emerald-600" /> : <Meh className="w-3.5 h-3.5 text-amber-600" />}
                    <span>Tolerancia {log.tolerability}</span>
                  </div>
                  {log.reportedSymptoms.map((sym, sIdx) => (
                    <span key={sIdx} className="bg-amber-50 text-amber-800 text-[10px] px-2 py-0.5 rounded-md border border-amber-200/50">
                      {sym}
                    </span>
                  ))}
                </div>

                <p className="text-xs text-zinc-700 mt-2 bg-zinc-50/80 p-2 rounded-xl">
                  {log.notes}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PREPARAR CONSULTA */}
      {currentTab === 'consulta' && (
        <div className="px-4 py-3 space-y-4">
          {/* Apple Wallet Style "Ficha Médica" */}
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 text-white rounded-3xl p-5 shadow-xl relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">
                  Ficha para tu Médico
                </span>
                <h3 className="text-lg font-bold mt-0.5">{treatment.title}</h3>
                <p className="text-xs text-zinc-300">{treatment.clinic}</p>
              </div>
              <button 
                onClick={() => alert("Resumen listo para mostrar en consulta o compartir")}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-full text-white"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-700/80 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-zinc-400 uppercase">Cumplimiento declarado</span>
                <p className="font-bold text-emerald-400 text-sm mt-0.5">3 de 3 tomas</p>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase">Evolución observada</span>
                <p className="font-bold text-zinc-200 text-sm mt-0.5">Dolor en remisión</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wide">
              Preguntas para resolver con el doctor:
            </h4>
            {treatment.questions.map((q) => (
              <div key={q.id} className="bg-white rounded-xl p-3 border border-zinc-200/70 shadow-2xs flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium text-zinc-900">{q.question}</p>
                  <span className="inline-block text-[10px] text-zinc-400 mt-1">
                    {q.isSuggested ? 'Sugerida por la app para validar' : 'Agregada por ti'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL BOTTOM SHEET: RECETA ORIGINAL */}
      {showRecipeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl max-h-[85vh] overflow-y-auto p-4 shadow-2xl">
            <div className="w-12 h-1 bg-zinc-300 rounded-full mx-auto mb-3" />
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm text-zinc-900">Documento Original (Receta)</h3>
              <button 
                onClick={() => setShowRecipeModal(false)}
                className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full"
              >
                Cerrar
              </button>
            </div>
            <PrescriptionCanvas 
              medications={treatment.medications}
              selectedMedId={selectedMedId}
              onSelectMed={(id) => setSelectedMedId(id)}
            />
          </div>
        </div>
      )}

      {/* MODAL BOTTOM SHEET: REGISTRAR EVOLUCIÓN */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="w-12 h-1 bg-zinc-300 rounded-full mx-auto" />
            
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base text-zinc-900">Check-in rápido</h3>
                <p className="text-xs text-zinc-500">¿Cómo te sientes en este momento?</p>
              </div>
              <button onClick={() => setShowCheckInModal(false)} className="text-zinc-400 hover:text-zinc-600 text-sm">
                ✕
              </button>
            </div>

            {/* Mood faces (Cupertino spring haptic style) */}
            <div className="flex justify-around py-2">
              {[
                { val: 2, icon: Frown, label: 'Molesto' },
                { val: 3, icon: Meh, label: 'Regular' },
                { val: 5, icon: Smile, label: 'Muy bien' }
              ].map(item => {
                const Icon = item.icon;
                const isSelected = checkInMood === item.val;
                return (
                  <button
                    key={item.val}
                    onClick={() => setCheckInMood(item.val)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${
                      isSelected ? 'bg-blue-50 text-blue-600 scale-105 font-bold' : 'text-zinc-400 hover:text-zinc-600'
                    }`}
                  >
                    <Icon className="w-8 h-8" />
                    <span className="text-[11px]">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick symptom pills */}
            <div>
              <span className="text-xs font-semibold text-zinc-700 block mb-1.5">
                Molestias frecuentes (toca para marcar):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {['Ardor estomacal', 'Boca seca', 'Mareo leve', 'Dolor en sutura', 'Cansancio'].map(sym => (
                  <button
                    key={sym}
                    onClick={() => toggleSymptom(sym)}
                    className={`text-xs px-2.5 py-1 rounded-full transition-all border ${
                      selectedSymptoms.includes(sym)
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                    }`}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional note */}
            <div>
              <span className="text-xs font-semibold text-zinc-700 block mb-1">
                Nota libre (opcional):
              </span>
              <textarea
                value={checkInNote}
                onChange={(e) => setCheckInNote(e.target.value)}
                placeholder="Ej: Tomé la pastilla con jugo y sentí menos acidez..."
                className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:outline-blue-500 bg-zinc-50 resize-none h-18"
              />
            </div>

            <button
              onClick={handleSaveCheckIn}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl text-xs shadow-md transition-all"
            >
              Guardar en mi historial
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
