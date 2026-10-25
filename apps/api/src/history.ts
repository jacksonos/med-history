import { randomUUID } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { ConfirmableTreatmentSnapshotSchema, ConfirmRevisionInputSchema, ContextInputSchema, CreateQuestionInputSchema, CreateTreatmentInputSchema, EvolutionInputSchema, SaveDraftInputSchema, UpdateQuestionInputSchema, emptySnapshot } from '@mmh/contracts';
import type { TreatmentSnapshot, TreatmentView } from '@mmh/contracts';
import { Database, type Connection } from './database/database.js';
import { treatments } from './database/schema.js';
import { conflict, fail, notFound, pageSchema, period, uuid } from './core.js';
import { validateSelection } from './knowledge.js';

export class History {
  constructor(readonly db: Database) {}
  async active(id: string, c: Connection = this.db.pool, lock = false) {
    uuid(id);
    const row = (await c.query(`SELECT * FROM treatments WHERE id=$1 AND deleted_at IS NULL ${lock ? 'FOR UPDATE' : ''}`, [id])).rows[0];
    if (!row) notFound(); return row;
  }
  async view(id: string): Promise<TreatmentView> {
    uuid(id);
    const t = (await this.db.orm.select().from(treatments).where(and(eq(treatments.id, id), isNull(treatments.deletedAt))))[0];
    if (!t) notFound();
    const [d, r] = await Promise.all([
      this.db.pool.query('SELECT version,base_revision AS "baseRevision",snapshot FROM treatment_drafts WHERE treatment_id=$1',[id]),
      this.db.pool.query('SELECT snapshot FROM treatment_revisions WHERE treatment_id=$1 AND revision=$2',[id,t.currentRevision]),
    ]);
    return { id, title:t.title, reason:t.reason, status:t.status as TreatmentView['status'], currentRevision:t.currentRevision, snapshot:r.rows[0]?.snapshot ?? null, draft:d.rows[0] ?? null, createdAt:t.createdAt.toISOString(), updatedAt:t.updatedAt.toISOString() };
  }
  async list(query: Record<string, unknown>) {
    const {limit,offset} = pageSchema.parse(query);
    const status = z.enum(['draft','following','archived']).optional().parse(query.status);
    const args = [status ?? null,limit,offset];
    const result = await this.db.pool.query('SELECT id,count(*) OVER() AS total FROM treatments WHERE deleted_at IS NULL AND ($1::text IS NULL OR status=$1) ORDER BY created_at DESC,id LIMIT $2 OFFSET $3',args);
    const total = Number((await this.db.pool.query('SELECT count(*) FROM treatments WHERE deleted_at IS NULL AND ($1::text IS NULL OR status=$1)',[status ?? null])).rows[0].count);
    return {items:await Promise.all(result.rows.map((r) => this.view(r.id))),total};
  }
  async create(body: unknown) {
    const input = CreateTreatmentInputSchema.parse(body), id = randomUUID();
    await this.db.tx(async (c) => {
      await c.query('INSERT INTO treatments(id,title,reason,status) VALUES($1,$2,$3,\'draft\')',[id,input.title,input.reason]);
      await c.query('INSERT INTO treatment_drafts VALUES($1,0,0,$2)',[id,emptySnapshot()]);
    }); return this.view(id);
  }
  async saveDraft(id: string, body: unknown) {
    const input = SaveDraftInputSchema.parse(body);
    validateSelection(input.snapshot);
    await this.db.tx(async (c) => {
      const t = await this.active(id,c,true);
      const d = (await c.query('SELECT * FROM treatment_drafts WHERE treatment_id=$1',[id])).rows[0];
      if (input.baseRevision !== t.current_revision || (d?.version ?? 0) !== input.expectedDraftVersion || (d && d.base_revision !== t.current_revision)) conflict();
      await this.validateEvidence(input.snapshot,id,c);
      await c.query('INSERT INTO treatment_drafts VALUES($1,$2,$3,$4) ON CONFLICT(treatment_id) DO UPDATE SET version=EXCLUDED.version,base_revision=EXCLUDED.base_revision,snapshot=EXCLUDED.snapshot',[id,input.expectedDraftVersion+1,input.baseRevision,input.snapshot]);
      await c.query('UPDATE treatments SET updated_at=now() WHERE id=$1',[id]);
    }); return this.view(id);
  }
  async validateEvidence(snapshot: TreatmentSnapshot, id: string, c: Connection) {
    const fields = [...snapshot.generalInstructions,...snapshot.medications.flatMap((m) => [m.name,m.strength,m.form,m.dose,m.route,m.schedule,m.duration,m.instructions])];
    for (const field of fields) {
      if (field.provenance === 'document' && field.value !== null && !field.evidence) fail(400,'INVALID_EVIDENCE','Un campo documental requiere evidencia.');
      if (!field.evidence) continue;
      const {documentId,page,quote} = field.evidence;
      const result = await c.query('SELECT e.extraction FROM documents d JOIN document_extractions e ON e.document_id=d.id AND e.generation=d.generation WHERE d.id=$1 AND d.treatment_id=$2 AND d.deleted_at IS NULL',[documentId,id]);
      if (!result.rows[0]?.extraction.blocks.some((b: {page:number;text:string}) => b.page === page && b.text.includes(quote))) fail(400,'INVALID_EVIDENCE','La cita no existe en la página del documento activo.');
    }
  }
  async confirm(id: string, body: unknown) {
    const input = ConfirmRevisionInputSchema.parse(body);
    await this.db.tx(async (c) => {
      const t = await this.active(id,c,true);
      const d = (await c.query('SELECT * FROM treatment_drafts WHERE treatment_id=$1',[id])).rows[0];
      if (!d || t.current_revision !== input.expectedRevision || d.version !== input.expectedDraftVersion || d.base_revision !== t.current_revision) conflict();
      const snapshot = ConfirmableTreatmentSnapshotSchema.parse(d.snapshot); validateSelection(snapshot); await this.validateEvidence(snapshot,id,c);
      await c.query('INSERT INTO treatment_revisions(id,treatment_id,revision,snapshot,change_reason) VALUES($1,$2,$3,$4,$5)',[randomUUID(),id,t.current_revision+1,snapshot,input.changeReason]);
      await c.query('UPDATE treatments SET current_revision=current_revision+1,status=\'following\',updated_at=now() WHERE id=$1',[id]);
      await c.query('DELETE FROM treatment_drafts WHERE treatment_id=$1',[id]);
    }); return this.view(id);
  }
  async revisions(id: string, query: Record<string,unknown>) {
    await this.active(id); const {limit,offset}=pageSchema.parse(query);
    const items = (await this.db.pool.query('SELECT id,revision,snapshot,change_reason AS "changeReason",confirmed_at AS "confirmedAt" FROM treatment_revisions WHERE treatment_id=$1 ORDER BY revision DESC LIMIT $2 OFFSET $3',[id,limit,offset])).rows;
    return {items,total:Number((await this.db.pool.query('SELECT count(*) FROM treatment_revisions WHERE treatment_id=$1',[id])).rows[0].count)};
  }
  async status(id: string, body: unknown) {
    const input = z.object({status:z.enum(['following','archived'])}).strict().parse(body);
    await this.db.tx(async(c) => { const t=await this.active(id,c,true); if(!t.current_revision) fail(409,'REVISION_REQUIRED','Confirma primero las indicaciones.'); await c.query('UPDATE treatments SET status=$2,updated_at=now() WHERE id=$1',[id,input.status]); }); return this.view(id);
  }
  async getContext(c: Connection = this.db.pool) { return (await c.query('SELECT version,allergies,conditions,other_medications AS "otherMedications" FROM patient_context WHERE id=1')).rows[0]; }
  async putContext(body: unknown) {
    const i=ContextInputSchema.parse(body);
    const r=await this.db.pool.query('UPDATE patient_context SET version=version+1,allergies=$2,conditions=$3,other_medications=$4 WHERE id=1 AND version=$1 RETURNING version,allergies,conditions,other_medications AS "otherMedications"',[i.expectedVersion,i.allergies,i.conditions,i.otherMedications]);
    if(!r.rowCount) conflict(); return r.rows[0];
  }
  evolutionView(row: any) { return {id:row.id,treatmentId:row.treatment_id,kind:row.kind,occurredAtISO:row.occurred_at.toISOString(),payload:row.payload,originalText:row.original_text,version:row.version,updatedAt:row.updated_at.toISOString()}; }
  async checkIntake(input: z.infer<typeof EvolutionInputSchema>, treatmentId: string, c: Connection) {
    if(input.kind !== 'intake') return;
    const r=(await c.query('SELECT snapshot FROM treatment_revisions WHERE treatment_id=$1 AND revision=$2',[treatmentId,input.payload.revision])).rows[0];
    if(!r?.snapshot.medications.some((m:{id:string}) => m.id===input.payload.medicationId)) fail(400,'INVALID_MEDICATION_REFERENCE','La toma debe enlazar un medicamento de una revisión existente.');
  }
  async addEvolution(id: string, body: unknown) {
    const i=EvolutionInputSchema.parse(body);
    return this.db.tx(async(c) => { await this.active(id,c,true); await this.checkIntake(i,id,c); return this.evolutionView((await c.query('INSERT INTO evolution_entries(id,treatment_id,kind,occurred_at,payload,original_text) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[randomUUID(),id,i.kind,i.occurredAtISO,i.payload,i.originalText])).rows[0]); });
  }
  async listEvolution(id: string, query: Record<string,unknown>) {
    await this.active(id); const {limit,offset}=pageSchema.parse(query); const p=query.from || query.to ? period(query.from,query.to) : null;
    const args=[id,p?.from ?? null,p?.to ?? null];
    const where='treatment_id=$1 AND ($2::timestamptz IS NULL OR occurred_at >= $2) AND ($3::timestamptz IS NULL OR occurred_at < $3)';
    const rows=await this.db.pool.query(`SELECT * FROM evolution_entries WHERE ${where} ORDER BY occurred_at,id LIMIT $4 OFFSET $5`,[...args,limit,offset]);
    return {items:rows.rows.map(r=>this.evolutionView(r)),total:Number((await this.db.pool.query(`SELECT count(*) FROM evolution_entries WHERE ${where}`,args)).rows[0].count)};
  }
  async editEvolution(id: string, body: unknown) {
    uuid(id); const raw=z.object({expectedVersion:z.number().int().positive()}).passthrough().parse(body);
    const {expectedVersion,...entry}=raw; const i=EvolutionInputSchema.parse(entry);
    return this.db.tx(async(c) => {
      const e=(await c.query('SELECT * FROM evolution_entries WHERE id=$1',[id])).rows[0]; if(!e) notFound(); await this.active(e.treatment_id,c,true); await this.checkIntake(i,e.treatment_id,c);
      const r=await c.query('UPDATE evolution_entries SET kind=$3,occurred_at=$4,payload=$5,original_text=$6,version=version+1,updated_at=now() WHERE id=$1 AND version=$2 RETURNING *',[id,expectedVersion,i.kind,i.occurredAtISO,i.payload,i.originalText]); if(!r.rowCount) conflict(); return this.evolutionView(r.rows[0]);
    });
  }
  async deleteEntry(table: 'evolution_entries'|'questions', id: string) {
    uuid(id); await this.db.tx(async(c) => { const e=(await c.query(`SELECT treatment_id FROM ${table} WHERE id=$1`,[id])).rows[0]; if(!e) notFound(); await this.active(e.treatment_id,c,true); await c.query(`DELETE FROM ${table} WHERE id=$1`,[id]); });
  }
  questionView(r: any) { return {id:r.id,treatmentId:r.treatment_id,text:r.text,origin:r.origin,analysisId:r.analysis_id,status:r.status,reportedAnswer:r.reported_answer,createdAt:r.created_at.toISOString()}; }
  async questions(id: string, query: Record<string,unknown>) {
    await this.active(id); const {limit,offset}=pageSchema.parse(query);
    const r=await this.db.pool.query('SELECT * FROM questions WHERE treatment_id=$1 ORDER BY created_at,id LIMIT $2 OFFSET $3',[id,limit,offset]);
    return {items:r.rows.map(r=>this.questionView(r)),total:Number((await this.db.pool.query('SELECT count(*) FROM questions WHERE treatment_id=$1',[id])).rows[0].count)};
  }
  async addQuestion(id: string, body: unknown) {
    const i=CreateQuestionInputSchema.parse(body);
    return this.db.tx(async(c)=> { await this.active(id,c,true);
      if(i.analysisId && !(await c.query("SELECT 1 FROM analysis_runs WHERE id=$1 AND treatment_id=$2 AND status='ready'",[i.analysisId,id])).rowCount) fail(400,'INVALID_ANALYSIS','El análisis no está disponible para este tratamiento.');
      return this.questionView((await c.query('INSERT INTO questions(id,treatment_id,text,origin,analysis_id) VALUES($1,$2,$3,$4,$5) RETURNING *',[randomUUID(),id,i.text,i.origin,i.analysisId])).rows[0]);
    });
  }
  async editQuestion(id: string, body: unknown) {
    uuid(id); const i=UpdateQuestionInputSchema.parse(body);
    return this.db.tx(async(c)=> { const q=(await c.query('SELECT * FROM questions WHERE id=$1 FOR UPDATE',[id])).rows[0]; if(!q) notFound(); await this.active(q.treatment_id,c,true);
      return this.questionView((await c.query('UPDATE questions SET text=$2,status=$3,reported_answer=$4 WHERE id=$1 RETURNING *',[id,i.text ?? q.text,i.status ?? q.status,i.reportedAnswer === undefined ? q.reported_answer : i.reportedAnswer])).rows[0]);
    });
  }
  async summary(id: string, query: Record<string,unknown>) {
    const p=period(query.from,query.to);
    return this.db.tx(async(c)=> {
      await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ'); const t=await this.active(id,c);
      const current=(await c.query('SELECT revision,snapshot,confirmed_at AS "confirmedAt" FROM treatment_revisions WHERE treatment_id=$1 AND revision=$2',[id,t.current_revision])).rows[0] ?? null;
      const entries=(await c.query('SELECT * FROM evolution_entries WHERE treatment_id=$1 AND occurred_at >= $2 AND occurred_at < $3 ORDER BY occurred_at,id LIMIT 101',[id,p.from,p.to])).rows;
      const changes=(await c.query('SELECT id,revision,snapshot,change_reason AS "changeReason",confirmed_at AS "confirmedAt" FROM treatment_revisions WHERE treatment_id=$1 AND confirmed_at >= $2 AND confirmed_at < $3 ORDER BY revision LIMIT 101',[id,p.from,p.to])).rows;
      const questions=(await c.query('SELECT * FROM questions WHERE treatment_id=$1 AND created_at >= $2 AND created_at < $3 ORDER BY created_at,id LIMIT 101',[id,p.from,p.to])).rows;
      if(entries.length+changes.length+questions.length>100) fail(422,'SUMMARY_TOO_LARGE','Hay más de 100 registros. Acota el período; no se ha truncado el resumen.');
      return {treatmentId:id,title:t.title,timeZone:'America/Lima',locale:'es-PE',from:query.from,to:query.to,currentRevision:current,changes,evolution:entries.map(r=>this.evolutionView(r)),questions:questions.map(r=>this.questionView(r)),limitations:['La ausencia de registros es información desconocida, nunca una toma omitida.','Las vivencias son relatos del paciente; su secuencia no demuestra causalidad.'],notice:'La app no se monitoriza. Si crees estar ante una urgencia, busca atención profesional inmediata.'};
    });
  }
}
