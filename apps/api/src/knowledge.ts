import { readFile } from 'node:fs/promises';
import type { TreatmentSnapshot, AssistanceResult } from '@mmh/contracts';
import { AssistanceResultSchema } from '@mmh/contracts';
import { bytesHash, fail } from './core.js';
import type { Database } from './database/database.js';

export const CORPUS_VERSION='2026-10-25.1';
export const catalog=[
  {substanceId:'paracetamol',aliases:['paracetamol','acetaminofén'],routeCode:'oral',formulationCode:'tablet',forms:['comprimidos','comprimido','tableta','tabletas'],products:[{id:'68330',name:'Paracetamol Normon',strength:'500 mg',country:'España'}]},
  {substanceId:'ibuprofen',aliases:['ibuprofeno'],routeCode:'oral',formulationCode:'tablet',forms:['comprimidos','comprimido','comprimidos recubiertos con película','tableta','tabletas'],products:[{id:'65250',name:'Ibuprofeno Normon',strength:'400 mg',country:'España'}]},
];
const normalize=(s:string)=>s.normalize('NFD').replace(/\p{Diacritic}/gu,'').trim().toLowerCase();
export function validateSelection(snapshot: TreatmentSnapshot) {
  for(const m of snapshot.medications) {
    const s=m.referenceSelection; if(!s) continue;
    const item=catalog.find(x=>x.substanceId===s.substanceId && x.routeCode===s.routeCode && x.formulationCode===s.formulationCode);
    const names=item ? [...item.aliases,...(s.productId ? item.products.filter(p=>p.id===s.productId).map(p=>p.name):[])] : [];
    if(!item || !names.some(n=>normalize(n)===normalize(m.name.value??'')) || !['oral','vía oral','via oral'].includes(normalize(m.route.value??'')) || !item.forms.some(f=>normalize(f)===normalize(m.form.value??'')) || (s.productId && !item.products.some(p=>p.id===s.productId && normalize(p.strength)===normalize(m.strength.value??'')))) fail(400,'INVALID_REFERENCE_SELECTION','La selección no coincide exactamente con nombre, vía, forma y producto declarado.');
  }
}
export interface Chunk { id:string; source_id:string; text:string; scope:string; metadata:any }
export function verifyClaims(value: unknown,chunks: Chunk[]): AssistanceResult {
  const result=AssistanceResultSchema.parse(value);
  for(const claim of [...result.explanation,...result.concernsToDiscuss]) {
    if(!claim.chunkIds.every(id=>chunks.some(c=>c.id===id && c.text.includes(claim.quote)))) fail(422,'AI_OUTPUT_REJECTED','La salida contiene evidencia no verificada.');
  }
  return result;
}
export class Knowledge {
  constructor(readonly db: Database) {}
  async seed() {
    const manifest=JSON.parse(await readFile(new URL('../../../data/corpus/manifest.json',import.meta.url),'utf8'));
    await this.db.tx(async(c)=> { for(const source of manifest.sources) {
      const {chunks,...metadata}=source;
      metadata.attribution=manifest.attribution; metadata.hash=bytesHash(chunks.map((x:any)=>x.text).join('\n')); metadata.corpusVersion=manifest.version;metadata.sections=chunks.map((x:any)=>({chunkId:x.id,section:x.section}));
      await c.query('INSERT INTO knowledge_sources(id,metadata,active,reviewed_at) VALUES($1,$2,true,$3) ON CONFLICT(id) DO UPDATE SET metadata=EXCLUDED.metadata,reviewed_at=EXCLUDED.reviewed_at',[source.id,metadata,source.reviewedAt]);
      for(const chunk of chunks) await c.query('INSERT INTO knowledge_chunks(id,source_id,text,scope,hash) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET text=EXCLUDED.text,scope=EXCLUDED.scope,hash=EXCLUDED.hash,embedding=NULL',[chunk.id,source.id,chunk.text,chunk.scope,bytesHash(chunk.text)]);
    } });
  }
  async retrieve(snapshot: TreatmentSnapshot): Promise<Chunk[]> {
    validateSelection(snapshot);
    const rows=(await this.db.pool.query("SELECT c.*,s.metadata FROM knowledge_chunks c JOIN knowledge_sources s ON s.id=c.source_id WHERE s.active AND s.reviewed_at >= now()-interval '180 days' AND (s.metadata->>'reuseAllowed')::boolean ORDER BY c.id")).rows;
    return rows.filter(c=>snapshot.medications.some(m=> { const s=m.referenceSelection; return s && c.metadata.substanceId===s.substanceId && c.metadata.routeCode===s.routeCode && c.metadata.formulationCode===s.formulationCode && (s.productId ? c.metadata.productId===s.productId && c.metadata.strength===m.strength.value : c.scope==='substance_route_formulation'); })).slice(0,6);
  }
  async source(id:string) {
    const s=(await this.db.pool.query('SELECT metadata,active,reviewed_at AS "reviewedAt" FROM knowledge_sources WHERE id=$1',[id])).rows[0];
    if(!s) fail(404,'NOT_FOUND','Fuente no disponible.');
    const chunks=(await this.db.pool.query('SELECT id,text,scope,hash FROM knowledge_chunks WHERE source_id=$1 ORDER BY id',[id])).rows;
    return {id,...s,chunks:chunks.map(c=>({...c,section:s.metadata.sections?.find((x:any)=>x.chunkId===c.id)?.section??null})),retrieval:'textual',embeddingAvailable:false};
  }
}
