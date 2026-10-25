import 'reflect-metadata';
import { Body, Catch, Controller, Delete, Get, HttpCode, Inject, Module, Param, Patch, Post, Put, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FileInterceptor } from '@nestjs/platform-express';
import express from 'express';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { z, ZodError } from 'zod';
import multer from 'multer';
import { configuration } from './config.js';
import { Database } from './database/database.js';
import { ApiFailure, localBoundary } from './core.js';
import { History } from './history.js';
import { Jobs } from './jobs.js';
import { Documents } from './documents.js';
import { Knowledge, catalog } from './knowledge.js';
import { Assistance } from './assistance.js';

export class Runtime {
  config=configuration(); db=new Database(this.config); history=new History(this.db); jobs=new Jobs(this.config);
  documents=new Documents(this.config,this.db,this.history,this.jobs); knowledge=new Knowledge(this.db);
  assistance=new Assistance(this.config,this.db,this.history,this.documents,this.knowledge,this.jobs);
  async start() {
    await this.db.migrate(); await this.jobs.start();
    await this.jobs.work('document.extract',d=>this.documents.process(d.id,d.generation!));
    await this.jobs.work('assistance.structure',d=>this.assistance.process(d.id));
    await this.jobs.work('assistance.generate',d=>this.assistance.process(d.id));
    await this.jobs.work('storage.cleanup',d=>this.documents.cleanup(d.id));
    // Tombstones survive exhausted jobs and are retried on each process start.
    await this.documents.cleanup().catch(()=>console.error('STORAGE_CLEANUP_PENDING'));
  }
  async close() {await this.jobs.boss.stop();await this.db.pool.end();}
  async capabilities() {
    let documentProcessingAvailable=false;
    try {documentProcessingAvailable=(await fetch(new URL('/health/ready',this.config.DOCUMENT_SERVICE_URL),{signal:AbortSignal.timeout(2000)})).ok;} catch {}
    return {aiMode:this.config.AI_MODE,liveAvailable:this.config.AI_MODE==='live' && Boolean(this.config.OPENAI_API_KEY),documentProcessingAvailable,retrieval:'textual',embeddingsAvailable:false,limits:{fileBytes:10*1024*1024,pages:5,imageMegapixels:20,jsonBytes:256*1024,aiPayloadBytes:24000,aiAttemptsPerDay:20,aiTotalCents:100,summaryEntries:100}};
  }
}
@Catch()
class Errors implements ExceptionFilter {
  catch(error:any,host:ArgumentsHost) {
    if(!(error instanceof ZodError)) console.error('UNHANDLED_API_ERROR',error);
    const response=host.switchToHttp().getResponse<Response>();
    const known=error instanceof ApiFailure;
    const tooLarge=error?.code==='LIMIT_FILE_SIZE' || error?.type==='entity.too.large';
    const bad=error instanceof ZodError || error instanceof SyntaxError || error instanceof multer.MulterError
      // Nest wraps body-parser SyntaxError in BadRequestException.
      || (!known && !tooLarge && typeof error?.getStatus==='function' && error.getStatus()===400);
    const status=known?error.status:tooLarge?413:bad?400:typeof error?.getStatus==='function'?error.getStatus():500;
    const code=known?error.code:tooLarge?'PAYLOAD_TOO_LARGE':bad?'VALIDATION_ERROR':status===404?'NOT_FOUND':'INTERNAL_ERROR';
    response.status(status).json({code,message:known?error.message:tooLarge?'El contenido supera el límite permitido.':bad?'Entrada inválida; revisa los campos y límites.':status===404?'Ruta no disponible.':'No se pudo completar la operación.',requestId:response.locals.requestId??randomUUID()});
  }
}
@Controller()
class Api {
  constructor(@Inject(Runtime) readonly r:Runtime) {}
  @Get('health') async health() {await this.r.db.pool.query('SELECT 1');return {status:'ok',database:'ready',...await this.r.capabilities()};}
  @Get('capabilities') capabilities() {return this.r.capabilities();}
  @Get('reference-catalog') catalog() {return {items:catalog,corpusVersion:'2026-10-25.1',country:'España',notice:'Catálogo documental limitado; no equivale a autorización ni equivalencia en Perú.'};}
  @Get('context') context() {return this.r.history.getContext();}
  @Put('context') putContext(@Body() body:unknown) {return this.r.history.putContext(body);}
  @Get('treatments') list(@Query() query:Record<string,unknown>) {return this.r.history.list(query);}
  @Post('treatments') create(@Body() body:unknown) {return this.r.history.create(body);}
  @Get('treatments/:id') async treatment(@Param('id') id:string) {
    const treatment=await this.r.history.view(id);
    const docs=(await this.r.db.pool.query('SELECT id FROM documents WHERE treatment_id=$1 AND deleted_at IS NULL ORDER BY id',[id])).rows;
    const runs=(await this.r.db.pool.query('SELECT id FROM analysis_runs WHERE treatment_id=$1 ORDER BY created_at DESC LIMIT 100',[id])).rows;
    return {...treatment,documents:await Promise.all(docs.map(d=>this.r.documents.view(d.id))),analyses:await Promise.all(runs.map(a=>this.r.assistance.view(a.id)))};
  }
  @Put('treatments/:id/draft') draft(@Param('id') id:string,@Body() body:unknown) {return this.r.history.saveDraft(id,body);}
  @Post('treatments/:id/revisions') confirm(@Param('id') id:string,@Body() body:unknown) {return this.r.history.confirm(id,body);}
  @Get('treatments/:id/revisions') revisions(@Param('id') id:string,@Query() query:Record<string,unknown>) {return this.r.history.revisions(id,query);}
  @Patch('treatments/:id') status(@Param('id') id:string,@Body() body:unknown) {return this.r.history.status(id,body);}
  @Delete('treatments/:id') @HttpCode(204) removeTreatment(@Param('id') id:string) {return this.r.documents.removeTreatment(id);}
  @Post('treatments/:id/documents') @HttpCode(202)
  @UseInterceptors(FileInterceptor('file',{storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024,files:1,fields:1,fieldSize:20,parts:2}}))
  upload(@Param('id') id:string,@UploadedFile() file:Express.Multer.File,@Body() body:unknown) {const ack=z.object({syntheticAcknowledged:z.literal('true')}).strict().parse(body);return this.r.documents.upload(id,file,ack.syntheticAcknowledged);}
  @Get('documents/:id') document(@Param('id') id:string) {return this.r.documents.view(id);}
  @Get('documents/:id/original') async original(@Param('id') id:string,@Res() res:Response) {const d=await this.r.documents.original(id);res.setHeader('Content-Type',d.mime);res.setHeader('Content-Disposition',d.mime==='application/pdf'?'attachment; filename="document.pdf"':'inline');res.setHeader('Content-Security-Policy',"default-src 'none'; sandbox");res.send(d.bytes);}
  @Post('documents/:id/retry') @HttpCode(202) retry(@Param('id') id:string) {return this.r.documents.retry(id);}
  @Post('documents/:id/structure') @HttpCode(202) async structure(@Param('id') id:string,@Body() body:unknown) {const d=await this.r.documents.row(id);return this.r.assistance.request(d.treatment_id,body,id);}
  @Delete('documents/:id') @HttpCode(204) deleteDocument(@Param('id') id:string) {return this.r.documents.removeDocument(id);}
  @Post('treatments/:id/analyses') @HttpCode(202) analysis(@Param('id') id:string,@Body() body:unknown) {return this.r.assistance.request(id,body);}
  @Get('analyses/:id') analysisView(@Param('id') id:string) {return this.r.assistance.view(id);}
  @Get('treatments/:id/evolution') evolution(@Param('id') id:string,@Query() query:Record<string,unknown>) {return this.r.history.listEvolution(id,query);}
  @Post('treatments/:id/evolution') addEvolution(@Param('id') id:string,@Body() body:unknown) {return this.r.history.addEvolution(id,body);}
  @Put('evolution/:id') editEvolution(@Param('id') id:string,@Body() body:unknown) {return this.r.history.editEvolution(id,body);}
  @Delete('evolution/:id') @HttpCode(204) removeEvolution(@Param('id') id:string) {return this.r.history.deleteEntry('evolution_entries',id);}
  @Get('treatments/:id/questions') questions(@Param('id') id:string,@Query() query:Record<string,unknown>) {return this.r.history.questions(id,query);}
  @Post('treatments/:id/questions') addQuestion(@Param('id') id:string,@Body() body:unknown) {return this.r.history.addQuestion(id,body);}
  @Patch('questions/:id') editQuestion(@Param('id') id:string,@Body() body:unknown) {return this.r.history.editQuestion(id,body);}
  @Delete('questions/:id') @HttpCode(204) removeQuestion(@Param('id') id:string) {return this.r.history.deleteEntry('questions',id);}
  @Get('treatments/:id/summary') summary(@Param('id') id:string,@Query() query:Record<string,unknown>) {return this.r.history.summary(id,query);}
  @Get('sources/:id') source(@Param('id') id:string) {return this.r.knowledge.source(id);}
}
@Module({controllers:[Api]}) class ApiModule {}
export async function createApplication(runtime:Runtime) {
  const app=await NestFactory.create({module:ApiModule,providers:[{provide:Runtime,useValue:runtime}]},{bodyParser:false,logger:false});
  app.use(localBoundary(runtime.config)); app.use(express.json({limit:'256kb',strict:true})); app.setGlobalPrefix('api/v1'); app.useGlobalFilters(new Errors());
  return app;
}
export async function bootstrap() {
  const runtime=new Runtime(); await runtime.start();
  const app=await createApplication(runtime);
  await app.listen(3000,'0.0.0.0');
  const close=async()=> {await app.close();await runtime.close();}; process.once('SIGTERM',()=>void close());process.once('SIGINT',()=>void close());
  return app;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) void bootstrap().catch((error)=>{console.error('API_STARTUP_FAILED',error);process.exitCode=1;});
