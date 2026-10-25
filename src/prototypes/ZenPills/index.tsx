import React, { useState } from 'react';
import { GlobalHealthProfile } from '../../data/mockData';
import { AnatomicalBodyMap } from '../../components/AnatomicalBodyMap';
import { 
  Heart, Sun, Moon, Sparkles, Check, 
  Smile, Droplet, Coffee, Feather
} from 'lucide-react';

interface Props {
  profile: GlobalHealthProfile;
  onUpdateProfile: (p: GlobalHealthProfile) => void;
}

export const ZenPillsPrototype: React.FC<Props> = ({ profile, onUpdateProfile }) => {
  const [selectedRegion, setSelectedRegion] = useState<'cabeza_dental' | 'estomago' | 'respiratorio' | null>(null);

  const handleToggleTaken = (id: string) => {
    const updated = profile.dailySchedule.map(s => 
      s.id === id ? { ...s, taken: !s.taken } : s
    );
    onUpdateProfile({ ...profile, dailySchedule: updated });
  };

  return (
    <div className="font-editorial max-w-3xl mx-auto min-h-screen bg-[#FAF7F2] text-warm-900 p-4 sm:p-8 antialiased selection:bg-warm-200">
      {/* Serene Header */}
      <header className="border-b border-warm-200/80 pb-6 mb-8 text-center max-w-lg mx-auto">
        <span className="text-xs italic text-terracotta-500 font-medium block">
          Paz y claridad para tu cuidado diario
        </span>
        <h1 className="text-3xl text-warm-900 font-normal mt-1">
          Tus Medicamentos en Calma
        </h1>
        <p className="text-xs text-warm-600 font-sans mt-2 leading-relaxed">
          Un espacio sin ruidos ni tecnicismos confusos. Tu cuerpo sabe sanar cuando sigues el ritmo adecuado.
        </p>
      </header>

      {/* Anatomical Contour Box in Zen Style */}
      <div className="bg-white rounded-3xl p-6 border border-warm-200/70 shadow-xs mb-8 flex flex-col md:flex-row items-center gap-6">
        <div className="w-full md:w-1/2 flex justify-center">
          <AnatomicalBodyMap
            treatments={profile.activeTreatments}
            selectedRegion={selectedRegion}
            onSelectRegion={setSelectedRegion}
            theme="warm"
          />
        </div>

        <div className="w-full md:w-1/2 space-y-3 font-sans text-xs">
          <span className="font-editorial text-lg text-warm-900 block font-normal">
            Tus 3 zonas en recuperación:
          </span>

          <div className="space-y-2">
            {profile.activeTreatments.map(t => (
              <div 
                key={t.id}
                onClick={() => setSelectedRegion(selectedRegion === t.bodyRegion ? null : t.bodyRegion)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                  selectedRegion === t.bodyRegion 
                    ? 'bg-warm-100 border-warm-400 font-semibold' 
                    : 'bg-warm-50/60 border-warm-200/80 hover:bg-warm-100/60'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-warm-900">{t.title}</span>
                  <span className="text-[10px] text-warm-600 bg-white px-2 py-0.5 rounded-full border border-warm-200">
                    {t.bodyRegionLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-warm-500 italic mt-3 font-editorial">
            *Toca cualquier zona para ver únicamente los medicamentos asociados a ella.
          </p>
        </div>
      </div>

      {/* Gentle Daily Routine Cards */}
      <div className="space-y-4">
        <h2 className="text-xl text-warm-900 font-normal px-1">
          La rutina de hoy
        </h2>

        <div className="space-y-3 font-sans">
          {profile.dailySchedule.map(item => (
            <div
              key={item.id}
              onClick={() => handleToggleTaken(item.id)}
              className={`p-4 rounded-3xl border transition-all cursor-pointer flex items-center justify-between ${
                item.taken
                  ? 'bg-warm-100/40 border-warm-200/50 opacity-50'
                  : 'bg-white border-warm-200 hover:border-warm-300 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-4">
                <button
                  className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all ${
                    item.taken ? 'bg-sage-500 border-sage-500 text-white' : 'border-warm-300 bg-warm-50'
                  }`}
                >
                  {item.taken && <Check className="w-4 h-4" />}
                </button>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-warm-500 font-medium">{item.time}</span>
                    <span className={`text-sm font-semibold ${item.taken ? 'line-through text-warm-400' : 'text-warm-900'}`}>
                      {item.medicationName}
                    </span>
                  </div>
                  <p className="text-xs text-warm-600 mt-0.5">{item.dosage} · {item.treatmentName}</p>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.requirements.map((r, i) => (
                      <span key={i} className="text-[11px] bg-warm-50 text-warm-700 border border-warm-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span>{r.icon}</span>
                        <span>{r.label}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <span className="text-xs text-warm-400 font-editorial italic">
                {item.taken ? 'Completado con éxito' : 'Pendiente'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
