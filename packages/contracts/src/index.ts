import { z } from 'zod';

const fieldText = z.string().max(1000);
const nonemptyText = fieldText.trim().min(1);
const version = z.number().int().nonnegative();
const positiveVersion = z.number().int().positive();
const resourceId = z.uuid();
const medicationId = z.string().min(1).max(100);
const timestamp = z.iso.datetime({ offset: true });

export const FieldValueSchema = z.object({
  value: fieldText.nullable(),
  provenance: z.enum(['document', 'patient']),
  evidence: z.object({ documentId: resourceId, page: z.number().int().min(1).max(5), quote: fieldText.min(1) }).strict().nullable(),
  issue: z.enum(['missing', 'ambiguous']).nullable(),
}).strict();
export type FieldValue = z.infer<typeof FieldValueSchema>;

export const MedicationInstructionSchema = z.object({
  id: medicationId,
  name: FieldValueSchema,
  strength: FieldValueSchema,
  form: FieldValueSchema,
  dose: FieldValueSchema,
  route: FieldValueSchema,
  schedule: FieldValueSchema,
  duration: FieldValueSchema,
  instructions: FieldValueSchema,
  referenceSelection: z.object({
    substanceId: nonemptyText,
    routeCode: nonemptyText,
    formulationCode: nonemptyText,
    productId: nonemptyText.nullable(),
  }).strict().nullable(),
}).strict();
export type MedicationInstruction = z.infer<typeof MedicationInstructionSchema>;

export const TreatmentSnapshotSchema = z.object({
  medications: z.array(MedicationInstructionSchema).max(20),
  generalInstructions: z.array(FieldValueSchema).max(20),
}).strict().superRefine((snapshot, context) => {
  const seen = new Set<string>();
  snapshot.medications.forEach((medication, index) => {
    if (seen.has(medication.id)) {
      context.addIssue({ code: 'custom', path: ['medications', index, 'id'], message: 'El identificador del medicamento debe ser único.' });
    }
    seen.add(medication.id);
  });
});
export type TreatmentSnapshot = z.infer<typeof TreatmentSnapshotSchema>;

export const ConfirmableTreatmentSnapshotSchema = TreatmentSnapshotSchema.refine(
  (snapshot) => snapshot.medications.some((medication) => Boolean(medication.name.value?.trim()))
    || snapshot.generalInstructions.some((instruction) => Boolean(instruction.value?.trim())),
  { message: 'Se necesita un medicamento con nombre o una instrucción general.' },
);

export const SaveDraftInputSchema = z.object({
  expectedDraftVersion: version,
  baseRevision: version,
  snapshot: TreatmentSnapshotSchema,
}).strict();
export type SaveDraftInput = z.infer<typeof SaveDraftInputSchema>;

export const ConfirmRevisionInputSchema = z.object({
  expectedRevision: version,
  expectedDraftVersion: version,
  changeReason: nonemptyText,
}).strict();
export type ConfirmRevisionInput = z.infer<typeof ConfirmRevisionInputSchema>;

export const CreateTreatmentInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  reason: fieldText,
}).strict();
export type CreateTreatmentInput = z.infer<typeof CreateTreatmentInputSchema>;

export const ContextListSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('unknown'), items: z.array(nonemptyText).max(0) }).strict(),
  z.object({ status: z.literal('reported_none'), items: z.array(nonemptyText).max(0) }).strict(),
  z.object({ status: z.literal('reported'), items: z.array(nonemptyText).min(1) }).strict(),
]);
export type ContextList = z.infer<typeof ContextListSchema>;
export const ContextInputSchema = z.object({
  expectedVersion: version,
  allergies: ContextListSchema,
  conditions: ContextListSchema,
  otherMedications: ContextListSchema,
}).strict();
export type ContextInput = z.infer<typeof ContextInputSchema>;

const evolutionBase = { occurredAtISO: timestamp, originalText: z.string().max(2000).nullable() };
export const EvolutionInputSchema = z.discriminatedUnion('kind', [
  z.object({ ...evolutionBase, kind: z.literal('checkin'), payload: z.object({
    feeling: z.enum(['better', 'same', 'worse']), symptoms: fieldText.optional(), difficulties: fieldText.optional(),
  }).strict() }).strict(),
  z.object({ ...evolutionBase, kind: z.literal('intake'), payload: z.object({
    medicationId, revision: positiveVersion, status: z.enum(['taken', 'skipped']),
  }).strict() }).strict(),
  z.object({ ...evolutionBase, kind: z.literal('symptom'), payload: z.object({
    label: nonemptyText, intensity: z.number().int().min(0).max(10).nullable(),
  }).strict() }).strict(),
  z.object({ ...evolutionBase, kind: z.literal('measurement'), payload: z.object({
    label: nonemptyText, value: nonemptyText, unit: nonemptyText,
  }).strict() }).strict(),
  z.object({ ...evolutionBase, kind: z.literal('note'), payload: z.object({
    text: z.string().min(1).max(2000),
  }).strict() }).strict(),
]);
export type EvolutionInput = z.infer<typeof EvolutionInputSchema>;

export const ExtractBlockSchema = z.object({
  page: z.number().int().min(1).max(5),
  text: z.string().max(24000),
  box: z.tuple([z.number(), z.number(), z.number(), z.number()]).nullable(),
  score: z.number().min(0).max(1).nullable(),
}).strict();
export type ExtractBlock = z.infer<typeof ExtractBlockSchema>;
export const DocumentExtractionSchema = z.object({
  schemaVersion: z.literal('1'), documentId: resourceId, generation: positiveVersion,
  method: z.enum(['native', 'ocr', 'mixed']), pages: z.number().int().min(1).max(5),
  text: z.string().max(24000), blocks: z.array(ExtractBlockSchema), warnings: z.array(fieldText),
}).strict();
export type DocumentExtraction = z.infer<typeof DocumentExtractionSchema>;

export const ClinicalClaimSchema = z.object({
  text: nonemptyText, chunkIds: z.array(nonemptyText).min(1), quote: nonemptyText,
}).strict();
export type ClinicalClaim = z.infer<typeof ClinicalClaimSchema>;
export const AssistanceResultSchema = z.object({
  explanation: z.array(ClinicalClaimSchema), concernsToDiscuss: z.array(ClinicalClaimSchema),
  questions: z.array(z.string().trim().min(1).max(500)), limitations: z.array(nonemptyText),
}).strict();
export type AssistanceResult = z.infer<typeof AssistanceResultSchema>;
export const ApiErrorSchema = z.object({ code: nonemptyText, message: nonemptyText, requestId: resourceId }).strict();
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const CreateQuestionInputSchema = z.object({
  text: z.string().trim().min(1).max(500), origin: z.enum(['patient', 'app']), analysisId: resourceId.nullable(),
}).strict();
export type CreateQuestionInput = z.infer<typeof CreateQuestionInputSchema>;
export const UpdateQuestionInputSchema = z.object({
  text: z.string().trim().min(1).max(500).optional(),
  status: z.enum(['pending', 'discussed']).optional(),
  reportedAnswer: z.string().max(2000).nullable().optional(),
}).strict().refine((input) => Object.values(input).some((value) => value !== undefined), { message: 'Se necesita al menos un cambio.' });
export type UpdateQuestionInput = z.infer<typeof UpdateQuestionInputSchema>;
export const StructuringRequestSchema = z.object({ externalProcessingAccepted: z.boolean() }).strict();
export type StructuringRequest = z.infer<typeof StructuringRequestSchema>;
export const AnalysisRequestSchema = z.object({
  kind: z.enum(['explanation', 'questions']), patientQuestion: z.string().max(500).nullable(),
  externalProcessingAccepted: z.boolean(),
}).strict();
export type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>;

export interface TreatmentView {
  id: string;
  title: string;
  reason: string;
  status: 'draft' | 'following' | 'archived';
  currentRevision: number;
  snapshot: TreatmentSnapshot | null;
  draft: { version: number; baseRevision: number; snapshot: TreatmentSnapshot } | null;
  createdAt: string;
  updatedAt: string;
}
export interface DocumentView {
  id: string;
  treatmentId: string;
  generation: number;
  status: 'queued' | 'processing' | 'ready' | 'needs_manual' | 'failed';
  filename: string;
  mime: string;
  bytes: number;
  extraction: DocumentExtraction | null;
  errorCode: string | null;
}
export interface AnalysisView {
  id: string;
  treatmentId: string;
  kind: 'structure' | 'explanation' | 'questions';
  status: 'queued' | 'processing' | 'ready' | 'failed';
  mode: 'demo' | 'live';
  stale: boolean;
  result: AssistanceResult | TreatmentSnapshot | null;
  errorCode: string | null;
  createdAt: string;
}
export type EvolutionEntry = EvolutionInput & { id: string; treatmentId: string; version: number; updatedAt: string };
export interface Question {
  id: string;
  treatmentId: string;
  text: string;
  origin: 'patient' | 'app';
  analysisId: string | null;
  status: 'pending' | 'discussed';
  reportedAnswer: string | null;
  createdAt: string;
}
export interface Collection<T> { items: T[]; total: number }
export interface ContextView { version: number; allergies: ContextList; conditions: ContextList; otherMedications: ContextList }

export function emptySnapshot(): TreatmentSnapshot {
  return { medications: [], generalInstructions: [] };
}
export function patientField(value: string | null): FieldValue {
  return { value, provenance: 'patient', evidence: null, issue: value === null ? 'missing' : null };
}
