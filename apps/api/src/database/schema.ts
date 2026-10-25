import { pgTable, uuid, text, integer, jsonb, timestamp, boolean, vector, uniqueIndex } from 'drizzle-orm/pg-core';
export const treatments = pgTable('treatments', {
  id: uuid().primaryKey(), title: text().notNull(), reason: text().notNull(), status: text().notNull(),
  currentRevision: integer('current_revision').notNull(), createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(), deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
export const context = pgTable('patient_context', { id: integer().primaryKey(), version: integer().notNull(), allergies: jsonb().notNull(), conditions: jsonb().notNull(), otherMedications: jsonb('other_medications').notNull() });
export const drafts = pgTable('treatment_drafts', { treatmentId: uuid('treatment_id').primaryKey().references(() => treatments.id, { onDelete: 'cascade' }), version: integer().notNull(), baseRevision: integer('base_revision').notNull(), snapshot: jsonb().notNull() });
export const revisions = pgTable('treatment_revisions', { id: uuid().primaryKey(), treatmentId: uuid('treatment_id').notNull().references(() => treatments.id, { onDelete: 'cascade' }), revision: integer().notNull(), snapshot: jsonb().notNull(), changeReason: text('change_reason').notNull(), confirmedAt: timestamp('confirmed_at', { withTimezone: true }).notNull() }, (t) => [uniqueIndex('revision_unique').on(t.treatmentId, t.revision)]);
export const knowledgeSources = pgTable('knowledge_sources', { id: text().primaryKey(), metadata: jsonb().notNull(), active: boolean().notNull(), reviewedAt: timestamp('reviewed_at', { withTimezone: true }).notNull() });
export const knowledgeChunks = pgTable('knowledge_chunks', { id: text().primaryKey(), sourceId: text('source_id').notNull().references(() => knowledgeSources.id), text: text().notNull(), scope: text().notNull(), hash: text().notNull(), embedding: vector({ dimensions: 1536 }) });
