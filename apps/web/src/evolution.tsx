import { useState, type FormEvent } from 'react';
import { EvolutionInputSchema, type Collection, type EvolutionEntry, type EvolutionInput } from '@mmh/contracts';
import { api, json } from './api';
import { useTreatment } from './App';
import { ErrorNotice, ResourceState, dateLabel, useResource, useUnsaved } from './shared';

const kindLabels = { checkin: 'Cómo me siento', note: 'Nota libre', symptom: 'Síntoma declarado', intake: 'Toma explícita', measurement: 'Medición' };
const feelingLabels = { better: 'Mejor', same: 'Igual', worse: 'Peor' };
const limaNow = () => new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 16);

export function Evolution() {
  const { treatment } = useTreatment();
  const [offset, setOffset] = useState(0);
  const resource = useResource<Collection<EvolutionEntry>>(`/treatments/${treatment.id}/evolution?limit=20&offset=${offset}`);
  const [editing, setEditing] = useState<EvolutionEntry | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState<unknown>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  async function remove(entry: EvolutionEntry) {
    if (!window.confirm('¿Eliminar este registro de evolución y su relato original? El resumen dejará de incluirlo. No se puede deshacer.')) return;
    setDeleting(entry.id); setError(null);
    try { await api(`/evolution/${entry.id}`, { method: 'DELETE' }); resource.reload(); }
    catch (err) { setError(err); } finally { setDeleting(null); }
  }
  return <div className="stack"><section className="panel"><h2>Tu experiencia también cuenta</h2><p>Un registro no prueba que un medicamento haya causado un síntoma. Los días sin registro son información desconocida, no tomas omitidas.</p><EvolutionForm key={`${editing?.id ?? 'new'}-${formKey}`} editing={editing} onSaved={() => { setEditing(null); setFormKey((v) => v + 1); resource.reload(); }} onCancel={() => { setEditing(null); setFormKey((v) => v + 1); }}/></section><section className="panel"><h2>Tu bitácora</h2><ResourceState {...resource} retry={resource.reload}/><ErrorNotice error={error}/>{resource.data?.items.length === 0 && <p className="muted">Aún no hay vivencias registradas. No hay una frecuencia obligatoria.</p>}<div className="timeline">{resource.data?.items.map((entry) => <article key={entry.id}><p className="eyebrow">{dateLabel(entry.occurredAtISO)} · Declarado por el paciente</p><h3>{kindLabels[entry.kind]}</h3><EntryContent entry={entry}/>{entry.originalText !== null && <details><summary>Relato original conservado</summary><p className="preserve">{entry.originalText}</p></details>}<div className="actions"><button onClick={() => { setEditing(entry); document.getElementById('evolution-form')?.scrollIntoView({ block: 'start' }); }}>Corregir registro</button><button className="text-danger" disabled={deleting === entry.id} onClick={() => remove(entry)}>Eliminar registro</button></div></article>)}</div>{resource.data && <div className="pagination"><button disabled={!offset} onClick={() => setOffset((v) => v - 20)}>Anterior</button><span>{resource.data.total} registros</span><button disabled={offset + 20 >= resource.data.total} onClick={() => setOffset((v) => v + 20)}>Siguiente</button></div>}</section></div>;
}

function EvolutionForm({ editing, onSaved, onCancel }: { editing: EvolutionEntry | null; onSaved: () => void; onCancel: () => void }) {
  const { treatment } = useTreatment();
  const payload = editing?.payload;
  const [kind, setKind] = useState<EvolutionInput['kind']>(editing?.kind ?? 'checkin');
  const [occurred, setOccurred] = useState(editing ? new Date(+new Date(editing.occurredAtISO) - 5 * 3600000).toISOString().slice(0, 16) : limaNow());
  const [originalText, setOriginalText] = useState(editing?.originalText ?? '');
  const [feeling, setFeeling] = useState<'better' | 'same' | 'worse'>(payload && 'feeling' in payload ? payload.feeling : 'same');
  const [symptoms, setSymptoms] = useState(payload && 'symptoms' in payload ? payload.symptoms ?? '' : '');
  const [difficulties, setDifficulties] = useState(payload && 'difficulties' in payload ? payload.difficulties ?? '' : '');
  const [label, setLabel] = useState(payload && 'label' in payload ? payload.label : '');
  const [intensity, setIntensity] = useState(payload && 'intensity' in payload && payload.intensity !== null ? String(payload.intensity) : '');
  const [value, setValue] = useState(payload && 'value' in payload ? payload.value : '');
  const [unit, setUnit] = useState(payload && 'unit' in payload ? payload.unit : '');
  const [text, setText] = useState(payload && 'text' in payload ? payload.text : '');
  const [medicationId, setMedicationId] = useState(payload && 'medicationId' in payload ? payload.medicationId : treatment.snapshot?.medications[0]?.id ?? '');
  const [intakeStatus, setIntakeStatus] = useState<'taken' | 'skipped'>(payload && 'status' in payload ? payload.status : 'taken');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<unknown>(null);
  useUnsaved(dirty && !saved);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(null);
    const date = new Date(`${occurred}:00-05:00`);
    if (isNaN(+date)) { setError(new Error('Revisa la fecha y hora del registro.')); return; }
    const base = { kind, occurredAtISO: date.toISOString(), originalText: editing?.originalText ?? (originalText || null) };
    const data = { ...base, payload: kind === 'checkin' ? { feeling, ...(symptoms ? { symptoms } : {}), ...(difficulties ? { difficulties } : {}) } : kind === 'note' ? { text } : kind === 'symptom' ? { label, intensity: intensity === '' ? null : Number(intensity) } : kind === 'measurement' ? { label, value, unit } : { medicationId, revision: editing?.kind === 'intake' ? editing.payload.revision : treatment.currentRevision, status: intakeStatus } };
    const parsed = EvolutionInputSchema.safeParse(data);
    if (!parsed.success) { setError(new Error('Revisa los campos obligatorios, los límites y la intensidad (entero de 0 a 10).')); return; }
    setBusy(true);
    try { await api(editing ? `/evolution/${editing.id}` : `/treatments/${treatment.id}/evolution`, json(editing ? 'PUT' : 'POST', editing ? { ...parsed.data, expectedVersion: editing.version } : parsed.data)); setSaved(true); setDirty(false); }
    catch (err) { setError(err); } finally { setBusy(false); }
  }
  if (saved) return <div className="notice" role="status"><p>Registro guardado en el servidor.</p><button onClick={onSaved}>Ver bitácora y registrar otra vivencia</button></div>;
  return <form id="evolution-form" className="stack" onSubmit={submit} onChange={() => setDirty(true)}><h3>{editing ? 'Corregir registro' : 'Añadir una vivencia'}</h3><div className="form-grid"><label>Tipo de registro<select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>{Object.entries(kindLabels).map(([key, name]) => <option key={key} value={key} disabled={key === 'intake' && !treatment.snapshot?.medications.length}>{name}</option>)}</select></label><label>Fecha y hora (Lima, UTC−5)<input type="datetime-local" required value={occurred} onChange={(e) => setOccurred(e.target.value)}/></label></div>{kind === 'checkin' && <><fieldset><legend>¿Cómo te sientes respecto a antes?</legend><div className="feeling-options">{Object.entries(feelingLabels).map(([key, name]) => <label key={key}><input type="radio" name="feeling" value={key} checked={feeling === key} onChange={() => setFeeling(key as typeof feeling)}/>{name}</label>)}</div></fieldset><label>Molestias o síntomas <span className="optional">(opcional)</span><textarea maxLength={1000} value={symptoms} onChange={(e) => setSymptoms(e.target.value)}/></label><label>Dificultades <span className="optional">(opcional)</span><textarea maxLength={1000} value={difficulties} onChange={(e) => setDifficulties(e.target.value)}/></label></>}{kind === 'note' && <label>Tu anotación<textarea required maxLength={2000} value={text} onChange={(e) => { setText(e.target.value); if (!editing) setOriginalText(e.target.value); }}/></label>}{(kind === 'symptom' || kind === 'measurement') && <label>{kind === 'symptom' ? 'Síntoma que observaste' : 'Qué mediste'}<input required maxLength={1000} value={label} onChange={(e) => setLabel(e.target.value)}/></label>}{kind === 'symptom' && <label>Intensidad <span className="optional">(opcional, 0 a 10)</span><input type="number" min={0} max={10} step={1} value={intensity} onChange={(e) => setIntensity(e.target.value)}/></label>}{kind === 'measurement' && <div className="form-grid"><label>Valor declarado<input required maxLength={1000} value={value} onChange={(e) => setValue(e.target.value)}/></label><label>Unidad<input required maxLength={1000} value={unit} onChange={(e) => setUnit(e.target.value)}/></label></div>}{kind === 'intake' && <><label>Medicamento de la revisión {editing?.kind === 'intake' ? editing.payload.revision : treatment.currentRevision}<select required value={medicationId} onChange={(e) => setMedicationId(e.target.value)}>{editing?.kind === 'intake' && !treatment.snapshot?.medications.some((m) => m.id === editing.payload.medicationId) && <option value={editing.payload.medicationId}>Medicamento de revisión histórica ({editing.payload.medicationId})</option>}{treatment.snapshot?.medications.map((med) => <option key={med.id} value={med.id}>{med.name.value || 'Nombre no especificado'}</option>)}</select></label><label>Lo que ocurrió<select value={intakeStatus} onChange={(e) => setIntakeStatus(e.target.value as typeof intakeStatus)}><option value="taken">Declaro que lo tomé</option><option value="skipped">Declaro que omití esta toma</option></select></label><p>No deducimos tomas ni sugerimos compensar dosis.</p></>}{kind !== 'note' && <label>Relato original <span className="optional">(opcional; se conserva literalmente)</span><textarea maxLength={2000} readOnly={Boolean(editing?.originalText)} value={originalText} onChange={(e) => setOriginalText(e.target.value)}/></label>}<ErrorNotice error={error}/><div className="actions"><button className="primary" disabled={busy}>{busy ? 'Guardando…' : editing ? 'Guardar corrección' : 'Guardar vivencia'}</button><button type="button" onClick={() => { if (!dirty || window.confirm('¿Descartar los cambios de este registro?')) onCancel(); }}>Cancelar</button></div></form>;
}

function EntryContent({ entry }: { entry: EvolutionEntry }) {
  if (entry.kind === 'checkin') return <div><p>{feelingLabels[entry.payload.feeling]}</p>{entry.payload.symptoms && <p className="preserve">Molestias: {entry.payload.symptoms}</p>}{entry.payload.difficulties && <p className="preserve">Dificultades: {entry.payload.difficulties}</p>}</div>;
  if (entry.kind === 'note') return <p className="preserve">{entry.payload.text}</p>;
  if (entry.kind === 'symptom') return <p>{entry.payload.label} · Intensidad: {entry.payload.intensity ?? 'no especificada'}</p>;
  if (entry.kind === 'measurement') return <p>{entry.payload.label}: {entry.payload.value} {entry.payload.unit} · Sin interpretación clínica</p>;
  return <p>{entry.payload.status === 'taken' ? 'Toma declarada' : 'Omisión declarada'} · Medicamento {entry.payload.medicationId} · Revisión {entry.payload.revision}</p>;
}
