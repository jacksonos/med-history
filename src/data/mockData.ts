export interface MedicationRequirement {
  type: 'ayunas' | 'con_comida' | 'abundante_agua' | 'condicional' | 'evitar_lacteos' | 'evitar_sol';
  label: string;
  detail: string;
  icon: string;
}

export interface MedicationItem {
  id: string;
  name: string;
  genericName: string;
  presentation: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  treatmentId: string;
  bodyRegion: 'cabeza_dental' | 'estomago' | 'respiratorio' | 'articulaciones';
  requirements: MedicationRequirement[];
  ocrConfidence: number;
  uncertainFields: string[];
  sourceLine: number;
  education: {
    purpose: string;
    howItWorks: string;
    precautions: string[];
    sideEffects: string[];
    sources: { name: string; url?: string }[];
  };
}

export interface ScheduleItem {
  id: string;
  time: string; // e.g. "07:30"
  period: 'Mañana' | 'Mediodía' | 'Tarde' | 'Noche';
  medicationId: string;
  medicationName: string;
  dosage: string;
  treatmentName: string;
  bodyRegion: 'cabeza_dental' | 'estomago' | 'respiratorio';
  requirements: MedicationRequirement[];
  taken: boolean;
}

export interface CheckInLog {
  id: string;
  date: string;
  time: string;
  relativeDay: string;
  moodLevel: number; // 1 to 5
  tolerability: 'Buena' | 'Regular' | 'Difícil';
  notes: string;
  reportedSymptoms: string[];
  treatmentId: string;
  bodyRegion?: 'cabeza_dental' | 'estomago' | 'respiratorio';
}

export interface DoctorQuestion {
  id: string;
  question: string;
  category: 'Efectos' | 'Dosis' | 'Rutina' | 'Interacción';
  isSuggested: boolean;
  isPriority: boolean;
  treatmentId?: string;
}

export interface TreatmentData {
  id: string;
  title: string;
  category: string;
  clinic: string;
  doctor: string;
  doctorCmp: string;
  dateIssued: string;
  status: 'En seguimiento' | 'Borrador' | 'Archivado';
  daysTotal: number;
  daysElapsed: number;
  bodyRegion: 'cabeza_dental' | 'estomago' | 'respiratorio';
  bodyRegionLabel: string;
  medications: MedicationItem[];
  logs: CheckInLog[];
  questions: DoctorQuestion[];
}

export interface GlobalHealthProfile {
  patientName: string;
  age: number;
  location: string;
  activeTreatments: TreatmentData[];
  archivedTreatments: TreatmentData[];
  dailySchedule: ScheduleItem[];
  knownInteractionsAlerts: {
    severity: 'alta' | 'moderada' | 'informativa';
    drugs: string[];
    message: string;
    actionAdvice: string;
  }[];
  healthContext: {
    allergies: string[];
    chronicConditions: string[];
    bloodType: string;
  };
}

// Full Multi-Treatment Mock Data for Peru Context
export const sampleGlobalProfile: GlobalHealthProfile = {
  patientName: 'Michel S.',
  age: 32,
  location: 'Lima, Perú',
  knownInteractionsAlerts: [
    {
      severity: 'moderada',
      drugs: ['Naproxeno Sódico', 'Omeprazol / Mucosa Gástrica'],
      message: 'El Naproxeno (antiinflamatorio) aumenta el riesgo de acidez en pacientes con gastritis previa.',
      actionAdvice: 'Nunca tomes Naproxeno en ayunas. Mantén siempre el Omeprazol matutino y tómalo con comida copiosa.'
    },
    {
      severity: 'informativa',
      drugs: ['Amoxicilina', 'Cetirizina'],
      message: 'No presentan interacción negativa cruzada conocida.',
      actionAdvice: 'Puedes tomarlos en los horarios indicados sin interferencia mutua.'
    }
  ],
  healthContext: {
    allergies: ['Penicilinas: Declarada NO alérgica (tolerado)', 'Sulfas: Sospecha leve en la infancia'],
    chronicConditions: ['Gastritis erosiva superficial (en control)', 'Rinitis estacional'],
    bloodType: 'O Rh+'
  },
  dailySchedule: [
    {
      id: 'sch-1',
      time: '07:30',
      period: 'Mañana',
      medicationId: 'med-omeprazol',
      medicationName: 'Omeprazol 20 mg',
      dosage: '1 cápsula',
      treatmentName: 'Protección Gástrica',
      bodyRegion: 'estomago',
      requirements: [
        { type: 'ayunas', label: 'En ayunas', detail: '30 min antes de desayunar', icon: '⚡' },
        { type: 'abundante_agua', label: 'Medio vaso de agua', detail: 'Tragar entera, no masticar', icon: '💧' }
      ],
      taken: true
    },
    {
      id: 'sch-2',
      time: '08:15',
      period: 'Mañana',
      medicationId: 'med-amoxi',
      medicationName: 'Amoxicilina + Clavulánico 500/125 mg',
      dosage: '1 tableta',
      treatmentName: 'Post-Extracción Molar',
      bodyRegion: 'cabeza_dental',
      requirements: [
        { type: 'con_comida', label: 'Con comida', detail: 'Al inicio o fin del desayuno', icon: '🍽️' },
        { type: 'abundante_agua', label: 'Vaso lleno de agua', detail: 'Para proteger el esófago', icon: '💧' }
      ],
      taken: true
    },
    {
      id: 'sch-3',
      time: '08:30',
      period: 'Mañana',
      medicationId: 'med-fluti',
      medicationName: 'Fluticasona 50 mcg Spray',
      dosage: '1 puff en cada fosa nasal',
      treatmentName: 'Control de Rinitis',
      bodyRegion: 'respiratorio',
      requirements: [
        { type: 'con_comida', label: 'Higiene previa', detail: 'Sonar la nariz suavemente antes', icon: '👃' }
      ],
      taken: true
    },
    {
      id: 'sch-4',
      time: '13:30',
      period: 'Mediodía',
      medicationId: 'med-napro',
      medicationName: 'Naproxeno Sódico 550 mg',
      dosage: '1 tableta',
      treatmentName: 'Post-Extracción Molar',
      bodyRegion: 'cabeza_dental',
      requirements: [
        { type: 'condicional', label: 'Condicional al dolor', detail: 'Solo si el dolor pulsátil supera 4/10', icon: '⚡' },
        { type: 'con_comida', label: 'Almuerzo completo', detail: 'Nunca con estómago vacío', icon: '🍽️' }
      ],
      taken: false
    },
    {
      id: 'sch-5',
      time: '16:15',
      period: 'Tarde',
      medicationId: 'med-amoxi',
      medicationName: 'Amoxicilina + Clavulánico 500/125 mg',
      dosage: '1 tableta (Dosis 2)',
      treatmentName: 'Post-Extracción Molar',
      bodyRegion: 'cabeza_dental',
      requirements: [
        { type: 'con_comida', label: 'Colación ligera', detail: 'Tomar con fruta o yogur', icon: '🍎' }
      ],
      taken: false
    },
    {
      id: 'sch-6',
      time: '22:00',
      period: 'Noche',
      medicationId: 'med-cetirizina',
      medicationName: 'Cetirizina 10 mg',
      dosage: '1 tableta',
      treatmentName: 'Control de Rinitis',
      bodyRegion: 'respiratorio',
      requirements: [
        { type: 'ayunas', label: 'Antes de dormir', detail: 'Puede causar ligera somnolencia', icon: '🌙' }
      ],
      taken: false
    },
    {
      id: 'sch-7',
      time: '00:15',
      period: 'Noche',
      medicationId: 'med-amoxi',
      medicationName: 'Amoxicilina + Clavulánico 500/125 mg',
      dosage: '1 tableta (Dosis 3)',
      treatmentName: 'Post-Extracción Molar',
      bodyRegion: 'cabeza_dental',
      requirements: [
        { type: 'abundante_agua', label: 'Vaso de agua', detail: 'Mantener intervalo exacto de 8 horas', icon: '💧' }
      ],
      taken: false
    }
  ],
  activeTreatments: [
    {
      id: 'tr-01-dental',
      title: 'Tratamiento Odontológico Post-Extracción',
      category: 'Cirugía Bucal',
      clinic: 'Clínica Dental San Borja — Lima',
      doctor: 'Dr. Carlos Mendoza Rivas',
      doctorCmp: 'CMP 51842',
      dateIssued: '23 de Octubre de 2026',
      status: 'En seguimiento',
      daysTotal: 7,
      daysElapsed: 3,
      bodyRegion: 'cabeza_dental',
      bodyRegionLabel: 'Boca / Mandíbula & Dientes',
      medications: [
        {
          id: 'med-amoxi',
          name: 'Amoxicilina + Ácido Clavulánico',
          genericName: 'Amoxicilina / Clavulanato',
          presentation: '500 mg / 125 mg tabletas',
          dosage: '1 tableta',
          frequency: 'Cada 8 horas (con alimentos)',
          duration: '7 días completos',
          instructions: 'Tomar al inicio de las comidas principales.',
          treatmentId: 'tr-01-dental',
          bodyRegion: 'cabeza_dental',
          requirements: [
            { type: 'con_comida', label: 'Con alimentos', detail: 'Para proteger el estómago', icon: '🍽️' },
            { type: 'abundante_agua', label: 'Abundante agua', detail: 'Vaso de 250ml', icon: '💧' }
          ],
          ocrConfidence: 98,
          uncertainFields: [],
          sourceLine: 1,
          education: {
            purpose: 'Antibiótico para erradicar bacterias y prevenir alveolitis.',
            howItWorks: 'Destruye la pared bacteriana en el lecho alveolar.',
            precautions: ['Cumplir los 7 días completos', 'Evitar saltarse tomas'],
            sideEffects: ['Molestia gástrica', 'Heces blandas'],
            sources: [{ name: 'Digemid PNUME' }]
          }
        },
        {
          id: 'med-napro',
          name: 'Naproxeno Sódico',
          genericName: 'Naproxeno',
          presentation: '550 mg tabletas',
          dosage: '1 tableta',
          frequency: 'Cada 12 horas condicional',
          duration: 'Máximo 3 días si hay dolor',
          instructions: 'Solo si el dolor supera 4/10. Con el almuerzo.',
          treatmentId: 'tr-01-dental',
          bodyRegion: 'cabeza_dental',
          requirements: [
            { type: 'condicional', label: 'Condicional al dolor', detail: 'No tomar si no duele', icon: '⚡' },
            { type: 'con_comida', label: 'Con comida pesada', detail: 'Evitar gastritis', icon: '🍽️' }
          ],
          ocrConfidence: 91,
          uncertainFields: ['frequency'],
          sourceLine: 2,
          education: {
            purpose: 'Antiinflamatorio y calmante para dolor agudo post-extracción.',
            howItWorks: 'Bloquea enzimas COX inflamatorias.',
            precautions: ['No tomar con el estómago vacío', 'Suspender si hay reflujo'],
            sideEffects: ['Acidez'],
            sources: [{ name: 'Formulario Nacional del Perú' }]
          }
        }
      ],
      logs: [
        {
          id: 'log-d1',
          date: '2026-10-25',
          time: '13:00',
          relativeDay: 'Día 3',
          moodLevel: 4,
          tolerability: 'Buena',
          notes: 'Dolor dental casi inexistente hoy (1/10). No necesité Naproxeno en la mañana.',
          reportedSymptoms: ['Encía cicatrizando bien'],
          treatmentId: 'tr-01-dental',
          bodyRegion: 'cabeza_dental'
        }
      ],
      questions: [
        {
          id: 'qd-1',
          question: '¿Si ya no tengo inflamación, puedo suspender el antibiótico al 5to día?',
          category: 'Dosis',
          isSuggested: false,
          isPriority: true,
          treatmentId: 'tr-01-dental'
        }
      ]
    },
    {
      id: 'tr-02-gastro',
      title: 'Protección Gástrica & Reflujo',
      category: 'Gastroenterología',
      clinic: 'Policlínico Jesús María — EsSalud',
      doctor: 'Dra. Patricia Wong Gálvez',
      doctorCmp: 'CMP 44219',
      dateIssued: '15 de Octubre de 2026',
      status: 'En seguimiento',
      daysTotal: 28,
      daysElapsed: 10,
      bodyRegion: 'estomago',
      bodyRegionLabel: 'Estómago / Tracto Digestivo',
      medications: [
        {
          id: 'med-omeprazol',
          name: 'Omeprazol',
          genericName: 'Omeprazol',
          presentation: '20 mg cápsulas',
          dosage: '1 cápsula',
          frequency: 'Cada 24 horas',
          duration: '28 días',
          instructions: 'Tomar al despertar con medio vaso de agua, 30 min antes de desayunar.',
          treatmentId: 'tr-02-gastro',
          bodyRegion: 'estomago',
          requirements: [
            { type: 'ayunas', label: 'Estricto ayunas', detail: '30 min antes de alimentos', icon: '⚡' },
            { type: 'abundante_agua', label: 'Sin masticar', detail: 'Tragar cápsula entera', icon: '💧' }
          ],
          ocrConfidence: 96,
          uncertainFields: [],
          sourceLine: 1,
          education: {
            purpose: 'Reducir la secreción ácida gástrica y proteger la mucosa.',
            howItWorks: 'Inhibe irreversiblemente la bomba de protones H+/K+ ATPasa.',
            precautions: ['Tomar a la misma hora matutina', 'No suspender bruscamente'],
            sideEffects: ['Gases leves'],
            sources: [{ name: 'CENADIM Perú' }]
          }
        }
      ],
      logs: [
        {
          id: 'log-g1',
          date: '2026-10-24',
          time: '08:00',
          relativeDay: 'Día 9',
          moodLevel: 4,
          tolerability: 'Buena',
          notes: 'Sensación de acidez matutina desaparecida. Buena tolerancia.',
          reportedSymptoms: ['Digestión normal'],
          treatmentId: 'tr-02-gastro',
          bodyRegion: 'estomago'
        }
      ],
      questions: [
        {
          id: 'qg-1',
          question: '¿El antibiótico del dentista puede restar efectividad al Omeprazol?',
          category: 'Interacción',
          isSuggested: true,
          isPriority: true,
          treatmentId: 'tr-02-gastro'
        }
      ]
    },
    {
      id: 'tr-03-alergia',
      title: 'Manejo de Rinitis Alérgica',
      category: 'Alergología / Otorrino',
      clinic: 'Clínica Internacional — San Isidro',
      doctor: 'Dr. Andrés Morales S.',
      doctorCmp: 'CMP 60124',
      dateIssued: '01 de Octubre de 2026',
      status: 'En seguimiento',
      daysTotal: 30,
      daysElapsed: 24,
      bodyRegion: 'respiratorio',
      bodyRegionLabel: 'Vías Respiratorias & Nariz',
      medications: [
        {
          id: 'med-cetirizina',
          name: 'Cetirizina',
          genericName: 'Cetirizina Diclorhidrato',
          presentation: '10 mg tabletas',
          dosage: '1 tableta',
          frequency: 'Cada 24 horas',
          duration: '30 días',
          instructions: 'Tomar por la noche antes de dormir.',
          treatmentId: 'tr-03-alergia',
          bodyRegion: 'respiratorio',
          requirements: [
            { type: 'ayunas', label: 'Por la noche', detail: 'Previene somnolencia diurna', icon: '🌙' }
          ],
          ocrConfidence: 99,
          uncertainFields: [],
          sourceLine: 1,
          education: {
            purpose: 'Antihistamínico H1 para bloquear estornudos, prurito y congestión.',
            howItWorks: 'Antagonista selectivo periférico de receptores H1.',
            precautions: ['Evitar alcohol'],
            sideEffects: ['Ligera somnolencia'],
            sources: [{ name: 'OMS - Medicamentos Esenciales' }]
          }
        },
        {
          id: 'med-fluti',
          name: 'Fluticasona Furoato Spray Nasal',
          genericName: 'Fluticasona',
          presentation: '50 mcg/dosis spray nasal',
          dosage: '1 pulverización en cada fosa',
          frequency: 'Cada 24 horas (mañanas)',
          duration: '30 días',
          instructions: 'Limpiar fosa nasal antes de aplicar. No inhalar con fuerza.',
          treatmentId: 'tr-03-alergia',
          bodyRegion: 'respiratorio',
          requirements: [
            { type: 'con_comida', label: 'Higiene previa', detail: 'Limpiar nariz antes de aplicar', icon: '👃' }
          ],
          ocrConfidence: 95,
          uncertainFields: [],
          sourceLine: 2,
          education: {
            purpose: 'Corticoide tópico nasal de absorción sistémica mínima.',
            howItWorks: 'Reduce la inflamación de la mucosa de los cornetes.',
            precautions: ['Evitar rociar hacia el tabique nasal central'],
            sideEffects: ['Resequedad nasal leve'],
            sources: [{ name: 'Digemid' }]
          }
        }
      ],
      logs: [
        {
          id: 'log-a1',
          date: '2026-10-25',
          time: '09:00',
          relativeDay: 'Día 24',
          moodLevel: 5,
          tolerability: 'Buena',
          notes: 'Cero estornudos por la mañana. Muy buen control de síntomas con el spray.',
          reportedSymptoms: [],
          treatmentId: 'tr-03-alergia',
          bodyRegion: 'respiratorio'
        }
      ],
      questions: [
        {
          id: 'qa-1',
          question: '¿Al terminar los 30 días debo descansar una semana antes de reiniciar?',
          category: 'Rutina',
          isSuggested: false,
          isPriority: false,
          treatmentId: 'tr-03-alergia'
        }
      ]
    }
  ],
  archivedTreatments: [
    {
      id: 'tr-00-antiguo',
      title: 'Infección Respiratoria Aguda (Faringitis)',
      category: 'Medicina General',
      clinic: 'Centro de Salud Miraflores',
      doctor: 'Dra. Elena Ramos',
      doctorCmp: 'CMP 38910',
      dateIssued: '10 de Junio de 2026',
      status: 'Archivado',
      daysTotal: 5,
      daysElapsed: 5,
      bodyRegion: 'respiratorio',
      bodyRegionLabel: 'Garganta & Vías Altas',
      medications: [],
      logs: [],
      questions: []
    }
  ]
};

export const sampleTreatment: TreatmentData = sampleGlobalProfile.activeTreatments[0];

