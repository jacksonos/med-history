import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import type { Config } from './config.js';

export class ApiFailure extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }
export function fail(status: number, code: string, message: string): never { throw new ApiFailure(status, code, message); }
export function conflict():never { return fail(409, 'VERSION_CONFLICT', 'Los datos cambiaron. Recarga antes de guardar.'); }
export function notFound():never { return fail(404, 'NOT_FOUND', 'Recurso no disponible.'); }
export const uuid = (value: unknown) => z.uuid().parse(value);
export function canonical(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k,v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
export const hash = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
export const bytesHash = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
export const pageSchema = z.object({ limit: z.coerce.number().int().min(1).max(100).default(20), offset: z.coerce.number().int().min(0).default(0) });
export function period(from: unknown, to: unknown) {
  const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => { const d = new Date(`${s}T00:00:00Z`); return !isNaN(+d) && d.toISOString().slice(0,10) === s; });
  const a = date.parse(from), b = date.parse(to);
  if (a > b) fail(400, 'INVALID_PERIOD', 'El inicio debe preceder al fin.');
  return { from: `${a}T00:00:00-05:00`, to: new Date(+new Date(`${b}T00:00:00-05:00`) + 86400000).toISOString() };
}
export function localBoundary(config: Config) {
  const origins = new Set(['http://localhost:8080', 'http://127.0.0.1:8080', ...(config.LOCAL_ORIGIN ? [config.LOCAL_ORIGIN] : [])]);
  const hosts = new Set(['localhost:8080', '127.0.0.1:8080', ...(config.LOCAL_ORIGIN ? [new URL(config.LOCAL_ORIGIN).host] : [])]);
  return (req: Request, res: Response, next: NextFunction) => {
    res.locals.requestId = randomUUID(); res.setHeader('X-Request-Id', res.locals.requestId); res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
    const reject = () => res.status(403).json({ code: 'LOCAL_ACCESS_ONLY', message: 'Origen local no autorizado.', requestId: res.locals.requestId });
    if (!hosts.has(req.headers.host ?? '') || req.headers['sec-fetch-site'] === 'cross-site') { reject(); return; }
    const origin = req.headers.origin;
    if (origin && !origins.has(origin)) { reject(); return; }
    if (origin && config.LOCAL_ORIGIN === origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS'); }
    if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
    if (['POST','PUT','PATCH'].includes(req.method) && !req.is('application/json') && !req.is('multipart/form-data')) { res.status(415).json({code:'UNSUPPORTED_MEDIA_TYPE',message:'Se requiere JSON o multipart documentado.',requestId:res.locals.requestId}); return; }
    next();
  };
}
