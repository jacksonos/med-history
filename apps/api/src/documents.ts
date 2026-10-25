import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DocumentExtractionSchema } from '@mmh/contracts';
import type { DocumentExtraction } from '@mmh/contracts';
import type { Config } from './config.js';
import { Database } from './database/database.js';
import { History } from './history.js';
import { Jobs } from './jobs.js';
import { ApiFailure, bytesHash, conflict, fail, notFound, uuid } from './core.js';

export function detectMime(bytes:Buffer): string {
  if(bytes.subarray(0,5).toString('ascii')==='%PDF-') return 'application/pdf';
  if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if(bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return 'image/jpeg';
  return fail(415,'UNSUPPORTED_FILE','Solo se admiten PDF, PNG y JPEG válidos.');
}
export class DocumentClient {
  constructor(readonly config: Config) {}
  async extract(id:string,generation:number,bytes:Buffer,mime:string):Promise<DocumentExtraction> {
    const form=new FormData(); form.set('documentId',id); form.set('generation',String(generation)); form.set('file',new Blob([new Uint8Array(bytes)],{type:mime}),'document');
    let response: globalThis.Response;
    try { response=await fetch(new URL('/v1/extractions',this.config.DOCUMENT_SERVICE_URL),{method:'POST',body:form,signal:AbortSignal.timeout(150000)}); }
    catch { throw new ApiFailure(503,'DOCUMENT_SERVICE_UNAVAILABLE','El servicio documental no está disponible.'); }
    if(!response.ok) {
      const body=await response.json().catch(()=>({}));
      const code=typeof body.code==='string' && /^[A-Z_]{1,80}$/.test(body.code) ? body.code : 'DOCUMENT_PROCESSING_FAILED';
      throw new ApiFailure(response.status===429 || response.status>=500 ? 503 : 422,code,'No se pudo extraer el documento. Puedes usar entrada manual.');
    }
    const length=Number(response.headers.get('content-length')??0); if(length>1024*1024) fail(422,'EXTRACTION_TOO_LARGE','Salida documental excesiva.');
    const text=await response.text(); if(Buffer.byteLength(text)>1024*1024) fail(422,'EXTRACTION_TOO_LARGE','Salida documental excesiva.');
    const result=DocumentExtractionSchema.parse(JSON.parse(text));
    if(result.documentId!==id || result.generation!==generation) fail(422,'EXTRACTION_ID_MISMATCH','Respuesta documental incompatible.');
    return result;
  }
}
export class Documents {
  readonly client: DocumentClient;
  constructor(readonly config:Config,readonly db:Database,readonly history:History,readonly jobs:Jobs) {this.client=new DocumentClient(config);}
  path(key:string) { return join(this.config.STORAGE_DIR,uuid(key)); }
  async row(id:string) { uuid(id); const d=(await this.db.pool.query('SELECT d.* FROM documents d JOIN treatments t ON t.id=d.treatment_id WHERE d.id=$1 AND d.deleted_at IS NULL AND t.deleted_at IS NULL',[id])).rows[0]; if(!d) notFound(); return d; }
  async view(id:string) { const d=await this.row(id); const e=(await this.db.pool.query('SELECT extraction FROM document_extractions WHERE document_id=$1 AND generation=$2',[id,d.generation])).rows[0]; return {id,treatmentId:d.treatment_id,generation:d.generation,status:d.status,filename:d.filename,mime:d.mime,bytes:d.bytes,extraction:e?.extraction??null,errorCode:d.error_code}; }
  async upload(treatmentId:string,file:Express.Multer.File|undefined,ack:unknown) {
    if(ack!=='true') fail(400,'SYNTHETIC_ACKNOWLEDGEMENT_REQUIRED','Confirma que el archivo contiene únicamente datos sintéticos.');
    if(!file) fail(400,'FILE_REQUIRED','Selecciona un archivo.');
    if(file.size>10*1024*1024) fail(413,'FILE_TOO_LARGE','Máximo 10 MiB.');
    const mime=detectMime(file.buffer);
    if(mime!==file.mimetype || !({ 'application/pdf':/\.pdf$/i,'image/png':/\.png$/i,'image/jpeg':/\.jpe?g$/i }[mime]?.test(file.originalname))) fail(415,'FILE_TYPE_MISMATCH','El tipo, la extensión y la firma deben coincidir.');
    const id=randomUUID(),key=randomUUID();
    await mkdir(this.config.STORAGE_DIR,{recursive:true,mode:0o700}); await writeFile(this.path(key),file.buffer,{mode:0o600,flag:'wx'});
    try { await this.db.tx(async(c)=> {await this.history.active(treatmentId,c,true); await c.query('INSERT INTO documents(id,treatment_id,storage_key,sha256,filename,mime,bytes,status) VALUES($1,$2,$3,$4,$5,$6,$7,\'queued\')',[id,treatmentId,key,bytesHash(file.buffer),file.originalname.replace(/[\x00-\x1f\x7f]/g,'').slice(0,200),mime,file.size]); await this.jobs.enqueue(c,'document.extract',{id,generation:1});}); }
    catch(error) {await unlink(this.path(key)).catch(()=>{}); throw error;} return this.view(id);
  }
  async retry(id:string) {await this.db.tx(async(c)=> { const d=await this.row(id); await this.history.active(d.treatment_id,c,true); const locked=(await c.query('SELECT * FROM documents WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',[id])).rows[0]; if(!locked) notFound(); if(!['failed','needs_manual'].includes(locked.status)) conflict(); const generation=locked.generation+1; await c.query('UPDATE documents SET generation=$2,status=\'queued\',attempt_count=0,error_code=NULL WHERE id=$1',[id,generation]); await this.jobs.enqueue(c,'document.extract',{id,generation}); }); return this.view(id); }
  async original(id:string) { const d=await this.row(id); return {bytes:await readFile(this.path(d.storage_key)),mime:d.mime}; }
  async removeDocument(id:string) {
    await this.db.tx(async(c)=> {const d=await this.row(id); await this.history.active(d.treatment_id,c,true); await c.query('UPDATE documents SET deleted_at=now() WHERE id=$1',[id]); await c.query('DELETE FROM document_extractions WHERE document_id=$1',[id]); await c.query('DELETE FROM analysis_runs WHERE document_id=$1',[id]); await this.jobs.enqueue(c,'storage.cleanup',{id});});
  }
  async removeTreatment(id:string) {await this.db.tx(async(c)=> {await this.history.active(id,c,true); await c.query('UPDATE treatments SET deleted_at=now() WHERE id=$1',[id]); await c.query('UPDATE documents SET deleted_at=now() WHERE treatment_id=$1',[id]); await this.jobs.enqueue(c,'storage.cleanup',{id});});}
  async cleanup(_id?:string) {
    const docs=(await this.db.pool.query('SELECT id,storage_key FROM documents WHERE deleted_at IS NOT NULL AND storage_key IS NOT NULL')).rows;
    for(const d of docs) {
      try {await unlink(this.path(d.storage_key));} catch(error:any) {if(error.code!=='ENOENT') throw error;}
      await this.db.pool.query('UPDATE documents SET storage_key=NULL WHERE id=$1 AND deleted_at IS NOT NULL',[d.id]);
    }
    await this.db.pool.query('DELETE FROM treatments t WHERE deleted_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM documents d WHERE d.treatment_id=t.id AND d.storage_key IS NOT NULL)');
  }
  async process(id:string,generation:number) {
    const connection=await this.db.pool.connect(); let locked=false;
    try {
      locked=(await connection.query('SELECT pg_try_advisory_lock(hashtext($1)) AS acquired',[`document:${id}`])).rows[0].acquired; if(!locked) throw new Error('DOCUMENT_BUSY');
      const d=(await connection.query('SELECT d.* FROM documents d JOIN treatments t ON t.id=d.treatment_id WHERE d.id=$1 AND d.generation=$2 AND d.deleted_at IS NULL AND t.deleted_at IS NULL',[id,generation])).rows[0];
      if(!d || ['ready','needs_manual','failed'].includes(d.status)) return;
      if(d.attempt_count>=3) {await connection.query("UPDATE documents SET status='failed',error_code='DOCUMENT_RETRIES_EXHAUSTED' WHERE id=$1 AND generation=$2 AND deleted_at IS NULL",[id,generation]); return;}
      await connection.query("UPDATE documents SET status='processing',attempt_count=attempt_count+1 WHERE id=$1 AND generation=$2 AND deleted_at IS NULL",[id,generation]);
      try {
        const result=await this.client.extract(id,generation,await readFile(this.path(d.storage_key)),d.mime);
        await this.db.tx(async(c)=> { const live=(await c.query('SELECT d.id FROM documents d JOIN treatments t ON t.id=d.treatment_id WHERE d.id=$1 AND d.generation=$2 AND d.deleted_at IS NULL AND t.deleted_at IS NULL FOR UPDATE OF d,t',[id,generation])).rowCount;
          if(!live) return; await c.query('INSERT INTO document_extractions VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[id,generation,result]); await c.query('UPDATE documents SET status=$3,error_code=NULL WHERE id=$1 AND generation=$2',[id,generation,result.text.trim() ? 'ready':'needs_manual']); });
      } catch(error) {
        const transient=error instanceof ApiFailure && error.status===503;
        await this.db.tx(async(c)=> {
          const live=await c.query('UPDATE documents SET status=$3,error_code=$4 WHERE id=$1 AND generation=$2 AND deleted_at IS NULL RETURNING id',[id,generation,transient && d.attempt_count<2 ? 'queued':'failed',error instanceof ApiFailure ? error.code:'DOCUMENT_PROCESSING_FAILED']);
          if(live.rowCount && transient && d.attempt_count<2) await this.jobs.enqueue(c,'document.extract',{id,generation},d.attempt_count===0?5:15);
        });
      }
    } finally {if(locked) await connection.query('SELECT pg_advisory_unlock(hashtext($1))',[`document:${id}`]); connection.release();}
  }
}
