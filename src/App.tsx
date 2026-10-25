import React, { useState } from 'react';
import { sampleTreatment, sampleGlobalProfile, TreatmentData, GlobalHealthProfile } from './data/mockData';
import { CupertinoHealthPrototype } from './prototypes/CupertinoHealth';
import { ClinicalWorkbenchPrototype } from './prototypes/ClinicalWorkbench';
import { BitacoraHumanaPrototype } from './prototypes/BitacoraHumana';
import { RadarTimelinePrototype } from './prototypes/RadarTimeline';
import { BiomapHolisticoPrototype } from './prototypes/BiomapHolistico';
import { CircadianChronoCarePrototype } from './prototypes/CircadianChronoCare';
import { NexusBento3DPrototype } from './prototypes/NexusBento3D';
import { ZenPillsPrototype } from './prototypes/ZenPills';
import { ClinicalCockpitPrototype } from './prototypes/ClinicalCockpit';
import { 
  Layers, Smartphone, LayoutGrid, Heart, GitBranch, 
  Activity, Clock, Box, Feather, Crosshair, Sparkles, Info
} from 'lucide-react';

export function App() {
  const [activeProtoId, setActiveProtoId] = useState<string>('p5'); // Default to Biomap Holistico
  const [singleTreatment, setSingleTreatment] = useState<TreatmentData>(sampleTreatment);
  const [globalProfile, setGlobalProfile] = useState<GlobalHealthProfile>(sampleGlobalProfile);
  const [showSkillGuide, setShowSkillGuide] = useState(false);

  const singlePrototypes = [
    {
      id: 'p1',
      name: 'Cupertino Health',
      tagline: 'Apple HIG / Native iOS',
      skill: 'dickwu/apple-design-skill',
      icon: Smartphone,
      badge: 'Apple HIG'
    },
    {
      id: 'p2',
      name: 'Clinical Workbench',
      tagline: 'Swiss Medical Grid',
      skill: 'nextlevelbuilder/ui-ux-pro-max-skill',
      icon: LayoutGrid,
      badge: 'Swiss Grid'
    },
    {
      id: 'p3',
      name: 'Bitácora Humana',
      tagline: 'Warm Editorial & Calma',
      skill: 'Leonxlnx/taste-skill',
      icon: Heart,
      badge: 'Craft & Taste'
    },
    {
      id: 'p4',
      name: 'Radar Timeline',
      tagline: 'shadcn/ui & Linear Stream',
      skill: 'shadcn/ui + vercel-labs',
      icon: GitBranch,
      badge: 'Linear Stream'
    }
  ];

  const multiPrototypes = [
    {
      id: 'p5',
      name: 'Biomap Holístico',
      tagline: 'Silueta Anatómica Vectorial & Filtro Corporal',
      icon: Activity,
      badge: 'Mapa Corporal'
    },
    {
      id: 'p6',
      name: 'Circadian ChronoCare',
      tagline: 'Itinerario 24h & Requisitos Metabólicos',
      icon: Clock,
      badge: 'Ritmo 24h'
    },
    {
      id: 'p7',
      name: 'Nexus Bento 3D',
      tagline: 'Spatial Health Matrix & Bento Grid',
      icon: Box,
      badge: 'Bento Grid'
    },
    {
      id: 'p8',
      name: 'Zen Pills',
      tagline: 'Minimalismo Nórdico/Japonés & Contorno Zen',
      icon: Feather,
      badge: 'Zen Minimal'
    },
    {
      id: 'p9',
      name: 'Clinical Cockpit',
      tagline: 'Tablero Cuidador & Boleto Médico Unificado',
      icon: Crosshair,
      badge: 'Cockpit A4'
    }
  ];

  const allPrototypes = [...singlePrototypes, ...multiPrototypes];
  const activeProto = allPrototypes.find(p => p.id === activeProtoId) || multiPrototypes[0];

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      {/* Top Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 px-4 py-2.5 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Logo & Category Switcher */}
          <div className="flex items-center justify-between w-full lg:w-auto">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-md">
                MH
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight text-white block">
                  My Med History
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  Suite de 9 Prototipos UI/UX
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowSkillGuide(true)}
              className="lg:hidden text-xs bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg border border-zinc-700"
            >
              Info
            </button>
          </div>

          {/* New 5 Multi-Treatment / Anatomical Prototypes */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
            <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold px-1 shrink-0">
              Multitratamiento:
            </span>
            {multiPrototypes.map((p) => {
              const Icon = p.icon;
              const isActive = activeProtoId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setActiveProtoId(p.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all shrink-0 border ${
                    isActive
                      ? 'bg-blue-600 text-white font-bold border-blue-500 shadow-md'
                      : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{p.name}</span>
                </button>
              );
            })}

            <span className="text-zinc-700 mx-1">|</span>

            <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold px-1 shrink-0">
              Tratamiento Único:
            </span>
            {singlePrototypes.map((p) => {
              const Icon = p.icon;
              const isActive = activeProtoId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setActiveProtoId(p.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all shrink-0 border ${
                    isActive
                      ? 'bg-zinc-800 text-white font-bold border-zinc-600 shadow-sm'
                      : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setShowSkillGuide(true)}
            className="hidden lg:flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg border border-zinc-700 transition-colors shrink-0"
          >
            <Info className="w-3.5 h-3.5 text-blue-400" />
            <span>Guía de Propuestas</span>
          </button>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1">
        {/* PROTOTIPOS NUEVOS (MULTITRATAMIENTO, SILUETA ANATÓMICA & ITINERARIO 24H) */}
        {activeProtoId === 'p5' && (
          <div className="py-6 px-2 sm:px-4 bg-zinc-950">
            <BiomapHolisticoPrototype profile={globalProfile} onUpdateProfile={setGlobalProfile} />
          </div>
        )}

        {activeProtoId === 'p6' && (
          <div className="py-6 px-2 sm:px-4 bg-slate-950">
            <CircadianChronoCarePrototype profile={globalProfile} onUpdateProfile={setGlobalProfile} />
          </div>
        )}

        {activeProtoId === 'p7' && (
          <div className="py-6 px-2 sm:px-4 bg-black">
            <NexusBento3DPrototype profile={globalProfile} onUpdateProfile={setGlobalProfile} />
          </div>
        )}

        {activeProtoId === 'p8' && (
          <div className="py-6 px-2 sm:px-4 bg-[#F5EFE6]">
            <ZenPillsPrototype profile={globalProfile} onUpdateProfile={setGlobalProfile} />
          </div>
        )}

        {activeProtoId === 'p9' && (
          <div className="py-6 px-2 sm:px-4 bg-slate-900">
            <ClinicalCockpitPrototype profile={globalProfile} onUpdateProfile={setGlobalProfile} />
          </div>
        )}

        {/* PROTOTIPOS ANTERIORES (TRATAMIENTO INDIVIDUAL) */}
        {activeProtoId === 'p1' && (
          <div className="py-6 px-2 sm:px-4 bg-[#E5E5EA]">
            <CupertinoHealthPrototype treatment={singleTreatment} onUpdateTreatment={setSingleTreatment} />
          </div>
        )}

        {activeProtoId === 'p2' && (
          <div className="py-6 px-2 sm:px-4 bg-zinc-950">
            <ClinicalWorkbenchPrototype treatment={singleTreatment} onUpdateTreatment={setSingleTreatment} />
          </div>
        )}

        {activeProtoId === 'p3' && (
          <div className="py-6 px-2 sm:px-4 bg-[#F2EDE4]">
            <BitacoraHumanaPrototype treatment={singleTreatment} onUpdateTreatment={setSingleTreatment} />
          </div>
        )}

        {activeProtoId === 'p4' && (
          <div className="py-6 px-2 sm:px-4 bg-black">
            <RadarTimelinePrototype treatment={singleTreatment} onUpdateTreatment={setSingleTreatment} />
          </div>
        )}
      </main>

      {/* MODAL: GUÍA DE LAS 9 PROPUESTAS */}
      {showSkillGuide && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 text-zinc-200 w-full max-w-3xl rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  Las 9 Propuestas UI/UX de My Med History
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Distribuidas en 2 grandes categorías según la escala de atención del paciente.
                </p>
              </div>
              <button
                onClick={() => setShowSkillGuide(false)}
                className="text-zinc-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Section 1: Multi-treatment proposals */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-mono font-bold uppercase text-blue-400 tracking-wider">
                5 Nuevas Propuestas: Multitratamiento, Silueta Anatómica & Itinerario 24h
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {multiPrototypes.map(p => (
                  <div key={p.id} className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-xs">
                    <span className="font-bold text-white">{p.name}</span>
                    <p className="text-zinc-400 text-[11px] mt-1">{p.tagline}</p>
                  </div>
                ))}
              </div>

              <h4 className="text-xs font-mono font-bold uppercase text-emerald-400 tracking-wider pt-3">
                4 Propuestas Iniciales: Trazabilidad de Receta Individual
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {singlePrototypes.map(p => (
                  <div key={p.id} className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-xs">
                    <span className="font-bold text-white">{p.name}</span>
                    <span className="block font-mono text-[10px] text-zinc-500 mt-0.5">{p.skill}</span>
                    <p className="text-zinc-400 text-[11px] mt-1">{p.tagline}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setShowSkillGuide(false)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
