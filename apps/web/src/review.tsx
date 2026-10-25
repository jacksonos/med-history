import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmableTreatmentSnapshotSchema, emptySnapshot, patientField, type FieldValue, type MedicationInstruction, type TreatmentSnapshot, type TreatmentView } from '@mmh/contracts';
import { api, json } from './api';
import { useTreatment } from './App';
import { Documents } from './documents';
import { ErrorNotice, ResourceState, useResource, useUnsaved } from './shared';

export const medicationFields = { name: 'Nombre', strength: 'Concentración', form: 'Forma farmacéutica', dose: 'Dosis indicada', route: 'Vía', schedule: 'Horario o frecuencia', duration: 'Duración', instructions: 'Otras instrucciones' } as const;
type FieldKey = keyof typeof medicationFields;
type CatalogItem = NonNullable<MedicationInstruction['referenceSelection']> & { label: string };
interface CatalogEntry { substanceId: string; aliases: string[]; routeCode: string; formulationCode: string; forms: string[]; products: Array<{ id: string; name: string; strength: string; country: string }> }

export function newMedication(): MedicationInstruction {
  return { id: crypto.randomUUID(), name: patientField(null), strength: patientField(null), form: patientField(null), dose: patientField(null), route: patientField(null), schedule: patientField(null), duration: patientField(null), instructions: patientField(null), referenceSelection: null };
}

export function Review() {
  const { treatment, update } = useTreatment();
  const [server, setServer] = useState(treatment);
  const [snapshot, setSnapshot] = useState<TreatmentSnapshot>(() => structuredClone(treatment.draft?.snapshot ?? treatment.snapshot ?? emptySnapshot()));
  const [saved, setSaved] = useState(() => JSON.stringify(treatment.draft?.snapshot ?? treatment.snapshot ?? emptySnapshot()));
  const [changeReason, setChangeReason] = useState('');
  const [busy, setBusy] = useState<'save' | 'confirm' | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const catalogResource = useResource<{ items: CatalogEntry[] }>('/reference-catalog');
  const catalogOptions: CatalogItem[] = (catalogResource.data?.items ?? []).flatMap((item) => {
    const base = { substanceId: item.substanceId, routeCode: item.routeCode, formulationCode: item.formulationCode };
    return [{ ...base, productId: null, label: `${item.aliases[0]} · ${item.routeCode} · ${item.forms[0]} · sin producto específico` }, ...item.products.map((product) => ({ ...base, productId: product.id, label: `${product.name} ${product.strength} · ${product.country} (no equivale a producto peruano)` }))];
  });
  const catalog = { ...catalogResource, data: catalogResource.data ? { items: catalogOptions } : null };
  const dirty = JSON.stringify(snapshot) !== saved;
  useUnsaved(dirty || (!confirmed && Boolean(changeReason)));
  const valid = ConfirmableTreatmentSnapshotSchema.safeParse(snapshot).success;

  function updateMedication(index: number, key: FieldKey, value: string) {
    setMessage(''); setConfirmed(false);
    setSnapshot((previous) => ({ ...previous, medications: previous.medications.map((med, i) => i === index ? { ...med, [key]: { ...patientField(value.trim() ? value : null), evidence: med[key].evidence }, referenceSelection: null } : med) }));
  }
  async function save() {
    setBusy('save'); setError(null); setMessage('');
    try {
      const updated = await api<TreatmentView>(`/treatments/${treatment.id}/draft`, json('PUT', { expectedDraftVersion: server.draft?.version ?? 0, baseRevision: server.currentRevision, snapshot }));
      setServer(updated); update(updated); setSaved(JSON.stringify(snapshot)); setConfirmed(false);
      setMessage('Borrador guardado en el servidor. No es una revisión confirmada.');
    } catch (err) { setError(err); } finally { setBusy(null); }
  }
  async function confirm() {
    if (dirty || !server.draft || !valid || !changeReason.trim()) return;
    if (!window.confirm('¿Confirmar el borrador ya guardado como una nueva revisión? Confirmas tu revisión personal, no una validación médica.')) return;
    setBusy('confirm'); setError(null); setMessage('');
    try {
      const updated = await api<TreatmentView>(`/treatments/${treatment.id}/revisions`, json('POST', { expectedRevision: server.currentRevision, expectedDraftVersion: server.draft.version, changeReason }));
      setServer(updated); update(updated); setSaved(JSON.stringify(snapshot)); setConfirmed(true); setChangeReason(''); setMessage('Revisión confirmada y guardada.');
    } catch (err) { setError(err); } finally { setBusy(null); }
  }
  function proposal(value: TreatmentSnapshot) {
    if (!window.confirm('¿Reemplazar los campos de esta pantalla por la propuesta? El borrador del servidor y las revisiones confirmadas no cambiarán hasta que guardes. Revisa cada campo contra el original.')) return;
    setSnapshot(structuredClone(value)); setConfirmed(false); setMessage('Propuesta incorporada solo al formulario. Revisa los datos y guarda explícitamente.');
  }
  return <div className="review-layout"><section className="panel stack"><div><h2>Revisa, sin completar lo desconocido</h2><p className="muted">Compara con el original. Los campos vacíos se guardan como «no especificado», nunca con dosis automáticas.</p></div><p className="notice">{dirty ? 'Hay cambios sin guardar.' : server.draft ? `Borrador guardado · versión ${server.draft.version}. Pendiente de confirmación.` : 'No hay borrador editable guardado. Guarda antes de confirmar.'} Revisión vigente: {server.currentRevision}.</p>{snapshot.medications.map((med, index) => <fieldset key={med.id} className="medication"><legend>Medicamento {index + 1}</legend><div className="form-grid">{Object.entries(medicationFields).map(([key, label]) => { const field = med[key as FieldKey]; return <label key={key}>{label}<input maxLength={1000} value={field.value ?? ''} placeholder="No especificado" onChange={(e) => updateMedication(index, key as FieldKey, e.target.value)}/><FieldOrigin field={field}/></label>; })}</div><label>Referencia del catálogo <span className="optional">(opcional; no completa dosis)</span><select value={med.referenceSelection ? JSON.stringify(med.referenceSelection) : ''} onChange={(e) => setSnapshot((s) => ({ ...s, medications: s.medications.map((m, i) => i === index ? { ...m, referenceSelection: e.target.value ? JSON.parse(e.target.value) as MedicationInstruction['referenceSelection'] : null } : m) }))}><option value="">Desconocida / sin selección</option>{med.referenceSelection && !(catalog.data?.items ?? []).some((item) => item.substanceId === med.referenceSelection?.substanceId) && <option value={JSON.stringify(med.referenceSelection)}>Selección previamente guardada: {med.referenceSelection.substanceId}</option>}{(catalog.data?.items ?? []).map(({ label, ...selection }, i) => <option key={i} value={JSON.stringify(selection)}>{label}</option>)}</select></label><button className="text-danger" onClick={() => setSnapshot((s) => ({ ...s, medications: s.medications.filter((_, i) => i !== index) }))}>Quitar medicamento del borrador</button></fieldset>)}<button disabled={snapshot.medications.length >= 20} onClick={() => setSnapshot((s) => ({ ...s, medications: [...s.medications, newMedication()] }))}>+ Añadir medicamento manualmente</button><ResourceState {...catalog} retry={catalog.reload}/>{catalog.data && !(catalog.data.items?.length) && <small>Catálogo sin opciones disponibles. Puedes completar y confirmar manualmente con referencia desconocida.</small>}<h3>Indicaciones generales</h3>{snapshot.generalInstructions.map((field, index) => <div className="stack" key={index}><label>Indicación {index + 1}<textarea maxLength={1000} value={field.value ?? ''} placeholder="No especificada" onChange={(e) => setSnapshot((s) => ({ ...s, generalInstructions: s.generalInstructions.map((f, i) => i === index ? patientField(e.target.value.trim() ? e.target.value : null) : f) }))}/><FieldOrigin field={field}/></label><button className="text-danger" onClick={() => setSnapshot((s) => ({ ...s, generalInstructions: s.generalInstructions.filter((_, i) => i !== index) }))}>Quitar indicación {index + 1}</button></div>)}<button disabled={snapshot.generalInstructions.length >= 20} onClick={() => setSnapshot((s) => ({ ...s, generalInstructions: [...s.generalInstructions, patientField(null)] }))}>+ Añadir indicación general</button><ErrorNotice error={error}/><p role="status" aria-live="polite">{message}</p><button className="primary" disabled={busy === 'save' || busy === 'confirm'} onClick={save}>{busy === 'save' ? 'Guardando…' : 'Guardar borrador sin confirmar'}</button><div className="confirm-section"><h3>Confirmar una revisión</h3><p>Se confirma exclusivamente el borrador que ya guardaste, no los cambios pendientes de esta pantalla.</p><label>Motivo de esta revisión<input value={changeReason} maxLength={1000} onChange={(e) => setChangeReason(e.target.value)} placeholder="Por ejemplo: revisión personal de la receta"/></label>{!valid && <p>Incluye al menos un medicamento con nombre o una indicación general para confirmar.</p>}<button className="primary" disabled={!!busy || dirty || !server.draft || !valid || !changeReason.trim()} onClick={confirm}>{busy === 'confirm' ? 'Confirmando…' : 'Confirmar borrador guardado'}</button>{confirmed && <Link className="button" to={`/tratamientos/${treatment.id}/indicaciones`}>Ver indicaciones confirmadas →</Link>}</div></section><div><Documents treatmentId={treatment.id} onProposal={proposal}/></div></div>;
}

function FieldOrigin({ field }: { field: FieldValue }) {
  return <small>{field.value === null ? 'Dato ausente · no especificado' : field.provenance === 'document' ? 'Extraído del documento · revisar' : 'Declarado por el paciente'}{field.issue === 'ambiguous' ? ' · Lectura ambigua' : ''}{field.evidence && <> · Pág. {field.evidence.page}: «{field.evidence.quote}»</>}</small>;
}
