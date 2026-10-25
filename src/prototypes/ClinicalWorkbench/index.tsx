import React, { useState } from 'react';
import { TreatmentData, MedicationItem } from '../../data/mockData';
import { PrescriptionCanvas } from '../../components/PrescriptionCanvas';
import { 
  Activity, CheckCircle, AlertCircle, HelpCircle, Printer, 
  Search, ShieldAlert, FileSpreadsheet, Eye, ArrowRight, CornerDownRight
} from 'lucide-react';

interface Props {
  treatment: TreatmentData;
  onUpdateTreatment: (t: TreatmentData) => void;
}

export const ClinicalWorkbenchPrototype: React.FC<Props> = ({ treatment, onUpdateTreatment }) => {
  const [activeTab, setActiveTab] = useState<'auditoria' | 'clinica' | 'informe'>('auditoria');
  const [selectedMedId, setSelectedMedId] = useState<string>(treatment.medications[0].id);
  const [manualEditField, setManualEditField] = useState<string | null>(null);

  const selectedMed = treatment.medications.find(m => m.id === selectedMedId) || treatment.medications[0];

  const handleUpdateDuration = (medId: string, newDuration: string) => {
    const updated = treatment.medications.map(m => {
      if (m.id === medId) {
        return {
          ...m,
          duration: newDuration,
          uncertainFields: m.uncertainFields.filter(f => f !== 'duration')
        };
      }
      return m;
    });

    onUpdateTreatment({
      ...treatment,
      medications: updated
    });
    setManualEditField(null);
  };

  return (
    <div className="font-swiss max-w-6xl mx-auto min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 antialiased">
      {/* Top Clinical Workbench Header */}
      <header className="border-b border-zinc-800 pb-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>CLINICAL WORKBENCH // SWISS MEDICAL GRID</span>
            <span className="text-zinc-600">|</span>
            <span>ID: {treatment.id}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
            {treatment.title}
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Prescriptor: {treatment.doctor} ({treatment.doctorCmp}) · {treatment.clinic}
          </p>
        </div>

        {/* View Switcher Bar */}
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-1 rounded-lg text-xs font-mono">
          <button
            onClick={() => setActiveTab('auditoria')}
            className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 ${
              activeTab === 'auditoria' ? 'bg-zinc-800 text-white font-bold shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-blue-400" />
            <span>1. Auditoría OCR / Receta</span>
          </button>
          <button
            onClick={() => setActiveTab('clinica')}
            className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 ${
              activeTab === 'clinica' ? 'bg-zinc-800 text-white font-bold shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>2. Monitor Clínico</span>
          </button>
          <button
            onClick={() => setActiveTab('informe')}
            className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 ${
              activeTab === 'informe' ? 'bg-zinc-800 text-white font-bold shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>3. Informe Médico A4</span>
          </button>
        </div>
      </header>

      {/* TAB 1: DUAL-PANE AUDITORÍA OCR & EVIDENCIA */}
      {activeTab === 'auditoria' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (5 cols): Prescription Document Canvas */}
          <div className="lg:col-span-5 bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
                Documento Fuente
              </span>
              <span className="text-[11px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-300 font-mono">
                Click en ítem para resaltar
              </span>
            </div>

            <div className="overflow-hidden rounded-lg border border-zinc-700/60">
              <PrescriptionCanvas
                medications={treatment.medications}
                selectedMedId={selectedMedId}
                onSelectMed={(id) => setSelectedMedId(id)}
              />
            </div>

            <div className="text-[11px] font-mono text-zinc-400 bg-zinc-950 p-2.5 rounded border border-zinc-800 space-y-1">
              <div className="text-zinc-300 font-semibold">Regla de Trazabilidad Clínica:</div>
              <p>
                Ningún dato extraído por OCR/IA pasa a estado confirmado sin validación explícita o cotejo con el documento fuente.
              </p>
            </div>
          </div>

          {/* Right Column (7 cols): Structured Data Table & Extraction Verification */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold tracking-wide uppercase text-zinc-200 font-mono">
                  Extracción Estructurada vs Evidencia
                </h3>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded">
                  3 Fármacos Identificados
                </span>
              </div>

              <div className="space-y-3">
                {treatment.medications.map((med, index) => {
                  const isSelected = selectedMedId === med.id;
                  const hasUncertainty = med.uncertainFields.length > 0;

                  return (
                    <div
                      key={med.id}
                      onClick={() => setSelectedMedId(med.id)}
                      className={`p-3.5 rounded-lg border transition-all cursor-pointer font-mono text-xs ${
                        isSelected 
                          ? 'bg-zinc-800/90 border-blue-500/80 shadow-md ring-1 ring-blue-500/40' 
                          : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              #{index + 1}
                            </span>
                            <span className="font-bold text-white text-sm font-sans">
                              {med.name}
                            </span>
                          </div>
                          <p className="text-zinc-400 text-xs font-sans mt-0.5">
                            {med.presentation} · <span className="text-zinc-300">{med.dosage}</span>
                          </p>
                        </div>

                        <div className="text-right">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            hasUncertainty 
                              ? 'bg-amber-950 text-amber-300 border border-amber-800' 
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}>
                            {hasUncertainty ? 'Requiere Revisión' : `Confianza OCR ${med.ocrConfidence}%`}
                          </span>
                        </div>
                      </div>

                      {/* Detail row */}
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-2 border-t border-zinc-800/80 font-sans">
                        <div>
                          <span className="text-zinc-500 font-mono text-[10px] block">FRECUENCIA:</span>
                          <span className="text-zinc-200">{med.frequency}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 font-mono text-[10px] block">DURACIÓN DECLARADA:</span>
                          {med.uncertainFields.includes('duration') ? (
                            <div className="mt-0.5">
                              <span className="text-amber-400 font-semibold bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/60 text-[10px]">
                                ⚪ No figura en receta
                              </span>
                              {manualEditField === med.id ? (
                                <div className="mt-2 flex gap-1.5">
                                  <input 
                                    type="text" 
                                    defaultValue="7 días (indicación verbal)" 
                                    id={`input-dur-${med.id}`}
                                    className="bg-zinc-900 border border-zinc-700 text-white px-2 py-0.5 rounded text-xs"
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const val = (document.getElementById(`input-dur-${med.id}`) as HTMLInputElement)?.value;
                                      handleUpdateDuration(med.id, val || '7 días');
                                    }}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded text-xs font-bold"
                                  >
                                    Guardar
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setManualEditField(med.id);
                                  }}
                                  className="ml-2 text-blue-400 hover:text-blue-300 underline text-[10px]"
                                >
                                  [Completar dato verbal]
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-zinc-200">{med.duration}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Item Clinical Evidence Box */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 font-sans">
              <h4 className="text-xs font-mono uppercase text-zinc-400 tracking-wider mb-2">
                Referencia Farmacológica Oficial // {selectedMed.name}
              </h4>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {selectedMed.education.purpose}
              </p>
              <div className="mt-3 pt-3 border-t border-zinc-800 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-mono text-zinc-500">MECANISMO:</span>
                  <p className="text-zinc-400 text-[11px] mt-0.5">{selectedMed.education.howItWorks}</p>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-zinc-500">REGISTRO DE FUENTES:</span>
                  <p className="text-zinc-400 text-[11px] mt-0.5">{selectedMed.education.sources[0]?.name}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MONITOR CLÍNICO DE EVOLUCIÓN */}
      {activeTab === 'clinica' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-5">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white uppercase font-mono">
                Log Cronológico de Experiencia del Paciente
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Datos declarados voluntariamente. No constituyen diagnósticos autónomos.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950">
                  <th className="py-2.5 px-3">FECHA / HORA</th>
                  <th className="py-2.5 px-3">PERÍODO</th>
                  <th className="py-2.5 px-3">TOLERANCIA</th>
                  <th className="py-2.5 px-3">SÍNTOMAS DECLARADOS</th>
                  <th className="py-2.5 px-3">OBSERVACIÓN CLÍNICA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {treatment.logs.map(log => (
                  <tr key={log.id} className="hover:bg-zinc-800/40">
                    <td className="py-3 px-3 text-zinc-300">{log.date} · {log.time}</td>
                    <td className="py-3 px-3 font-semibold text-white">{log.relativeDay}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.tolerability === 'Buena' ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
                      }`}>
                        {log.tolerability}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {log.reportedSymptoms.map((s, idx) => (
                          <span key={idx} className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded text-[10px]">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-zinc-400 font-sans text-xs">{log.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: INFORME MÉDICO A4 PRE-CONSULTA */}
      {activeTab === 'informe' && (
        <div className="bg-white text-zinc-900 rounded-xl p-8 max-w-3xl mx-auto shadow-2xl font-sans border border-zinc-300">
          <div className="border-b-2 border-zinc-900 pb-4 mb-6 flex justify-between items-start">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 font-mono">
                My Med History // Resumen Estructurado para Consulta
              </span>
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 mt-1">
                Ficha Informativa de Seguimiento Farmacológico
              </h2>
              <p className="text-xs text-zinc-600 mt-0.5">
                Generado para revisión bilateral Paciente-Médico · No sustituye el acto médico.
              </p>
            </div>
            <button 
              onClick={() => window.print()}
              className="bg-zinc-900 text-white px-3 py-1.5 rounded text-xs font-mono flex items-center gap-1.5 hover:bg-zinc-800"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir A4
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs bg-zinc-50 p-4 rounded-lg border border-zinc-200 mb-6 font-mono">
            <div>
              <span className="text-zinc-500 block">PACIENTE:</span>
              <span className="font-bold text-zinc-900 text-sm">Michel S.</span>
            </div>
            <div>
              <span className="text-zinc-500 block">MÉDICO TRATANTE:</span>
              <span className="font-bold text-zinc-900 text-sm">{treatment.doctor} ({treatment.doctorCmp})</span>
            </div>
            <div>
              <span className="text-zinc-500 block">FECHA DE EMISIÓN:</span>
              <span className="text-zinc-800">{treatment.dateIssued}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">CURSO DEL TRATAMIENTO:</span>
              <span className="text-emerald-700 font-bold">Día {treatment.daysElapsed} de {treatment.daysTotal}</span>
            </div>
          </div>

          {/* Section A: Meds & Adherence */}
          <div className="mb-6">
            <h4 className="text-xs font-bold font-mono uppercase text-zinc-700 border-b border-zinc-200 pb-1 mb-2">
              1. Pauta Farmacológica Registrada y Declarada
            </h4>
            <div className="space-y-2 text-xs">
              {treatment.medications.map(m => (
                <div key={m.id} className="flex justify-between items-center py-1.5 border-b border-zinc-100">
                  <div>
                    <span className="font-bold text-zinc-900">{m.name}</span>
                    <span className="text-zinc-500 ml-2">({m.presentation})</span>
                    <p className="text-zinc-600 text-[11px]">{m.dosage} — {m.frequency}</p>
                  </div>
                  <span className="font-mono text-zinc-700 text-xs">{m.duration}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section B: Patient questions */}
          <div>
            <h4 className="text-xs font-bold font-mono uppercase text-zinc-700 border-b border-zinc-200 pb-1 mb-2">
              2. Agenda de Preguntas Preparadas por el Paciente
            </h4>
            <ul className="text-xs space-y-2 text-zinc-800">
              {treatment.questions.map((q, idx) => (
                <li key={q.id} className="flex items-start gap-2">
                  <span className="font-mono font-bold text-blue-600">{idx + 1}.</span>
                  <span>{q.question}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
