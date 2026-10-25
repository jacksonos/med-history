import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, FileText, Plus } from 'lucide-react';
import type { Collection, TreatmentView } from '@mmh/contracts';
import { api, json } from './api';
import { DataText, ErrorNotice, PageTitle, ResourceState, dateLabel, useResource, useUnsaved } from './shared';
import { useTreatment } from './App';
import { Documents } from './documents';

const statuses = { draft: 'Borrador · pendiente de revisión', following: 'En seguimiento', archived: 'Archivado' };

export function Treatments({ home = false, embedded = false }: { home?: boolean; embedded?: boolean }) {
  const [filter, setFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const resource = useResource<Collection<TreatmentView>>(`/treatments?limit=20&offset=${offset}${filter ? `&status=${filter}` : ''}`);
  return <>{!embedded && <PageTitle eyebrow="PASO A PASO, CONTIGO" title={home ? 'Tu salud tiene una historia.' : 'Mis tratamientos'}><p>{home ? 'Reúne tus indicaciones, registra cómo te sientes y lleva tus preguntas a la consulta.' : 'Lo que registraste, con sus cambios y tus vivencias.'}</p></PageTitle>}{home && <section className="welcome-panel"><div><span className="eyebrow">UN BUEN PUNTO DE PARTIDA</span><h2>De la receta a una historia más clara.</h2><p>Incorpora un documento ficticio o escribe las indicaciones. Tú revisas antes de confirmar.</p><Link to="/tratamientos/nuevo" className="button primary"><Plus size={18} aria-hidden="true"/> Registrar un tratamiento</Link></div><FileText className="welcome-icon" size={92} strokeWidth={1} aria-hidden="true"/></section>}<div className="section-heading"><h2>{home ? 'Tus tratamientos' : 'Registros guardados'}</h2><label className="inline-label">Ver<select value={filter} onChange={(e) => { setFilter(e.target.value); setOffset(0); }}><option value="">Todos</option><option value="following">En seguimiento</option><option value="draft">Borradores</option><option value="archived">Archivados</option></select></label></div><ResourceState {...resource} retry={resource.reload}/>{resource.data && <>{resource.data.items.length === 0 ? <div className="empty"><FileText aria-hidden="true"/><h3>Aún no hay tratamientos en esta lista</h3><p>Empieza con las indicaciones que ya recibiste. No completaremos lo que no se conoce.</p><Link to="/tratamientos/nuevo">Crear mi primer registro →</Link></div> : <div className="treatment-grid">{resource.data.items.map((t) => <Link className="treatment-card" to={`/tratamientos/${t.id}/${t.status === 'draft' ? 'revision' : 'indicaciones'}`} key={t.id}><span className={`badge ${t.status}`}>{statuses[t.status]}</span><h3>{t.title}</h3><p>{t.reason || 'Sin motivo declarado'}</p><div className="card-footer"><span>Revisión {t.currentRevision} · {dateLabel(t.updatedAt)}</span><ArrowUpRight aria-hidden="true" size={20}/></div></Link>)}</div>}<div className="pagination"><button disabled={offset === 0} onClick={() => setOffset((v) => Math.max(0, v - 20))}>Anterior</button><span>{resource.data.total} registros</span><button disabled={offset + 20 >= resource.data.total} onClick={() => setOffset((v) => v + 20)}>Siguiente</button></div></>}</>;
}

export function NewTreatment() {
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<TreatmentView | null>(null);
  const navigate = useNavigate();
  useUnsaved(!created && Boolean(title || reason));
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try { setCreated(await api<TreatmentView>('/treatments', json('POST', { title, reason }))); }
    catch (err) { setError(err); } finally { setBusy(false); }
  }
  return <><PageTitle eyebrow="NUEVO REGISTRO" title="Empecemos por lo que sabes"><p>Crearás un borrador. Puedes adjuntar un documento ficticio o completar las indicaciones manualmente en el siguiente paso.</p></PageTitle>{created ? <section className="panel"><h2>Borrador creado</h2><p>{created.title} ya está guardado en el servidor. Todavía no tiene indicaciones confirmadas.</p><button className="primary" onClick={() => navigate(`/tratamientos/${created.id}/revision`)}>Continuar con las indicaciones →</button></section> : <form className="panel narrow stack" onSubmit={submit}><label>Nombre del tratamiento<input autoFocus required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Un nombre para identificarlo"/></label><label>Motivo, si lo conoces <span className="optional">(opcional)</span><textarea maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)}/></label><p className="muted">No necesitas un diagnóstico para guardar tu registro. No incluyas información de personas reales en esta demo.</p><ErrorNotice error={error}/><button className="primary" disabled={busy}>{busy ? 'Creando…' : 'Crear borrador y continuar'}</button></form>}</>;
}

export function Instructions() {
  const { treatment, reload } = useTreatment();
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  async function updateStatus() {
    setBusy(true); setError(null);
    try { await api(`/treatments/${treatment.id}`, json('PATCH', { status: treatment.status === 'archived' ? 'following' : 'archived' })); reload(); }
    catch (err) { setError(err); } finally { setBusy(false); }
  }
  async function remove() {
    if (!window.confirm('¿Eliminar este tratamiento? Se borrarán sus documentos originales, extracciones, revisiones, análisis, evolución y preguntas. Esta acción no se puede deshacer.')) return;
    setBusy(true); setError(null);
    try { await api(`/treatments/${treatment.id}`, { method: 'DELETE' }); navigate('/tratamientos'); }
    catch (err) { setError(err); } finally { setBusy(false); }
  }
  return <div className="stack"><section className="panel"><div className="section-heading"><h2>Indicaciones registradas</h2><span className={`badge ${treatment.status}`}>{statuses[treatment.status]}</span></div><p className="notice">Revisadas por el paciente no significa validadas médicamente. Nunca cambies una indicación por una explicación de la app.</p>{!treatment.snapshot ? <p>No hay indicaciones confirmadas. <Link to={`/tratamientos/${treatment.id}/revision`}>Continuar la revisión</Link>.</p> : <>{treatment.snapshot.medications.map((med) => <article className="medication" key={med.id}><h3>{med.name.value || 'Medicamento sin especificar'}</h3><dl className="field-grid">{Object.entries({ Concentración: med.strength, Forma: med.form, Dosis: med.dose, Vía: med.route, Horario: med.schedule, Duración: med.duration, Instrucciones: med.instructions }).map(([label, field]) => <div key={label}><dt>{label}</dt><dd>{field.value || 'No especificado'}<small>{field.provenance === 'document' ? 'Documento' : 'Declarado por el paciente'}{field.issue ? ` · ${field.issue === 'missing' ? 'Dato ausente' : 'Dato ambiguo'}` : ''}</small>{field.evidence && <small>Pág. {field.evidence.page}: «{field.evidence.quote}»</small>}</dd></div>)}</dl><p className="muted">Referencia de catálogo: {med.referenceSelection ? `${med.referenceSelection.substanceId} · ${med.referenceSelection.routeCode} · ${med.referenceSelection.formulationCode}` : 'Sin identificación confirmada'}</p></article>)}{treatment.snapshot.generalInstructions.map((f, i) => <p className="preserve" key={i}>{f.value || 'Instrucción no especificada'} <small>({f.provenance === 'document' ? 'Documento' : 'Paciente'})</small></p>)}</>}<Link className="button" to={`/tratamientos/${treatment.id}/revision`}>{treatment.draft ? 'Continuar borrador separado' : 'Preparar una nueva revisión'}</Link></section><Documents treatmentId={treatment.id}/><RevisionHistory treatmentId={treatment.id}/><section className="panel"><h2>Organizar este registro</h2><p>Archivar solo organiza tu historial. No significa terminar el tratamiento ni resolver la enfermedad.</p><ErrorNotice error={error}/><div className="actions"><button disabled={busy || treatment.currentRevision === 0} onClick={updateStatus}>{treatment.status === 'archived' ? 'Volver a seguimiento' : 'Archivar'}</button><button className="danger" disabled={busy} onClick={remove}>Eliminar tratamiento y registros</button></div></section></div>;
}

function RevisionHistory({ treatmentId }: { treatmentId: string }) {
  const resource = useResource<Collection<unknown>>(`/treatments/${treatmentId}/revisions?limit=100`);
  return <details className="panel"><summary>Historial de revisiones confirmadas</summary><ResourceState {...resource} retry={resource.reload}/>{resource.data && <DataText value={resource.data.items}/>}</details>;
}
