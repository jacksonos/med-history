import { describe, expect, it } from 'vitest';
import {
  AnalysisRequestSchema, ConfirmableTreatmentSnapshotSchema, ConfirmRevisionInputSchema,
  ContextInputSchema, CreateQuestionInputSchema, DocumentExtractionSchema, EvolutionInputSchema,
  FieldValueSchema, MedicationInstructionSchema, SaveDraftInputSchema, TreatmentSnapshotSchema,
  UpdateQuestionInputSchema, emptySnapshot, patientField,
} from '../src/index.js';

describe('shared contracts', () => {
  it('preserves incomplete fields and permits empty drafts but not empty confirmation', () => {
    expect(FieldValueSchema.parse(patientField(null)).value).toBeNull();
    expect(TreatmentSnapshotSchema.parse(emptySnapshot())).toEqual(emptySnapshot());
    expect(ConfirmableTreatmentSnapshotSchema.safeParse(emptySnapshot()).success).toBe(false);
    expect(ConfirmableTreatmentSnapshotSchema.safeParse({ medications: [], generalInstructions: [patientField('  ')] }).success).toBe(false);
    expect(ConfirmableTreatmentSnapshotSchema.safeParse({ medications: [], generalInstructions: [patientField('Con alimentos')] }).success).toBe(true);
    const field = patientField(null);
    expect(MedicationInstructionSchema.safeParse({
      id: 'med-1', name: field, strength: field, form: field, dose: field, route: field,
      schedule: field, duration: field, instructions: field, referenceSelection: null,
    }).success).toBe(true);
  });

  it('rejects unknown properties at both top level and nested levels', () => {
    expect(FieldValueSchema.safeParse({ ...patientField(null), unexpected: true }).success).toBe(false);
    expect(SaveDraftInputSchema.safeParse({ expectedDraftVersion: 0, baseRevision: 0, snapshot: { ...emptySnapshot(), unexpected: true } }).success).toBe(false);
    expect(ConfirmRevisionInputSchema.safeParse({ expectedRevision: 0, expectedDraftVersion: 0, changeReason: 'Inicial', snapshot: emptySnapshot() }).success).toBe(false);
  });

  it('rejects duplicate medication IDs so intake records are unambiguous', () => {
    const field = patientField(null);
    const medication = {
      id: 'med-1', name: patientField('Medicamento ficticio'), strength: field, form: field,
      dose: field, route: field, schedule: field, duration: field, instructions: field,
      referenceSelection: null,
    };
    expect(TreatmentSnapshotSchema.safeParse({ medications: [medication, medication], generalInstructions: [] }).success).toBe(false);
    expect(TreatmentSnapshotSchema.safeParse({ medications: [medication, { ...medication, id: 'med-2' }], generalInstructions: [] }).success).toBe(true);
  });

  it('accepts zero CAS versions and rejects negative or fractional versions', () => {
    const draft = { expectedDraftVersion: 0, baseRevision: 0, snapshot: emptySnapshot() };
    expect(SaveDraftInputSchema.safeParse(draft).success).toBe(true);
    for (const expectedDraftVersion of [-1, 1.5]) {
      expect(SaveDraftInputSchema.safeParse({ ...draft, expectedDraftVersion }).success).toBe(false);
    }
  });

  it('validates discriminated payloads, intensity and real offset timestamps', () => {
    const entry = { kind: 'symptom', occurredAtISO: '2026-10-25T10:30:00-05:00', originalText: null, payload: { label: 'Molestia', intensity: null } };
    expect(EvolutionInputSchema.safeParse(entry).success).toBe(true);
    for (const intensity of [-1, 11, 2.5]) {
      expect(EvolutionInputSchema.safeParse({ ...entry, payload: { label: 'Molestia', intensity } }).success).toBe(false);
    }
    for (const occurredAtISO of ['2026-02-30T10:30:00Z', '2026-10-25', '2026-10-25T10:30:00']) {
      expect(EvolutionInputSchema.safeParse({ ...entry, occurredAtISO }).success).toBe(false);
    }
    expect(EvolutionInputSchema.safeParse({ ...entry, kind: 'intake' }).success).toBe(false);
  });

  it('distinguishes unknown context from explicitly reported absence', () => {
    const unknown = { status: 'unknown', items: [] };
    const input = { expectedVersion: 0, allergies: unknown, conditions: unknown, otherMedications: unknown };
    expect(ContextInputSchema.parse(input).allergies.status).toBe('unknown');
    expect(ContextInputSchema.parse({ ...input, allergies: { status: 'reported_none', items: [] } }).allergies.status).toBe('reported_none');
    expect(ContextInputSchema.safeParse({ ...input, allergies: { status: 'unknown', items: ['Penicilina'] } }).success).toBe(false);
    expect(ContextInputSchema.safeParse({ ...input, allergies: { status: 'reported', items: [] } }).success).toBe(false);
    expect(ContextInputSchema.safeParse({ ...input, allergies: { status: 'reported', items: ['Penicilina'] } }).success).toBe(true);
  });

  it('enforces UUID resources, extraction limits and nonempty question patches', () => {
    expect(CreateQuestionInputSchema.safeParse({ text: '¿Qué consultar?', origin: 'patient', analysisId: 'not-a-uuid' }).success).toBe(false);
    expect(UpdateQuestionInputSchema.safeParse({}).success).toBe(false);
    expect(UpdateQuestionInputSchema.safeParse({ reportedAnswer: null }).success).toBe(true);
    const extraction = { schemaVersion: '1', documentId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', generation: 1, method: 'native', pages: 1, text: '', blocks: [], warnings: [] };
    expect(DocumentExtractionSchema.safeParse(extraction).success).toBe(true);
    expect(DocumentExtractionSchema.safeParse({ ...extraction, text: 'x'.repeat(24001) }).success).toBe(false);
    expect(DocumentExtractionSchema.safeParse({ ...extraction, pages: 6 }).success).toBe(false);
    expect(AnalysisRequestSchema.safeParse({ kind: 'explanation', patientQuestion: null, externalProcessingAccepted: false }).success).toBe(true);
  });
});
