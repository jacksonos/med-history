import { useState, type FormEvent } from 'react';
import type { Collection, EvolutionEntry, Question, TreatmentSnapshot } from '@mmh/contracts';
import { api, json } from './api';
import { useTreatment } from './App';
import { DataText, ErrorNotice, ResourceState, useResource, useUnsaved } from './shared';

interface SummaryView {
  title: string; from: string; to: string; timeZone: string;
  currentRevision: { revision: number; snapshot: TreatmentSnapshot } | null;
  changes: unknown[]; evolution: EvolutionEntry[]; questions: Question[]; limitations: string[]; notice: string;
}

export function Consultation() {
  const { treatment } = useTreatment();
  const [offset, setOffset] = useState(0);
  const resource = useResource<Collection<Question>>(`/treatments/${treatment.id}/questions?limit=20&offset=${offset}`);
  const [editing, setEditing] = useState<Question | null>(null);
  const [text, setText] = useState('');
  const [status, setStatus] = useState<Question['status']>('pending');
  const [answer, setAnswer] = useState('');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState('');
  const today = new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(today);
  const [summary, setSummary] = useState<SummaryView | null>(null);
  const [summaryError, setSummaryError] = useState<unknown>(null);
  const [summaryBusy, setSummaryBusy] = useState(false);
  useUnsaved(dirty);
  function reset() { setEditing(null); setText(''); setAnswer(''); setStatus('pending'); setDirty(false); }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null); setMessage('');
    try {
      await api(editing ? `/questions/${editing.id}` : `/treatments/${treatment.id}/questions`, json(editing ? 'PATCH' : 'POST', editing ? { text, status, reportedAnswer: answer || null } : { text, origin: 'patient', analysisId: null }));
      reset(); setMessage('Pregunta guardada.'); setSummary(null); resource.reload();
    } catch (err) { setError(err); } finally { setBusy(false); }
  }
  async function remove(question: Question) {
    if (!window.confirm('¿Eliminar esta pregunta y su respuesta declarada? Dejarán de aparecer en el resumen.')) return;
    setDeleting(question.id); setError(null);
    try { await api(`/questions/${question.id}`, { method: 'DELETE' }); if (editing?.id === question.id) reset(); setSummary(null); resource.reload(); }
    catch (err) { setError(err); } finally { setDeleting(null); }
  }
  async function summarize(event: FormEvent) {
    event.preventDefault(); setSummaryBusy(true); setSummaryError(null); setSummary(null);
    try { setSummary(await api<SummaryView>(`/treatments/${treatment.id}/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)); }
    catch (err) { setSummaryError(err); } finally { setSummaryBusy(false); }
  }
  return <div className="stack"><section className="panel stack"><h2>Que tus dudas también lleguen a la consulta</h2><p>No todas las dudas pueden esperar a una cita: si necesitas aclarar una indicación antes de seguirla, contacta a tu profesional.</p><form onSubmit={save} className="stack" onChange={() => setDirty(true)}><label>{editing ? 'Corregir pregunta' : 'Añadir una pregunta propia'}<textarea required maxLength={500} value={text} onChange={(e) => setText(e.target.value)}/></label>{editing && <><label>Estado<select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="pending">Pendiente de conversar</option><option value="discussed">Conversada</option></select></label><label>Respuesta según tu relato <span className="optional">(opcional; no verificada médicamente)</span><textarea maxLength={2000} value={answer} onChange={(e) => setAnswer(e.target.value)}/></label></>}<ErrorNotice error={error}/><p role="status">{message}</p><div className="actions"><button className="primary" disabled={busy}>{busy ? 'Guardando…' : editing ? 'Guardar cambios de la pregunta' : 'Guardar pregunta'}</button>{editing && <button type="button" onClick={() => { if (!dirty || window.confirm('¿Descartar la edición de la pregunta?')) reset(); }}>Cancelar edición</button>}</div></form><ResourceState {...resource} retry={resource.reload}/>{resource.data?.items.length === 0 && <p className="muted">Tu lista de preguntas está vacía.</p>}{resource.data?.items.map((question) => <article className="question" key={question.id}><span className="badge">{question.status === 'pending' ? 'Pendiente' : 'Conversada'} · {question.origin === 'patient' ? 'Pregunta propia' : 'Sugerencia revisada'}</span><h3 className="preserve">{question.text}</h3>{question.reportedAnswer && <p className="preserve">Respuesta declarada por ti: {question.reportedAnswer}</p>}<div className="actions"><button onClick={() => { if (dirty && !window.confirm('¿Descartar los cambios del formulario para editar esta pregunta?')) return; setEditing(question); setText(question.text); setAnswer(question.reportedAnswer ?? ''); setStatus(question.status); setDirty(false); }}>Editar / marcar como conversada</button><button className="text-danger" disabled={deleting === question.id} onClick={() => remove(question)}>Eliminar pregunta</button></div></article>)}{resource.data && <div className="pagination"><button disabled={!offset} onClick={() => setOffset((v) => v - 20)}>Anterior</button><span>{resource.data.total} preguntas</span><button disabled={offset + 20 >= resource.data.total} onClick={() => setOffset((v) => v + 20)}>Siguiente</button></div>}</section><section className="panel stack summary-section"><h2>Tu resumen para conversar</h2><p>Se organiza desde tus registros guardados, sin generar conclusiones diagnósticas. Contrástalo con las anotaciones originales antes de mostrarlo.</p><form className="stack no-print" onSubmit={summarize}><div className="form-grid"><label>Desde (fecha en Lima)<input type="date" required value={from} max={to} onChange={(e) => { setFrom(e.target.value); setSummary(null); }}/></label><label>Hasta, inclusive<input type="date" required value={to} min={from} onChange={(e) => { setTo(e.target.value); setSummary(null); }}/></label></div><ErrorNotice error={summaryError}/><button disabled={summaryBusy}>{summaryBusy ? 'Preparando…' : 'Consultar resumen del servidor'}</button></form>{summary && <><h3>{summary.title}</h3><p>Período: {summary.from} a {summary.to} · {summary.timeZone}</p><h3>Indicaciones vigentes · revisión {summary.currentRevision?.revision ?? 0}</h3>{summary.currentRevision ? <DataText value={summary.currentRevision.snapshot}/> : <p>Sin indicaciones confirmadas.</p>}<h3>Cambios de indicaciones del período</h3>{summary.changes.length ? <DataText value={summary.changes}/> : <p>Sin cambios registrados en este período.</p>}<h3>Vivencias registradas, sin inferir causalidad</h3>{summary.evolution.length ? <DataText value={summary.evolution}/> : <p>Sin vivencias registradas en este período.</p>}<h3>Preguntas guardadas</h3>{summary.questions.length ? <ul>{summary.questions.map((q) => <li key={q.id}><strong>{q.text}</strong> · {q.status === 'pending' ? 'Pendiente' : 'Conversada'}{q.reportedAnswer && <p>Respuesta declarada: {q.reportedAnswer}</p>}</li>)}</ul> : <p>Sin preguntas guardadas.</p>}<ul>{summary.limitations.map((item, i) => <li key={i}>{item}</li>)}</ul><p className="notice">{summary.notice}</p><button className="no-print" onClick={() => window.print()}>Imprimir / guardar PDF desde el navegador</button></>}</section></div>;
}
