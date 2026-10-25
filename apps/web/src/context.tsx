import { useState, type FormEvent } from 'react';
import { ContextInputSchema, type ContextList, type ContextView } from '@mmh/contracts';
import { api, json } from './api';
import { ErrorNotice, PageTitle, ResourceState, useResource, useUnsaved } from './shared';

const fields = { allergies: 'Alergias conocidas', conditions: 'Condiciones conocidas', otherMedications: 'Otros medicamentos' } as const;
type ContextKey = keyof typeof fields;

export function Context() {
  const resource = useResource<ContextView>('/context');
  return <><PageTitle eyebrow="INFORMACIÓN DECLARADA POR TI" title="Mi contexto de salud"><p>Es opcional y no bloquea el registro de tratamientos. No conocer un dato es distinto de declarar que no tienes ninguno.</p></PageTitle><ResourceState {...resource} retry={resource.reload}/>{resource.data && <ContextForm initial={resource.data}/>}</>;
}

function ContextForm({ initial }: { initial: ContextView }) {
  const [version, setVersion] = useState(initial.version);
  const [statuses, setStatuses] = useState<Record<ContextKey, ContextList['status']>>({ allergies: initial.allergies.status, conditions: initial.conditions.status, otherMedications: initial.otherMedications.status });
  const [texts, setTexts] = useState<Record<ContextKey, string>>({ allergies: initial.allergies.items.join('\n'), conditions: initial.conditions.items.join('\n'), otherMedications: initial.otherMedications.items.join('\n') });
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState('');
  useUnsaved(dirty);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(null); setMessage('');
    const lists = Object.fromEntries(Object.keys(fields).map((key) => { const k = key as ContextKey; return [k, { status: statuses[k], items: statuses[k] === 'reported' ? texts[k].split('\n').map((s) => s.trim()).filter(Boolean) : [] }]; }));
    const parsed = ContextInputSchema.safeParse({ expectedVersion: version, ...lists });
    if (!parsed.success) { setError(new Error('Cada lista declarada necesita al menos un dato, uno por línea (máximo 1000 caracteres por dato).')); return; }
    setBusy(true);
    try { const result = await api<ContextView>('/context', json('PUT', parsed.data)); setVersion(result.version); setDirty(false); setMessage('Contexto guardado en el servidor. Los análisis anteriores pueden quedar obsoletos.'); }
    catch (err) { setError(err); } finally { setBusy(false); }
  }
  return <form className="panel stack narrow" onSubmit={submit} onChange={() => { setDirty(true); setMessage(''); }}><p className="notice">No comprobamos de manera exhaustiva interacciones, contraindicaciones ni alergias. Esta lista no garantiza la seguridad de un tratamiento.</p>{Object.entries(fields).map(([key, label]) => { const k = key as ContextKey; return <fieldset className="stack" key={key}><legend>{label}</legend><label>Estado de la información<select value={statuses[k]} onChange={(e) => setStatuses((s) => ({ ...s, [k]: e.target.value as ContextList['status'] }))}><option value="unknown">No lo sé / aún no registrado</option><option value="reported_none">Declaro que no tengo ninguno</option><option value="reported">Quiero declarar una lista</option></select></label>{statuses[k] === 'reported' && <label>{label}: un dato por línea<textarea required rows={4} value={texts[k]} onChange={(e) => setTexts((s) => ({ ...s, [k]: e.target.value }))}/></label>}</fieldset>; })}<ErrorNotice error={error}/><p role="status">{message}</p><button className="primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar contexto'}</button><small>Versión guardada: {version} · {dirty ? 'Cambios pendientes' : 'Sin cambios pendientes'}</small></form>;
}
