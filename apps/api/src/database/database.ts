import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { Config } from '../config.js';

export type Connection = Pick<pg.PoolClient, 'query'>;
export class Database {
  readonly pool: pg.Pool;
  readonly orm: ReturnType<typeof drizzle>;
  constructor(config: Config) { this.pool = new pg.Pool({ connectionString: config.DATABASE_URL, max: 8 }); this.orm = drizzle(this.pool); }
  async tx<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
    const c = await this.pool.connect();
    try { await c.query('BEGIN'); const result = await fn(c); await c.query('COMMIT'); return result; }
    catch (error) { await c.query('ROLLBACK'); throw error; } finally { c.release(); }
  }
  async migrate() {
    const dir = fileURLToPath(new URL('../../migrations/', import.meta.url));
    await this.tx(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(hashtext('mmh-migrations'))");
      await c.query('CREATE TABLE IF NOT EXISTS mmh_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
      for (const name of (await readdir(dir)).filter((n) => n.endsWith('.sql')).sort()) {
        if ((await c.query('SELECT 1 FROM mmh_migrations WHERE name=$1', [name])).rowCount) continue;
        await c.query(await readFile(`${dir}/${name}`, 'utf8'));
        await c.query('INSERT INTO mmh_migrations(name) VALUES($1)', [name]);
      }
    });
  }
}
