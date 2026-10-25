import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useBlocker } from 'react-router-dom';
import { api, RequestError } from './api';

export function ErrorNotice({ error }: { error: unknown }) {
  if (!error) return null;
  return <div className="notice error" role="alert"><strong>No se completó la operación.</strong><p>{error instanceof Error ? error.message : 'Ocurrió un error inesperado.'}</p>{error instanceof RequestError && error.details.requestId && <small>Referencia: {error.details.requestId}</small>}</div>;
}

export function useResource<T>(path: string | null, pending?: (value: T) => boolean) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    setData(null);
    setError(null);
    if (!path) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      setLoading(true);
      try {
        const result = await api<T>(path!, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setData(result);
        setError(null);
        if (pendingRef.current?.(result)) timer = setTimeout(load, 2000);
      } catch (err) {
        if (!controller.signal.aborted) setError(err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [path, version]);
  return { data, error, loading, reload, update: setData };
}

export function useUnsaved(dirty: boolean) {
  const blocker = useBlocker(dirty);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm('Hay cambios sin guardar. ¿Salir y descartarlos?')) blocker.proceed();
    else blocker.reset();
  }, [blocker]);
  useEffect(() => {
    if (!dirty) return;
    const listener = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', listener);
    return () => window.removeEventListener('beforeunload', listener);
  }, [dirty]);
}

export function ResourceState({ loading, error, retry }: { loading: boolean; error: unknown; retry: () => void }) {
  return <><span role="status">{loading ? 'Cargando…' : ''}</span><ErrorNotice error={error}/>{!!error && <button onClick={retry}>Reintentar lectura</button>}</>;
}

export function PageTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return <header className="page-title">{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{children}</header>;
}

export function DataText({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="muted">Sin información</span>;
  if (Array.isArray(value)) return <ul className="data-list">{value.map((item, i) => <li key={i}><DataText value={item}/></li>)}</ul>;
  if (typeof value === 'object') return <dl className="data-object">{Object.entries(value).map(([key, item]) => <div key={key}><dt>{key}</dt><dd><DataText value={item}/></dd></div>)}</dl>;
  return <span className="preserve">{String(value)}</span>;
}

export function dateLabel(value: string) {
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima' }).format(new Date(value));
}
