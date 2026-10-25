import React, { useState } from 'react';
import { TreatmentData } from '../../data/mockData';
import { PrescriptionCanvas } from '../../components/PrescriptionCanvas';
import { 
  BookOpen, Sparkles, HeartHandshake, Compass, 
  HelpCircle, Check, ArrowRight, ShieldCheck, Feather, Coffee
} from 'lucide-react';

interface Props {
  treatment: TreatmentData;
  onUpdateTreatment: (t: TreatmentData) => void;
}

export const BitacoraHumanaPrototype: React.FC<Props> = ({ treatment, onUpdateTreatment }) => {
  const [activeStep, setActiveStep] = useState<'diario' | 'revision' | 'cuaderno'>('diario');
  const [sliderValue, setSliderValue] = useState<number>(75);
  const [selectedFeeling, setSelectedFeeling] = useState<string>('En franca mejoría');
  const [questionsList, setQuestionsList] = useState(treatment.questions);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [showRecipeModal, setShowRecipeModal] = useState(false);

  const feelings = [
    'En franca mejoría',
    'Con ligera pesadez',
    'Boca seca / cansancio',
    'Con dudas sobre el horario',
    'Incomodidad estomacal'
  ];

  const handleAddQuestion = () => {
    if (!newQuestionText.trim()) return;
    const newQ = {
      id: `q-${Date.now()}`,
      question: newQuestionText.trim(),
      category: 'Rutina' as const,
      isSuggested: false,
      isPriority: true
    };
    const updated = [newQ, ...questionsList];
    setQuestionsList(updated);
    onUpdateTreatment({
      ...treatment,
      questions: updated
    });
    setNewQuestionText('');
  };

  const handleMoveQuestionUp = (idx: number) => {
    if (idx === 0) return;
    const copy = [...questionsList];
    const temp = copy[idx];
    copy[idx] = copy[idx - 1];
    copy[idx - 1] = temp;
    setQuestionsList(copy);
    onUpdateTreatment({ ...treatment, questions: copy });
  };

  return (
    <div className="font-sans max-w-2xl mx-auto min-h-screen bg-[#FAF8F5] text-warm-900 p-4 sm:p-6 pb-24 selection:bg-terracotta-500/20 selection:text-warm-900">
      {/* Top Warm Navigation */}
      <header className="border-b border-warm-200/70 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-warm-100 border border-warm-200 flex items-center justify-center text-warm-800">
              <Feather className="w-4 h-4 text-terracotta-500" />
            </div>
            <div>
              <span className="font-editorial italic text-xs text-warm-600 block">
                Tu diario de recuperación
              </span>
              <h1 className="font-editorial text-xl sm:text-2xl font-normal text-warm-900 tracking-tight">
                Bitácora de Cuidado
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setShowRecipeModal(true)}
              className="bg-white border border-warm-200 text-warm-800 px-3 py-1.5 rounded-full hover:bg-warm-100/60 shadow-2xs font-medium"
            >
              Consultar Receta
            </button>
          </div>
        </div>

        {/* Calm Step Pill Selector */}
        <div className="mt-4 flex gap-2 text-xs">
          <button
            onClick={() => setActiveStep('diario')}
            className={`px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
              activeStep === 'diario'
                ? 'bg-warm-800 text-warm-50 font-medium shadow-sm'
                : 'bg-warm-100/80 text-warm-700 hover:bg-warm-200/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>1. Mi bienestar hoy</span>
          </button>
          <button
            onClick={() => setActiveStep('revision')}
            className={`px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
              activeStep === 'revision'
                ? 'bg-warm-800 text-warm-50 font-medium shadow-sm'
                : 'bg-warm-100/80 text-warm-700 hover:bg-warm-200/60'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>2. Entender mi receta</span>
          </button>
          <button
            onClick={() => setActiveStep('cuaderno')}
            className={`px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
              activeStep === 'cuaderno'
                ? 'bg-warm-800 text-warm-50 font-medium shadow-sm'
                : 'bg-warm-100/80 text-warm-700 hover:bg-warm-200/60'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>3. Cuaderno para la consulta</span>
          </button>
        </div>
      </header>

      {/* STEP 1: DIARIO DE BIENESTAR SENSORIAL */}
      {activeStep === 'diario' && (
        <div className="space-y-6">
          {/* Gentle greetings card */}
          <div className="bg-white rounded-3xl p-6 border border-warm-200/80 shadow-xs relative overflow-hidden">
            <div className="max-w-md">
              <span className="text-xs font-editorial italic text-terracotta-500 font-medium">
                Día {treatment.daysElapsed} de tu tratamiento
              </span>
              <h2 className="font-editorial text-2xl text-warm-900 mt-1">
                ¿Cómo siente tu cuerpo la medicación hoy?
              </h2>
              <p className="text-xs text-warm-600 mt-2 leading-relaxed font-sans">
                No hay respuestas correctas ni fórmulas rígidas. Registrar cómo respondes a los antibióticos te ayudará a ti y a tu doctor a tomar mejores decisiones.
              </p>
            </div>

            {/* Tactile Mood Slider */}
            <div className="mt-6 pt-4 border-t border-warm-100">
              <div className="flex justify-between text-xs font-editorial italic text-warm-600 mb-2">
                <span>Necesito reposo y calma</span>
                <span className="font-medium text-warm-800">
                  {sliderValue > 70 ? 'Me siento con energía y alivio' : sliderValue > 40 ? 'Sensación equilibrada' : 'Con molestia'}
                </span>
                <span>En plena recuperación</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={sliderValue}
                onChange={(e) => setSliderValue(Number(e.target.value))}
                className="w-full accent-terracotta-500 h-2 bg-warm-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* Feeling tags */}
            <div className="mt-5">
              <span className="text-xs font-medium text-warm-700 block mb-2 font-sans">
                Elige la frase o molestia que mejor te describe en este instante:
              </span>
              <div className="flex flex-wrap gap-2">
                {feelings.map(f => (
                  <button
                    key={f}
                    onClick={() => setSelectedFeeling(f)}
                    className={`text-xs px-3.5 py-1.5 rounded-full border transition-all ${
                      selectedFeeling === f
                        ? 'bg-terracotta-500 text-white border-terracotta-500 shadow-xs font-medium'
                        : 'bg-warm-50 text-warm-800 border-warm-200 hover:bg-warm-100/70'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => alert(`Guardado en tu bitácora: "${selectedFeeling}"`)}
                className="bg-warm-900 text-warm-50 text-xs font-medium px-4 py-2.5 rounded-full hover:bg-warm-800 transition-all shadow-xs"
              >
                Anotar este momento en mi historia
              </button>
            </div>
          </div>

          {/* Past Notes in Editorial Style */}
          <div className="space-y-3">
            <h3 className="font-editorial italic text-sm text-warm-700 px-1">
              Páginas de días anteriores
            </h3>
            {treatment.logs.map(log => (
              <div key={log.id} className="bg-white/80 rounded-2xl p-4 border border-warm-200/60 shadow-2xs">
                <div className="flex justify-between items-baseline">
                  <span className="font-editorial text-sm font-semibold text-warm-900">
                    {log.relativeDay}
                  </span>
                  <span className="text-[11px] text-warm-500 font-sans">{log.date} · {log.time}</span>
                </div>
                <p className="text-xs text-warm-700 mt-2 leading-relaxed italic font-editorial">
                  "{log.notes}"
                </p>
                <div className="mt-2 flex gap-1.5">
                  {log.reportedSymptoms.map((s, i) => (
                    <span key={i} className="text-[10px] bg-warm-100 text-warm-700 px-2 py-0.5 rounded-md font-sans">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: REVISIÓN CONVERSACIONAL */}
      {activeStep === 'revision' && (
        <div className="space-y-5">
          <div className="bg-sage-50 border border-sage-100 rounded-3xl p-5 text-sage-700">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sage-500" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Explicaciones transparentes y sin tecnicismos
              </span>
            </div>
            <p className="text-xs text-warm-700 mt-1 leading-relaxed">
              Cada indicación proviene directamente de la receta expedida por el {treatment.doctor}. Abajo desglosamos por qué te lo recetaron y qué debes vigilar.
            </p>
          </div>

          {treatment.medications.map((med) => (
            <div key={med.id} className="bg-white rounded-3xl p-5 border border-warm-200/80 shadow-xs space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-editorial text-lg text-warm-900 font-semibold">
                    {med.name}
                  </h3>
                  <p className="text-xs text-warm-500 font-sans">{med.presentation}</p>
                </div>
                <span className="text-xs bg-warm-100 text-warm-800 px-2.5 py-1 rounded-full font-medium">
                  {med.dosage}
                </span>
              </div>

              <div className="bg-warm-50/70 p-3 rounded-2xl text-xs space-y-1.5 border border-warm-100">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-warm-800">Frecuencia recomendada:</span>
                  <span className="text-warm-700">{med.frequency}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-warm-800">Duración indicada:</span>
                  <span className="text-warm-700">{med.duration}</span>
                </div>
              </div>

              <div className="text-xs text-warm-700 space-y-1">
                <p className="font-editorial italic text-warm-800 text-sm">
                  ¿Para qué sirve?
                </p>
                <p className="leading-relaxed text-warm-600">{med.education.purpose}</p>
              </div>

              <div className="pt-2 border-t border-warm-100 text-[11px] text-warm-500 flex justify-between items-center">
                <span>Fuente: {med.education.sources[0]?.name}</span>
                <span className="text-terracotta-500 font-medium">Línea {med.sourceLine} de la receta</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STEP 3: CUADERNO PARA TU CONSULTA */}
      {activeStep === 'cuaderno' && (
        <div className="space-y-5">
          <div className="bg-white rounded-3xl p-6 border border-warm-200/80 shadow-xs">
            <span className="text-xs font-editorial italic text-warm-500 block">
              Aprovecha tus minutos de cita médica
            </span>
            <h2 className="font-editorial text-2xl text-warm-900 mt-1">
              Las dudas que llevarás a tu doctor
            </h2>
            <p className="text-xs text-warm-600 mt-1">
              Arrastra o prioriza las preguntas más urgentes para que no olvides nada durante la consulta con el {treatment.doctor}.
            </p>

            {/* Add question box */}
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                placeholder="Escribe una inquietud que quieras consultarle..."
                className="flex-1 text-xs px-3.5 py-2.5 rounded-full border border-warm-200 bg-warm-50/50 focus:outline-terracotta-500"
              />
              <button
                onClick={handleAddQuestion}
                className="bg-warm-900 text-warm-50 text-xs font-medium px-4 py-2 rounded-full hover:bg-warm-800"
              >
                Agregar
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {questionsList.map((q, idx) => (
              <div 
                key={q.id} 
                className="bg-white rounded-2xl p-4 border border-warm-200/70 shadow-2xs flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-warm-100 text-warm-700 font-editorial text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-xs font-medium text-warm-900 leading-snug">
                      {q.question}
                    </p>
                    <span className="inline-block text-[10px] text-warm-400 mt-1">
                      {q.isSuggested ? 'Sugerida automáticamente por dudas de dosis' : 'Agregada por ti'}
                    </span>
                  </div>
                </div>

                {idx > 0 && (
                  <button
                    onClick={() => handleMoveQuestionUp(idx)}
                    className="text-[10px] text-warm-500 hover:text-warm-800 bg-warm-50 px-2 py-1 rounded border border-warm-200 shrink-0"
                    title="Subir prioridad"
                  >
                    ▲ Subir
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RECETA POPUP */}
      {showRecipeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-editorial text-lg text-warm-900 font-semibold">
                Receta Digitalizada
              </h3>
              <button 
                onClick={() => setShowRecipeModal(false)}
                className="text-xs bg-warm-100 text-warm-800 px-3 py-1 rounded-full font-medium"
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
