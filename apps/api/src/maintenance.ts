import { configuration } from './config.js';
import { Database } from './database/database.js';
import { Knowledge } from './knowledge.js';
import { seedDemo } from './demo.js';

const command=process.argv[2]; const db=new Database(configuration());
try {
  if(!['migrate','seed','demo','corpus'].includes(command??'')) throw new Error('Comando no permitido. Usa migrate, seed, demo o corpus.');
  await db.migrate();
  if(command==='corpus'||command==='seed') await new Knowledge(db).seed();
  if(command==='demo'||command==='seed') await seedDemo(db);
  console.log(`MAINTENANCE_${command?.toUpperCase()}_OK`);
} catch {console.error('MAINTENANCE_FAILED');process.exitCode=1;} finally {await db.pool.end();}
