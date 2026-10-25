import React from 'react';
import { MedicationItem } from '../data/mockData';

interface PrescriptionCanvasProps {
  medications: MedicationItem[];
  selectedMedId?: string | null;
  onSelectMed?: (id: string) => void;
  interactive?: boolean;
}

export const PrescriptionCanvas: React.FC<PrescriptionCanvasProps> = ({
  medications,
  selectedMedId,
  onSelectMed,
  interactive = true,
}) => {
  return (
    <div className="relative bg-[#FFFDF9] border border-amber-200/70 shadow-sm rounded-xl p-5 text-zinc-800 font-sans select-none overflow-hidden text-xs sm:text-sm">
      {/* Subtle watermark / Rx background */}
      <div className="absolute right-3 top-12 text-7xl font-serif text-amber-900/[0.04] select-none pointer-events-none">
        Rx
      </div>

      {/* Header with clinic and doctor credentials */}
      <div className="border-b border-zinc-200 pb-3 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-bold text-sm tracking-wide text-zinc-900 uppercase">
              Clínica Dental San Borja
            </h4>
            <p className="text-[11px] text-zinc-500">
              Av. Guardia Civil 385, San Borja · Lima, Perú
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded">
              Receta Médica Oficial
            </span>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap justify-between text-[11px] text-zinc-600 gap-y-1">
          <div>
            <span className="font-semibold text-zinc-700">Médico:</span> Dr. Carlos Mendoza Rivas
            <span className="ml-2 font-mono text-zinc-500">(CMP 51842 / COP 29104)</span>
          </div>
          <div>
            <span className="font-semibold text-zinc-700">Fecha:</span> 23/10/2026
          </div>
        </div>
      </div>

      {/* Patient info row */}
      <div className="bg-amber-50/60 rounded px-2.5 py-1.5 mb-4 text-[11px] flex justify-between border border-amber-100/80">
        <div>
          <span className="font-semibold text-zinc-700">Paciente:</span> Michel S. (32 años)
        </div>
        <div>
          <span className="font-semibold text-zinc-700">Diagnóstico:</span> Post-exodoncia molar 3.8
        </div>
      </div>

      {/* Recipe Body: Indications */}
      <div className="relative min-h-[220px] space-y-4 py-1">
        <div className="text-xs font-semibold text-zinc-400 tracking-wider uppercase mb-1">
          Indicaciones (Rp):
        </div>

        {medications.map((med, idx) => {
          const isSelected = selectedMedId === med.id;
          const isUncertain = med.uncertainFields.length > 0;

          return (
            <div
              key={med.id}
              onClick={() => interactive && onSelectMed && onSelectMed(med.id)}
              className={`relative p-2.5 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-400/20 shadow-sm'
                  : 'bg-white/70 border-zinc-200/80 hover:bg-zinc-50 hover:border-zinc-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-zinc-400">
                    {idx + 1}.
                  </span>
                  <div>
                    <span className="font-semibold text-zinc-900 text-xs sm:text-sm">
                      {med.name} {med.presentation}
                    </span>
                    <p className="text-zinc-600 text-xs mt-0.5">
                      Tomar {med.dosage} — {med.frequency} por {med.duration}.
                    </p>
                    <p className="text-zinc-500 text-[11px] italic mt-0.5">
                      "{med.instructions}"
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {isUncertain && (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-medium px-1.5 py-0.5 rounded border border-amber-200">
                      Revisar
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-zinc-400">
                    Línea {med.sourceLine}
                  </span>
                </div>
              </div>

              {/* Bounding box marker indicator */}
              {isSelected && (
                <div className="mt-2 pt-2 border-t border-blue-200 flex items-center justify-between text-[11px] text-blue-700">
                  <span>✓ Cotejando extracción con documento</span>
                  <span className="font-mono font-medium">Confianza OCR: {med.ocrConfidence}%</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Stamp & Signature simulation footer */}
      <div className="mt-6 pt-3 border-t border-zinc-200 flex justify-between items-end">
        <div className="text-[10px] text-zinc-400">
          Documento original digitalizado · Cotejado por paciente
        </div>
        <div className="text-center w-36">
          <div className="h-8 border-b border-dashed border-zinc-400 flex items-center justify-center">
            <span className="text-xs font-serif italic text-blue-900 rotate-[-4deg]">
              C. Mendoza R.
            </span>
          </div>
          <div className="text-[9px] text-zinc-500 uppercase mt-0.5">
            Firma y Sello Médico
          </div>
        </div>
      </div>
    </div>
  );
};
