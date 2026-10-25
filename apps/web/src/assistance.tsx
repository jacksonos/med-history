import { useState, type FormEvent } from 'react';
import { AssistanceResultSchema, type AnalysisView, type ClinicalClaim, type Collection } from '@mmh/contracts';
import { api, json } from './api';
import { useTreatment } from './App';
import { type Capabilities, isPending } from './documents';
import { DataText, ErrorNotice, ResourceState, dateLabel, useResource } from './shared';

type AnalysisWithSources = AnalysisView & { sourceIds?: string[]; sources?: Array<{ id?: string; sourceId?: string; source_id?: string }>; sourceSnapshot?: Array<{ id?: string; sourceId?: string; source_id?: string }> };

export function Assistance() {
  const { treatment } = useTreatment();
  const capabilities = useResource<Capabilities>('/capabilities');
  const history = useResource<typeof treatment & { analyses?: AnalysisView[] | Collection<AnalysisView> }>(`/treatments/${treatment.id}`);
  const [kind, setKind] = useState<'explanation' | 'questions'>('explanation');
  const [question, setQuestion] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      const result = await api<{ analysisId: string }>(`/treatments/${treatment.id}/analyses`, json('POST', { kind, patientQuestion: question.trim() ? question : null, externalProcessingAccepted: accepted }));
      setAnalysisId(result.analysisId); setAccepted(false); history.reload();
    } catch (err) { setError(err); } finally { setBusy(false); }
  }
  const analyses = Array.isArray(history.data?.analyses) ? history.data.analyses : history.data?.analyses?.items ?? [];
  return <div className="stack"><section className="panel stack"><h2>Comprender, sin cambiar tus indicaciones</h2><p>Información educativa respaldada por el pequeño catálogo documental disponible. Las fuentes españolas no prueban equivalencia con un producto peruano ni garantizan que una interpretación sea correcta.</p>{treatment.currentRevision === 0 && <p className="notice">Primero revisa, guarda y confirma las indicaciones. Mientras tanto puedes registrar tu evolución.</p>}<form onSubmit={submit} className="stack"><label>¿Qué quieres preparar?<select value={kind} onChange={(e) => { setKind(e.target.value as typeof kind); setAccepted(false); }}><option value="explanation">Explicación del tratamiento</option><option value="questions">Preguntas para el profesional</option></select></label><label>Tu duda <span className="optional">(opcional)</span><textarea maxLength={500} value={question} onChange={(e) => { setQuestion(e.target.value); setAccepted(false); }}/></label><ResourceState {...capabilities} retry={capabilities.reload}/><div className="notice">{capabilities.data?.aiMode === 'live' ? <><strong>Envío externo · datos confirmados y contexto.</strong><p>Esta operación enviará a OpenAI tus indicaciones confirmadas, el contexto de salud y esta pregunta para generar material educativo. No incluye la foto/PDF. El proveedor puede tener políticas de retención; una instalación local no implica privacidad total. Puedes cancelar sin enviar nada.</p></> : <><strong>Modo demostración.</strong><p>No se realizan llamadas de pago. Solo se devuelve material precargado para casos ficticios con coincidencia exacta; los cambios pueden dejar el caso sin resultado.</p></>}</div>{capabilities.data?.aiMode === 'live' && <label className="check"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)}/> Autorizo este envío externo para {kind === 'explanation' ? 'una explicación' : 'preguntas'}.</label>}<ErrorNotice error={error}/><button className="primary" disabled={busy || treatment.currentRevision === 0 || !capabilities.data || (capabilities.data.aiMode === 'live' && !accepted)}>{busy ? 'Solicitando…' : 'Solicitar material educativo'}</button></form></section>{analysisId && <AnalysisResult id={analysisId} treatmentId={treatment.id}/>}<section className="panel"><h2>Análisis anteriores</h2><ResourceState {...history} retry={history.reload}/>{analyses.length === 0 ? <p className="muted">No hay análisis previos disponibles.</p> : analyses.filter((a) => a.kind !== 'structure').map((analysis) => <button key={analysis.id} onClick={() => setAnalysisId(analysis.id)}>{analysis.kind === 'questions' ? 'Preguntas' : 'Explicación'} · {dateLabel(analysis.createdAt)} · {analysis.mode === 'demo' ? 'Demostración precargada' : 'Live'}{analysis.stale ? ' · Obsoleto' : ''}</button>)}</section></div>;
}

export function AnalysisResult({ id, treatmentId }: { id: string; treatmentId: string }) {
  const resource = useResource<AnalysisWithSources>(`/analyses/${id}`, isPending);
  const analysis = resource.data;
  const parsed = AssistanceResultSchema.safeParse(analysis?.result);
  const sourceIds = [...new Set([...(analysis?.sourceIds ?? []), ...[...(analysis?.sources ?? []), ...(analysis?.sourceSnapshot ?? [])].map((s) => s.sourceId ?? s.source_id ?? s.id).filter((s): s is string => Boolean(s))])];
  return <section className="panel stack"><h2>Borrador educativo</h2><ResourceState {...resource} retry={resource.reload}/>{analysis && <><p className="badge">{analysis.mode === 'demo' ? 'Resultado precargado de demostración' : 'Live · generado por IA'}{analysis.stale ? ' · OBSOLETO: cambió la información de referencia' : ''}</p><p role="status">{isPending(analysis) ? 'Preparando el resultado…' : analysis.status === 'failed' ? `No se pudo generar (${analysis.errorCode ?? 'error'}). La revisión manual y el seguimiento siguen disponibles.` : 'Contrasta este material con el profesional. No es una indicación médica.'}</p>{analysis.status === 'ready' && parsed.success && <>{parsed.data.explanation.map((claim, i) => <Claim key={i} claim={claim}/>)}{parsed.data.concernsToDiscuss.length > 0 && <h3>Aspectos para conversar, no conclusiones clínicas</h3>}{parsed.data.concernsToDiscuss.map((claim, i) => <Claim key={i} claim={claim}/>)}<h3>Preguntas sugeridas</h3>{parsed.data.questions.map((text, i) => <SuggestedQuestion key={`${id}-${i}`} text={text} analysisId={id} treatmentId={treatmentId} stale={analysis.stale}/>)}<h3>Límites del resultado</h3><ul>{parsed.data.limitations.map((text, i) => <li key={i}>{text}</li>)}</ul><h3>Fuentes documentales</h3>{sourceIds.length ? sourceIds.map((sourceId) => <Source key={sourceId} id={sourceId}/>) : <p className="notice">El servidor no proporcionó metadatos de fuentes para este resultado. No lo consideres una explicación verificable.</p>}</>}</>}</section>;
}

function Claim({ claim }: { claim: ClinicalClaim }) {
  return <article className="claim"><p className="preserve">{claim.text}</p><blockquote className="preserve">«{claim.quote}»</blockquote><small>Fragmentos citados: {claim.chunkIds.join(', ')}</small></article>;
}

function SuggestedQuestion({ text, analysisId, treatmentId, stale }: { text: string; analysisId: string; treatmentId: string; stale: boolean }) {
  const [value, setValue] = useState(text);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function save() {
    setBusy(true); setError(null);
    try { await api(`/treatments/${treatmentId}/questions`, json('POST', { text: value, origin: 'app', analysisId })); setSaved(true); }
    catch (err) { setError(err); } finally { setBusy(false); }
  }
  return <div className="suggestion stack"><label>Revisar pregunta sugerida<textarea maxLength={500} value={value} onChange={(e) => { setValue(e.target.value); setSaved(false); }}/></label><ErrorNotice error={error}/><button disabled={busy || saved || stale || !value.trim()} onClick={save}>{saved ? 'Pregunta guardada en tu consulta' : busy ? 'Guardando…' : 'Guardar esta pregunta'}</button></div>;
}

function Source({ id }: { id: string }) {
  const resource = useResource<Record<string, unknown>>(`/sources/${encodeURIComponent(id)}`);
  return <details className="source"><summary>Consultar fuente: {id}</summary><ResourceState {...resource} retry={resource.reload}/>{resource.data && <DataText value={resource.data}/>}</details>;
}
