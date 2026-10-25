import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { request as httpRequest } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { configuration } from './config.js';
import { Database } from './database/database.js';
import { History } from './history.js';
import { Jobs } from './jobs.js';
import { Knowledge } from './knowledge.js';
import { Documents } from './documents.js';
import { Assistance } from './assistance.js';
import { createApplication, type Runtime } from './main.js';
import { demoFixtures, demoSnapshot, seedDemo, syntheticPdf } from './demo.js';

let available=false;
try {execFileSync('docker',['info','--format','{{.ServerVersion}}'],{stdio:'ignore',timeout:10000});available=true;}catch{}
describe.skipIf(!available)('isolated disposable PostgreSQL (never reads DATABASE_URL)',()=> {
  let container:string,db:Database,history:History,jobs:Jobs,documents:Documents,assistance:Assistance,storage:string;
  beforeAll(async()=> {
    container=execFileSync('docker',['run','--rm','-d','-P','-e','POSTGRES_PASSWORD=synthetic-test-only','-e','POSTGRES_DB=mmh_ephemeral','pgvector/pgvector:pg17'],{encoding:'utf8',timeout:120000}).trim();
    const port=execFileSync('docker',['port',container,'5432/tcp'],{encoding:'utf8'}).split('\n')[0]!.trim().split(':').pop();
    storage=await mkdtemp(join(process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA,'Temp','opencode'):tmpdir(),'mmh-test-'));
    const cfg=configuration({DATABASE_URL:`postgresql://postgres:synthetic-test-only@127.0.0.1:${port}/mmh_ephemeral`,STORAGE_DIR:storage});
    db=new Database(cfg);for(let i=0;i<60;i++) {try {await db.pool.query('SELECT 1');break;}catch{await new Promise(r=>setTimeout(r,500));}}
    await db.migrate();history=new History(db);jobs=new Jobs(cfg);await jobs.start();documents=new Documents(cfg,db,history,jobs);assistance=new Assistance(cfg,db,history,documents,new Knowledge(db),jobs);
  },180000);
  afterAll(async()=> {await jobs?.boss.stop();await db?.pool.end();if(container)execFileSync('docker',['stop',container],{stdio:'ignore',timeout:30000});if(storage)await rm(storage,{recursive:true,force:true});},40000);
  it('migration, persistent draft CAS and concurrent immutable confirmation',async()=> {
    const t=await history.create({title:'Synthetic test',reason:''}); const snap=demoSnapshot((await demoFixtures())[0]);
    const saved=await history.saveDraft(t.id,{expectedDraftVersion:0,baseRevision:0,snapshot:snap});expect(saved.currentRevision).toBe(0);expect((await history.view(t.id)).draft?.version).toBe(1);
    await expect(history.saveDraft(t.id,{expectedDraftVersion:0,baseRevision:0,snapshot:snap})).rejects.toMatchObject({status:409});
    const result=await Promise.allSettled([1,2].map(()=>history.confirm(t.id,{expectedRevision:0,expectedDraftVersion:1,changeReason:'synthetic'})));expect(result.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect((await history.revisions(t.id,{})).total).toBe(1);
    await history.status(t.id,{status:'archived'});
  });
  it('context CAS persists and conflicts',async()=> {const context=await history.getContext();await history.putContext({expectedVersion:context.version,allergies:context.allergies,conditions:context.conditions,otherMedications:context.otherMedications});await expect(history.putContext({expectedVersion:context.version,allergies:context.allergies,conditions:context.conditions,otherMedications:context.otherMedications})).rejects.toMatchObject({status:409});});
  it('idempotent synthetic seed, corrected evolution and max100 summary',async()=> {
    await new Knowledge(db).seed();await seedDemo(db);await seedDemo(db);const id='33333333-3333-4333-8333-333333333333';const q={from:'2026-10-20',to:'2026-10-21'};expect((await history.summary(id,q)).evolution).toHaveLength(3);
    const e=await history.addEvolution(id,{kind:'note',occurredAtISO:'2026-10-20T15:00:00-05:00',originalText:'synthetic original',payload:{text:'synthetic'}});
    await history.editEvolution(e.id,{expectedVersion:1,kind:'note',occurredAtISO:e.occurredAtISO,originalText:e.originalText,payload:{text:'corrected'}});expect((await history.summary(id,q)).evolution.some((x:any)=>x.payload.text==='corrected')).toBe(true);
    await history.deleteEntry('evolution_entries',e.id);expect((await history.summary(id,q)).evolution).toHaveLength(3);
    for(let i=0;i<101;i++) await history.addEvolution(id,{kind:'note',occurredAtISO:'2026-10-20T15:00:00-05:00',originalText:null,payload:{text:'synthetic'}});
    await expect(history.summary(id,q)).rejects.toMatchObject({code:'SUMMARY_TOO_LARGE'});
  });
  it('demo analyses use exact hashes, never fetch, and become stale on context changes',async()=> {
    const fetcher=vi.spyOn(globalThis,'fetch');
    for(const f of await demoFixtures()) {
      const request=await assistance.request(f.treatmentId,{kind:'explanation',patientQuestion:null,externalProcessingAccepted:false});await assistance.process(request.analysisId);
      const view=await assistance.view(request.analysisId);expect(view.status).toBe('ready');expect(view.stale).toBe(false);expect((view.result as any).explanation).toHaveLength(1);
    }
    expect(fetcher).not.toHaveBeenCalled();fetcher.mockRestore();
    const id='11111111-1111-4111-8111-111111111111';const first=await assistance.request(id,{kind:'questions',patientQuestion:null,externalProcessingAccepted:false});await assistance.process(first.analysisId);
    const ctx=await history.getContext();await history.putContext({expectedVersion:ctx.version,allergies:ctx.allergies,conditions:ctx.conditions,otherMedications:ctx.otherMedications});expect((await assistance.view(first.analysisId)).stale).toBe(true);
    const changed=await assistance.request(id,{kind:'questions',patientQuestion:null,externalProcessingAccepted:false});await assistance.process(changed.analysisId);expect((await assistance.view(changed.analysisId)).errorCode).toBe('DEMO_CASE_NOT_SUPPORTED');
  });
  it('a document deleted during OCR never republishes extraction or original',async()=> {
    const t=await history.create({title:'Synthetic document deletion',reason:''});const fixture=(await demoFixtures())[0];const pdf=syntheticPdf(fixture.text);
    const doc=await documents.upload(t.id,{buffer:pdf,size:pdf.length,mimetype:'application/pdf',originalname:'synthetic.pdf'} as Express.Multer.File,'true');
    let finish!:()=>void;let entered!:()=>void;const started=new Promise<void>(r=>entered=r);const gate=new Promise<void>(r=>finish=r);
    const mock=vi.spyOn(documents.client,'extract').mockImplementation(async(id,generation)=> {entered();await gate;return {schemaVersion:'1',documentId:id,generation,method:'native',pages:1,text:fixture.text,blocks:[{page:1,text:fixture.text,box:null,score:null}],warnings:[]};});
    const running=documents.process(doc.id,1);await started;await documents.removeDocument(doc.id);finish();await running;mock.mockRestore();
    await expect(documents.view(doc.id)).rejects.toMatchObject({status:404});expect((await db.pool.query('SELECT 1 FROM document_extractions WHERE document_id=$1',[doc.id])).rowCount).toBe(0);await documents.cleanup();
  });
  it('budget reservations remain atomic under concurrency',async()=> {const results=await Promise.allSettled(Array.from({length:25},()=>assistance.reserve(null as unknown as string,'explanation')));expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(20);expect(Number((await db.pool.query('SELECT sum(reserved_cents) AS n FROM ai_usage')).rows[0].n)).toBe(60);});
  it('deletion tombstone prevents readers and job publication',async()=> {const t=await history.create({title:'Synthetic delete',reason:''});await documents.removeTreatment(t.id);await expect(history.view(t.id)).rejects.toMatchObject({status:404});await documents.process(randomUUID(),1);await documents.cleanup();expect((await db.pool.query('SELECT 1 FROM treatments WHERE id=$1',[t.id])).rowCount).toBe(0);});
  it('Nest HTTP routes enforce JSON, local boundaries and normalized error contracts',async()=> {
    const fetch=(url:string,options:{method?:string;headers?:Record<string,string>;body?:string}={})=>new Promise<Response>((resolve,reject)=> {
      const req=httpRequest(url,{method:options.method??'GET',headers:options.headers},res=> {const parts:Buffer[]=[];res.on('data',p=>parts.push(p));res.on('end',()=>resolve(new Response(Buffer.concat(parts),{status:res.statusCode,headers:{'cache-control':String(res.headers['cache-control']??'')}})));});req.on('error',reject);req.end(options.body);
    });
    const app=await createApplication({config:documents.config,db,history,jobs,documents,knowledge:new Knowledge(db),assistance} as Runtime);
    await app.listen(0,'127.0.0.1');const address=app.getHttpServer().address();const url=`http://127.0.0.1:${address.port}/api/v1`;
    try {
      const headers={'Host':'localhost:8080','Content-Type':'application/json','Origin':'http://localhost:8080'};
      const created=await fetch(`${url}/treatments`,{method:'POST',headers,body:JSON.stringify({title:'Synthetic HTTP',reason:''})});expect(created.status).toBe(201);const t=await created.json();expect(t.draft.version).toBe(0);
      const get=await fetch(`${url}/treatments/${t.id}`,{headers});expect(get.status).toBe(200);expect(get.headers.get('cache-control')).toBe('no-store');
      const invalid=await fetch(`${url}/treatments`,{method:'POST',headers,body:JSON.stringify({title:'synthetic',reason:'',unknown:true})});expect(invalid.status).toBe(400);expect(await invalid.json()).toMatchObject({code:'VALIDATION_ERROR',requestId:expect.any(String)});
      const cross=await fetch(`${url}/context`,{headers:{...headers,Origin:'https://attacker.invalid'}});expect(cross.status).toBe(403);
      const rebound=await fetch(`${url}/context`,{headers:{Host:'attacker.invalid:8080'}});expect(rebound.status).toBe(403);
      const badJson=await fetch(`${url}/treatments`,{method:'POST',headers,body:'{'});expect(badJson.status).toBe(400);expect(await badJson.json()).toMatchObject({code:'VALIDATION_ERROR'});
    } finally {await app.close();}
  });
});
