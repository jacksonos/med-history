import { PgBoss } from 'pg-boss';
import type { PoolClient } from 'pg';
import type { Config } from './config.js';

export class Jobs {
  readonly boss: PgBoss;
  constructor(config: Config) { this.boss=new PgBoss({connectionString:config.DATABASE_URL,schema:'pgboss'}); this.boss.on('error',()=>console.error('JOB_INFRASTRUCTURE_ERROR')); }
  async start() {
    await this.boss.start();
    for(const name of ['document.extract','assistance.structure','assistance.generate','storage.cleanup']) await this.boss.createQueue(name,{retryLimit:2,retryDelay:5,retryBackoff:true,expireInSeconds:180});
  }
  async enqueue(c: PoolClient,name:string,data: {id:string;generation?:number},delaySeconds?:number) {
    return this.boss.send(name,data,{...(delaySeconds?{startAfter:delaySeconds}:{}),db:{executeSql:(text:string,values:unknown[])=>c.query(text,values)}});
  }
  async work(name:string,fn:(data:{id:string;generation?:number})=>Promise<void>) {
    await this.boss.work<{id:string;generation?:number}>(name,{localConcurrency:1,batchSize:1},async jobs=>{for(const job of jobs) await fn(job.data);});
  }
}
