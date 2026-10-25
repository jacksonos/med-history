import { describe, expect, it, vi } from 'vitest';
import { ApiFailure, canonical, hash, localBoundary, period } from './core.js';
import { configuration } from './config.js';
import { detectMime, DocumentClient } from './documents.js';
import { verifyClaims, validateSelection } from './knowledge.js';
import { demoFixtures, demoSnapshot, demoStructure, documentTextHash, syntheticPdf } from './demo.js';
import { Provider } from './assistance.js';
import { DocumentExtractionSchema } from '@mmh/contracts';

const config=configuration({DATABASE_URL:'postgresql://test:test@localhost/test'});
describe('deterministic safety boundaries',()=> {
  it('canonical hashing never depends on property insertion order',()=> {expect(hash({z:[1,2],a:1})).toBe(hash({a:1,z:[1,2]}));expect(canonical([1,2])).not.toBe(canonical([2,1]));});
  it('Lima dates are inclusive without accepting impossible dates',()=> {expect(period('2026-10-20','2026-10-21')).toEqual({from:'2026-10-20T00:00:00-05:00',to:'2026-10-22T05:00:00.000Z'});expect(()=>period('2026-02-30','2026-03-01')).toThrow();expect(()=>period('2026-03-02','2026-03-01')).toThrow();});
  it('demo default ignores an existing API key',async()=> {const fetcher=vi.spyOn(globalThis,'fetch'); const provider=new Provider(configuration({DATABASE_URL:config.DATABASE_URL,OPENAI_API_KEY:'synthetic-test-value'}));await expect(provider.generate('explanation',{},[])).rejects.toMatchObject({code:'AI_UNAVAILABLE'});expect(fetcher).not.toHaveBeenCalled();fetcher.mockRestore();});
  it('rejects fake images, unknown signatures, uncalibrated live models',()=> {expect(()=>detectMime(Buffer.from('<html>'))).toThrow();expect(detectMime(Buffer.from('%PDF-1.7\n'))).toBe('application/pdf');expect(()=>configuration({DATABASE_URL:config.DATABASE_URL,AI_MODE:'live',OPENAI_MODEL:'other'})).toThrow();});
  it('permits only local Host/Origin pairs and configured Vite',()=> {
    const run=(host:string,origin?:string,site?:string)=> {const next=vi.fn();const res:any={locals:{},setHeader:vi.fn(),status:vi.fn().mockReturnThis(),json:vi.fn()};localBoundary(config)({headers:{host,origin,'sec-fetch-site':site},method:'GET'} as any,res,next);return next.mock.calls.length;};
    expect(run('localhost:8080','http://localhost:8080')).toBe(1);expect(run('127.0.0.1:8080')).toBe(1);expect(run('evil.test:8080')).toBe(0);expect(run('localhost:8080','https://evil.test')).toBe(0);expect(run('localhost:8080',undefined,'cross-site')).toBe(0);expect(run('localhost:5174','http://localhost:5174')).toBe(0);
  });
  it('rejects fabricated citations, foreign chunk IDs and incorrect reference selections',async()=> {
    const chunk={id:'allowed',source_id:'s',scope:'substance_route_formulation',text:'Literal source.',metadata:{}};
    const output={explanation:[{text:'Literal source.',chunkIds:['allowed'],quote:'Literal source.'}],concernsToDiscuss:[],questions:[],limitations:[]};expect(verifyClaims(output,[chunk])).toEqual(output);
    expect(()=>verifyClaims({...output,explanation:[{...output.explanation[0],quote:'Invented'}]},[chunk])).toThrow(ApiFailure);
    const snapshot=demoSnapshot((await demoFixtures())[0]);validateSelection(snapshot);snapshot.medications[0]!.route.value='intravenosa';expect(()=>validateSelection(snapshot)).toThrow();
  });
  it('three exact synthetic fixtures preserve missing fields and documentary evidence',async()=> {
    const fixtures=await demoFixtures();expect(fixtures).toHaveLength(3);
    const missing=demoSnapshot(fixtures[1]);expect(missing.medications[0]!.dose.value).toBeNull();expect(missing.medications[0]!.schedule.value).toBeNull();expect(missing.medications[0]!.duration.value).toBeNull();
    expect(documentTextHash(fixtures[0].text)).not.toBe(documentTextHash(fixtures[0].text.replace('500','50')));
    for(const f of fixtures) {expect(syntheticPdf(f.text).subarray(0,5).toString()).toBe('%PDF-');const d=DocumentExtractionSchema.parse({schemaVersion:'1',documentId:'11111111-1111-4111-8111-111111111111',generation:1,method:'native',pages:1,text:f.text,blocks:[{page:1,text:f.text,box:null,score:null}],warnings:[]});const result=demoStructure(f,d);expect(result.medications[0]!.referenceSelection).toBeNull();expect(result.medications[0]!.name.evidence?.quote).toBe(f.medication.name);}
  });
  it('document HTTP client sends only bytes and validated IDs, rejecting mismatched responses',async()=> {
    const fetcher=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({schemaVersion:'1',documentId:'22222222-2222-4222-8222-222222222222',generation:1,method:'native',pages:1,text:'',blocks:[],warnings:[]}),{status:200}));
    await expect(new DocumentClient(config).extract('11111111-1111-4111-8111-111111111111',1,Buffer.from('%PDF-'),'application/pdf')).rejects.toMatchObject({code:'EXTRACTION_ID_MISMATCH'});expect(fetcher.mock.calls[0]?.[0].toString()).toBe('http://documents:8000/v1/extractions');fetcher.mockRestore();
  });
});
