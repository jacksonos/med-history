import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { patientField } from '@mmh/contracts';
import type { TreatmentSnapshot, DocumentExtraction } from '@mmh/contracts';
import { bytesHash, hash } from './core.js';
import type { Database } from './database/database.js';

export const DEMO_LABEL='Resultado precargado de demostración';
export const safeQuestions=['¿Qué cantidad por toma, frecuencia y duración indicó el profesional?', '¿Qué debería registrar si vuelve a ocurrir el mareo?', '¿Qué dudas sobre estas indicaciones debería aclarar con el profesional?'];
export async function demoFixtures():Promise<any[]> {return JSON.parse(await readFile(new URL('../../../data/demo/cases.json',import.meta.url),'utf8')).cases;}
export function demoSnapshot(fixture:any):TreatmentSnapshot {
  const m=fixture.medication;
  return {medications:[{id:m.id,name:patientField(m.name),strength:patientField(m.strength),form:patientField(m.form),dose:patientField(m.dose),route:patientField(m.route),schedule:patientField(m.schedule),duration:patientField(m.duration),instructions:patientField(m.instructions),referenceSelection:{substanceId:m.substanceId,routeCode:'oral',formulationCode:'tablet',productId:null}}],generalInstructions:[]};
}
// Canonicalization ignores only line-end/outer OCR whitespace, never medication characters or quantities.
export const documentTextHash=(text:string)=>bytesHash(text.normalize('NFC').split(/\r?\n/).map(x=>x.trim()).join('\n').trim());
export function syntheticPdf(text:string):Buffer {
  const escape=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
  const content=Buffer.from(`BT /F1 12 Tf 40 790 Td 18 TL ${text.split('\n').map((line,i)=>`${i ? 'T* ':''}(${escape(line)}) Tj`).join('\n')} ET`,'latin1');
  const objects=[Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),Buffer.from('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>'),Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),Buffer.concat([Buffer.from(`<< /Length ${content.length} >>\nstream\n`),content,Buffer.from('\nendstream')])];
  const pieces=[Buffer.from('%PDF-1.4\n')], offsets=[0]; let length=pieces[0]!.length;
  objects.forEach((o,i)=>{offsets.push(length);const b=Buffer.concat([Buffer.from(`${i+1} 0 obj\n`),o,Buffer.from('\nendobj\n')]);pieces.push(b);length+=b.length;});
  pieces.push(Buffer.from(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${length}\n%%EOF\n`)); return Buffer.concat(pieces);
}
export function demoStructure(f:any,document:DocumentExtraction):TreatmentSnapshot {
  const snapshot=demoSnapshot(f);
  for(const m of snapshot.medications) {
    m.referenceSelection=null;
    for(const field of [m.name,m.strength,m.form,m.dose,m.route,m.schedule,m.duration,m.instructions]) {
      if(field.value===null) continue;
      const block=document.blocks.find(b=>b.text.includes(field.value!));
      if(!block) throw new Error('DEMO_EVIDENCE_MISMATCH');
      field.provenance='document';field.evidence={documentId:document.documentId,page:block.page,quote:field.value};
    }
  }
  return snapshot;
}
export async function seedDemo(db:Database) {
  const fixtures=await demoFixtures();
  for(const f of fixtures) {
    await db.tx(async(c)=> {
      const created=await c.query("INSERT INTO treatments(id,title,reason,status,current_revision,created_at,updated_at) VALUES($1,$2,$3,'following',1,'2026-10-19T15:00:00Z','2026-10-19T15:00:00Z') ON CONFLICT DO NOTHING RETURNING id",[f.treatmentId,f.title,f.reason]);
      if(!created.rowCount) return;
      const snapshot=demoSnapshot(f);
      await c.query("INSERT INTO treatment_revisions(id,treatment_id,revision,snapshot,change_reason,confirmed_at) VALUES($1,$2,1,$3,'Caso sintético precargado; no es una receta','2026-10-19T15:00:00Z')",[randomUUID(),f.treatmentId,snapshot]);
      const context=(await c.query('SELECT version FROM patient_context WHERE id=1')).rows[0];
      await c.query('INSERT INTO demo_cases(id,treatment_id,version,snapshot_hash,document_text_hash,context_version) VALUES($1,$2,1,$3,$4,$5)',[f.id,f.treatmentId,hash(snapshot),documentTextHash(f.text),context.version]);
      if(f.id==='DEMO-03') {
        const entries=[{kind:'intake',at:'2026-10-20T08:00:00-05:00',payload:{medicationId:f.medication.id,revision:1,status:'taken'},original:null},{kind:'symptom',at:'2026-10-20T14:00:00-05:00',payload:{label:'Mareo leve; no sé si tiene relación',intensity:2},original:'Hoy sentí mareo leve; no sé si tiene relación'},{kind:'checkin',at:'2026-10-21T09:00:00-05:00',payload:{feeling:'same'},original:null}];
        for(const e of entries) await c.query('INSERT INTO evolution_entries(id,treatment_id,kind,occurred_at,payload,original_text) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),f.treatmentId,e.kind,e.at,e.payload,e.original]);
        await c.query("INSERT INTO questions(id,treatment_id,text,origin,created_at) VALUES($1,$2,$3,'patient','2026-10-21T14:00:00Z')",[randomUUID(),f.treatmentId,safeQuestions[1]]);
      }
    });
  }
  await db.tx(async(c)=> {
    const ctx=(await c.query('SELECT version FROM patient_context WHERE id=1')).rows[0];
    const corpus=(await c.query('SELECT s.id,s.active,s.reviewed_at,c.id AS chunk_id,c.hash FROM knowledge_sources s JOIN knowledge_chunks c ON c.source_id=s.id ORDER BY s.id,c.id')).rows;
    for(const f of fixtures) {
      const treatments=(await c.query("SELECT id,current_revision,status FROM treatments WHERE deleted_at IS NULL AND (status='following' OR id=$1) ORDER BY id",[f.treatmentId])).rows;
      const deps={revision:1,contextVersion:ctx.version,treatments,corpusVersion:'2026-10-25.1',corpus,promptVersion:'extractive-1',model:'preloaded-v1'};
      await c.query('UPDATE demo_cases SET dependencies_hash=$2 WHERE treatment_id=$1 AND dependencies_hash IS NULL',[f.treatmentId,hash(deps)]);
    }
  });
}
export async function writeDemoAssets() {
  const fixtures=await demoFixtures(); const dir=new URL('../../../data/demo/documents/',import.meta.url);const expected=new URL('../../../data/demo/expected/',import.meta.url);
  await mkdir(dir,{recursive:true});await mkdir(expected,{recursive:true});
  for(const f of fixtures) {
    await writeFile(new URL(`${f.id.toLowerCase()}.pdf`,dir),syntheticPdf(f.text));
    await writeFile(new URL(`${f.id.toLowerCase()}.json`,expected),JSON.stringify({caseId:f.id,version:1,text:f.text,confirmedSnapshot:demoSnapshot(f),structureReferenceSelection:null},null,2)+'\n');
  }
  const manifest=fixtures.map(f=>({id:f.id,version:1,treatmentId:f.treatmentId,snapshotHash:hash(demoSnapshot(f)),documentTextHash:documentTextHash(f.text),pdfSha256:bytesHash(syntheticPdf(f.text))}));
  await writeFile(new URL('../../../data/demo/hashes.json',import.meta.url),JSON.stringify(manifest,null,2)+'\n');
}
