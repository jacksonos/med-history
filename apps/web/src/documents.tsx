import { useEffect, useState, type FormEvent } from 'react';
import { TreatmentSnapshotSchema, type AnalysisView, type Collection, type DocumentView, type TreatmentSnapshot, type TreatmentView } from '@mmh/contracts';
import { api, json } from './api';
import { DataText, ErrorNotice, ResourceState, useResource } from './shared';

export interface Capabilities { aiMode: 'demo' | 'live'; liveAvailable: boolean; documentProcessingAvailable: boolean }
export const isPending = (value: { status: string }) => value.status === 'queued' || value.status === 'processing';
const documentStatus: Record<DocumentView['status'], string> = { queued: 'En cola', processing: 'Extrayendo texto', ready: 'Texto disponible · aún no revisado', needs_manual: 'Necesita ingreso manual', failed: 'No se pudo extraer' };

export function Documents({ treatmentId, onProposal }: { treatmentId: string; onProposal?: (value: TreatmentSnapshot) => void }) {
  const resource = useResource<TreatmentView & { documents?: DocumentView[] | Collection<DocumentView> }>(`/treatments/${treatmentId}`);
  const [file, setFile] = useState<File | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [uploaded, setUploaded] = useState<DocumentView | null>(null);
  const documents = Array.isArray(resource.data?.documents) ? resource.data.documents : resource.data?.documents?.items ?? [];
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!file || !acknowledged) return;
    setError(null);
    if (file.size > 10 * 1024 * 1024) { setError(new Error('El archivo supera el límite de 10 MiB.')); return; }
    setBusy(true);
    const form = new FormData(); form.append('file', file); form.append('syntheticAcknowledged', 'true');
    try { setUploaded(await api<DocumentView>(`/treatments/${treatmentId}/documents`, { method: 'POST', body: form })); resource.reload(); }
    catch (err) { setError(err); } finally { setBusy(false); }
  }
  const allDocuments = [...documents, ...(uploaded && !documents.some((d) => d.id === uploaded.id) ? [uploaded] : [])];
  return <section className="panel stack"><h2>Documento original</h2><p>El OCR es una lectura automática: no confirma indicaciones. Verifica también las anotaciones manuscritas y las imágenes del PDF.</p><form onSubmit={upload} className="stack"><label>Foto o PDF ficticio<input type="file" accept="image/png,image/jpeg,application/pdf" required onChange={(e) => setFile(e.target.files?.[0] ?? null)}/><small>PNG, JPEG o PDF · hasta 10 MiB y 5 páginas.</small></label><label className="check"><input type="checkbox" required checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)}/> Confirmo que el documento contiene solo datos ficticios. Esto no lo anonimiza.</label><ErrorNotice error={error}/><button disabled={busy || !file || !acknowledged}>{busy ? 'Subiendo…' : 'Subir documento'}</button></form><ResourceState {...resource} retry={resource.reload}/>{resource.data && allDocuments.length === 0 && <p className="muted">Sin documentos adjuntos. El registro manual sigue disponible.</p>}{allDocuments.map((doc) => <Document key={doc.id} id={doc.id} onProposal={onProposal} onDeleted={() => { if (uploaded?.id === doc.id) setUploaded(null); resource.reload(); }}/>)}</section>;
}

function Document({ id, onDeleted, onProposal }: { id: string; onDeleted: () => void; onProposal?: (value: TreatmentSnapshot) => void }) {
  const resource = useResource<DocumentView>(`/documents/${id}`, isPending);
  const capabilities = useResource<Capabilities>('/capabilities');
  const [accepted, setAccepted] = useState(false);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const doc = resource.data;
  useEffect(() => { setAccepted(false); setAnalysisId(null); }, [doc?.generation]);
  async function action(kind: 'delete' | 'retry' | 'structure') {
    if (kind === 'delete' && !window.confirm('¿Eliminar el archivo original, su extracción y propuestas derivadas? Las indicaciones ya incorporadas a revisiones y tus vivencias seguirán en el historial. Para borrarlas, elimina el tratamiento completo.')) return;
    setBusy(kind); setError(null);
    try {
      if (kind === 'delete') { await api(`/documents/${id}`, { method: 'DELETE' }); onDeleted(); }
      else if (kind === 'retry') { await api(`/documents/${id}/retry`, json('POST', {})); resource.reload(); }
      else { const result = await api<{ analysisId: string }>(`/documents/${id}/structure`, json('POST', { externalProcessingAccepted: accepted })); setAnalysisId(result.analysisId); setAccepted(false); }
    } catch (err) { setError(err); } finally { setBusy(null); }
  }
  return <article className="document stack"><ResourceState {...resource} retry={resource.reload}/>{doc && <><h3>{doc.filename}</h3><p role="status">{documentStatus[doc.status]}</p>{doc.errorCode && <p className="notice error">Código: {doc.errorCode}. Puedes continuar manualmente.</p>}<a className="button" href={`/api/v1/documents/${id}/original`} target="_blank" rel="noreferrer">Abrir / descargar original</a>{doc.extraction && <><details open><summary>Texto OCR sin revisar</summary><p className="ocr preserve">{doc.extraction.text || 'No se reconoció texto.'}</p></details>{doc.extraction.warnings.map((warning, i) => <p className="notice" key={i}>{warning}</p>)}</>}{onProposal && doc.extraction && <section className="stack"><h4>Proponer campos desde el documento</h4><ResourceState {...capabilities} retry={capabilities.reload}/><p className="notice">{capabilities.data?.aiMode === 'live' ? 'Modo live: se enviará a OpenAI el texto OCR aún NO revisado, que puede contener errores e identificadores, para proponer campos. No se envía la foto/PDF. Ejecutar localmente no evita la retención del proveedor.' : 'Modo demostración: solo habrá una propuesta precargada si el caso ficticio coincide exactamente. No se presenta como procesamiento live.'}</p>{capabilities.data?.aiMode === 'live' && <label className="check"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)}/> Autorizo este envío externo de texto OCR sin revisar.</label>}<button disabled={busy === 'structure' || !capabilities.data || (capabilities.data.aiMode === 'live' && !accepted)} onClick={() => action('structure')}>{busy === 'structure' ? 'Solicitando…' : 'Solicitar propuesta de campos'}</button>{analysisId && <StructureProposal id={analysisId} onAccept={onProposal}/>}</section>}<ErrorNotice error={error}/><div className="actions">{(doc.status === 'failed' || doc.status === 'needs_manual') && <button disabled={busy === 'retry'} onClick={() => action('retry')}>Reintentar extracción</button>}<button className="text-danger" disabled={busy === 'delete'} onClick={() => action('delete')}>Eliminar documento</button></div></>}</article>;
}

function StructureProposal({ id, onAccept }: { id: string; onAccept: (value: TreatmentSnapshot) => void }) {
  const resource = useResource<AnalysisView>(`/analyses/${id}`, isPending);
  const analysis = resource.data;
  const result = TreatmentSnapshotSchema.safeParse(analysis?.result);
  return <div className="proposal"><ResourceState {...resource} retry={resource.reload}/>{analysis && <><p className="badge">{analysis.mode === 'demo' ? 'Resultado precargado de demostración' : 'Live · propuesta generada'}{analysis.stale ? ' · OBSOLETA' : ''}</p><p role="status">{isPending(analysis) ? 'Preparando propuesta…' : analysis.status === 'failed' ? `No se pudo preparar (${analysis.errorCode ?? 'error'}). Sigue manualmente.` : 'Propuesta disponible; no confirmada ni guardada.'}</p>{analysis.status === 'ready' && result.success && <><DataText value={result.data}/><button disabled={analysis.stale} onClick={() => onAccept(result.data)}>Incorporar propuesta al formulario para revisarla</button></>}</>}</div>;
}
