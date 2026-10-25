import React, { useState } from 'react';
import { TreatmentData } from '../data/mockData';

interface AnatomicalBodyMapProps {
  treatments: TreatmentData[];
  selectedRegion: string | null;
  onSelectRegion: (region: 'cabeza_dental' | 'estomago' | 'respiratorio' | null) => void;
  theme?: 'dark' | 'light' | 'warm';
}

export const AnatomicalBodyMap: React.FC<AnatomicalBodyMapProps> = ({
  treatments,
  selectedRegion,
  onSelectRegion,
  theme = 'dark'
}) => {
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  // Map regions to treatments
  const getTreatmentForRegion = (region: string) => {
    return treatments.find(t => t.bodyRegion === region);
  };

  const isDark = theme === 'dark';
  const isWarm = theme === 'warm';

  const bodyFill = isDark 
    ? '#27272A' 
    : isWarm 
    ? '#E8DCCF' 
    : '#E4E4E7';

  const bodyStroke = isDark
    ? '#3F3F46'
    : isWarm
    ? '#D5C2AF'
    : '#D4D4D8';

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* SVG Interactive Human Silhouette */}
      <div className="relative w-full max-w-[280px] h-[380px] flex items-center justify-center">
        <svg
          viewBox="0 0 200 380"
          className="w-full h-full filter drop-shadow-md transition-all duration-300"
        >
          {/* Subtle Grid / Scan lines */}
          <defs>
            <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
            </linearGradient>
            <filter id="neonGlow" x="0%" y="0%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Medical silhouette paths (Head, Torso, Arms, Legs) */}
          <g fill={bodyFill} stroke={bodyStroke} strokeWidth="1.5" className="transition-colors duration-300">
            {/* Head */}
            <circle cx="100" cy="38" r="22" />

            {/* Neck */}
            <path d="M93 58 L93 68 L107 68 L107 58 Z" />

            {/* Torso & Upper Body */}
            <path d="M72 70 C72 70, 60 78, 54 110 C50 130, 44 180, 42 205 C40 215, 48 218, 52 210 C56 195, 62 150, 68 135 L68 200 C68 220, 80 235, 96 235 L104 235 C120 235, 132 220, 132 200 L132 135 C138 150, 144 195, 148 210 C152 218, 160 215, 158 205 C156 180, 150 130, 146 110 C140 78, 128 70, 128 70 Z" />

            {/* Left Leg */}
            <path d="M74 235 C74 235, 72 290, 70 330 C69 345, 66 360, 62 368 C59 373, 73 376, 78 370 C83 360, 86 345, 88 330 L93 240 Z" />

            {/* Right Leg */}
            <path d="M126 235 C126 235, 128 290, 130 330 C131 345, 134 360, 138 368 C141 373, 127 376, 122 370 C117 360, 114 345, 112 330 L107 240 Z" />
          </g>

          {/* HOTSPOT 1: Cabeza & Zona Odontológica / Molar */}
          <g 
            className="cursor-pointer group"
            onClick={() => onSelectRegion(selectedRegion === 'cabeza_dental' ? null : 'cabeza_dental')}
            onMouseEnter={() => setHoveredZone('cabeza_dental')}
            onMouseLeave={() => setHoveredZone(null)}
          >
            {/* Animated Pulse Ring */}
            <circle
              cx="100"
              cy="45"
              r={selectedRegion === 'cabeza_dental' ? "18" : "14"}
              className={`transition-all duration-300 ${
                selectedRegion === 'cabeza_dental' 
                  ? 'fill-blue-500/30 stroke-blue-400 stroke-2 animate-pulse' 
                  : 'fill-blue-500/20 stroke-blue-400/70 hover:fill-blue-500/40'
              }`}
            />
            <circle cx="100" cy="45" r="5" className="fill-blue-500" />
            <text x="122" y="47" className={`text-[10px] font-mono font-bold ${isDark ? 'fill-blue-400' : 'fill-blue-600'}`}>
              Mandíbula / Molar
            </text>
            <line x1="106" y1="45" x2="118" y2="45" stroke={isDark ? "#60A5FA" : "#2563EB"} strokeWidth="1" strokeDasharray="2,2" />
          </g>

          {/* HOTSPOT 2: Vías Respiratorias / Pecho */}
          <g 
            className="cursor-pointer group"
            onClick={() => onSelectRegion(selectedRegion === 'respiratorio' ? null : 'respiratorio')}
            onMouseEnter={() => setHoveredZone('respiratorio')}
            onMouseLeave={() => setHoveredZone(null)}
          >
            <circle
              cx="100"
              cy="95"
              r={selectedRegion === 'respiratorio' ? "18" : "14"}
              className={`transition-all duration-300 ${
                selectedRegion === 'respiratorio' 
                  ? 'fill-purple-500/30 stroke-purple-400 stroke-2 animate-pulse' 
                  : 'fill-purple-500/20 stroke-purple-400/70 hover:fill-purple-500/40'
              }`}
            />
            <circle cx="100" cy="95" r="5" className="fill-purple-500" />
            <text x="18" y="97" className={`text-[10px] font-mono font-bold text-right ${isDark ? 'fill-purple-400' : 'fill-purple-600'}`}>
              Vías Aéreas
            </text>
            <line x1="94" y1="95" x2="78" y2="95" stroke={isDark ? "#C084FC" : "#9333EA"} strokeWidth="1" strokeDasharray="2,2" />
          </g>

          {/* HOTSPOT 3: Estómago / Sistema Digestivo */}
          <g 
            className="cursor-pointer group"
            onClick={() => onSelectRegion(selectedRegion === 'estomago' ? null : 'estomago')}
            onMouseEnter={() => setHoveredZone('estomago')}
            onMouseLeave={() => setHoveredZone(null)}
          >
            <circle
              cx="100"
              cy="150"
              r={selectedRegion === 'estomago' ? "20" : "15"}
              className={`transition-all duration-300 ${
                selectedRegion === 'estomago' 
                  ? 'fill-emerald-500/30 stroke-emerald-400 stroke-2 animate-pulse' 
                  : 'fill-emerald-500/20 stroke-emerald-400/70 hover:fill-emerald-500/40'
              }`}
            />
            <circle cx="100" cy="150" r="5" className="fill-emerald-500" />
            <text x="124" y="153" className={`text-[10px] font-mono font-bold ${isDark ? 'fill-emerald-400' : 'fill-emerald-600'}`}>
              Estómago
            </text>
            <line x1="108" y1="150" x2="120" y2="150" stroke={isDark ? "#34D399" : "#059669"} strokeWidth="1" strokeDasharray="2,2" />
          </g>
        </svg>

        {/* Floating Tooltip when hovering/selecting */}
        {(hoveredZone || selectedRegion) && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-zinc-900/95 border border-zinc-700/80 text-white px-3 py-1.5 rounded-lg text-xs shadow-xl backdrop-blur-md whitespace-nowrap z-20 pointer-events-none">
            {hoveredZone === 'cabeza_dental' || selectedRegion === 'cabeza_dental' ? (
              <div>
                <span className="font-bold text-blue-400">Tratamiento Odontológico</span>
                <p className="text-[10px] text-zinc-300">Amoxicilina + Naproxeno (Día 3/7)</p>
              </div>
            ) : hoveredZone === 'estomago' || selectedRegion === 'estomago' ? (
              <div>
                <span className="font-bold text-emerald-400">Protección Gástrica</span>
                <p className="text-[10px] text-zinc-300">Omeprazol 20mg en ayunas (Día 10/28)</p>
              </div>
            ) : hoveredZone === 'respiratorio' || selectedRegion === 'respiratorio' ? (
              <div>
                <span className="font-bold text-purple-400">Rinitis Alérgica</span>
                <p className="text-[10px] text-zinc-300">Cetirizina + Fluticasona Spray (Día 24/30)</p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Helper text */}
      <p className="text-[11px] text-zinc-400 mt-2 font-mono text-center">
        {selectedRegion 
          ? `Filtrando por: ${selectedRegion.replace('_', ' ').toUpperCase()} (Toca de nuevo para ver todo)` 
          : 'Toca un punto anatómico para filtrar los tratamientos'}
      </p>
    </div>
  );
};
