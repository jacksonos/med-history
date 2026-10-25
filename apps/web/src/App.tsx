import { createBrowserRouter, Link, NavLink, Outlet, useOutletContext, useParams } from 'react-router-dom';
import { Activity, BookOpen, ClipboardList, HeartPulse, Home, Plus, UserRound } from 'lucide-react';
import type { TreatmentView } from '@mmh/contracts';
import { useResource, PageTitle, ResourceState } from './shared';
import { Treatments, NewTreatment, Instructions } from './treatments';
import { Review } from './review';
import { Assistance } from './assistance';
import { Evolution } from './evolution';
import { Consultation } from './consultation';
import { Context } from './context';

function Shell() {
  return <div className="app-shell"><a className="skip-link" href="#contenido">Saltar al contenido</a><aside className="sidebar"><Link to="/" className="brand"><span className="brand-icon"><HeartPulse aria-hidden="true"/></span><span>Mi historia<small>MY MED HISTORY</small></span></Link><p className="sidebar-caption">TU ESPACIO DE CUIDADO</p><nav aria-label="Navegación principal"><NavLink to="/" end><Home size={19} aria-hidden="true"/> Inicio</NavLink><NavLink to="/tratamientos"><ClipboardList size={19} aria-hidden="true"/> Mis tratamientos</NavLink><NavLink to="/contexto"><UserRound size={19} aria-hidden="true"/> Mi contexto de salud</NavLink></nav><div className="sidebar-note"><BookOpen size={22} aria-hidden="true"/><p>Una historia mejor organizada.<br/>Una consulta mejor preparada.</p></div><span className="demo-label">Instalación local · Datos ficticios</span></aside><div className="workspace"><header className="topbar"><span><span className="status-dot"/> Tu bitácora personal</span><Link className="button primary compact" to="/tratamientos/nuevo"><Plus size={17} aria-hidden="true"/> Nuevo tratamiento</Link></header><main id="contenido" tabIndex={-1}><Outlet/></main><footer><strong>Tu registro, no una indicación médica.</strong> La app no monitoriza tu salud, no cambia medicamentos ni garantiza seguridad. Si crees estar ante una urgencia, busca atención profesional inmediata; no esperes a la próxima cita. Demo: usa solo datos ficticios.</footer></div></div>;
}

type TreatmentContext = { treatment: TreatmentView; reload: () => void; update: (treatment: TreatmentView) => void };
export const useTreatment = () => useOutletContext<TreatmentContext>();

function TreatmentLayout() {
  const { id } = useParams();
  const resource = useResource<TreatmentView>(`/treatments/${id}`);
  if (!resource.data) return <><PageTitle title="Tu tratamiento"/><ResourceState {...resource} retry={resource.reload}/></>;
  const treatment = resource.data;
  return <><Link className="back-link" to="/tratamientos">← Mis tratamientos</Link><PageTitle eyebrow={`REGISTRO PERSONAL · REVISIÓN ${treatment.currentRevision}`} title={treatment.title}><p>{treatment.reason || 'Sin motivo declarado.'}</p></PageTitle><nav className="tabs" aria-label="Secciones del tratamiento">{[['indicaciones', 'Indicaciones'], ['revision', 'Revisar'], ['comprender', 'Comprender'], ['evolucion', 'Evolución'], ['consulta', 'Preparar consulta']].map(([path, label]) => <NavLink key={path} to={`/tratamientos/${id}/${path}`}>{label}</NavLink>)}</nav><Outlet context={{ treatment, reload: resource.reload, update: resource.update } satisfies TreatmentContext}/></>;
}

function ChooseTreatment() {
  return <><PageTitle title="Primero, elige un tratamiento"><p>Las explicaciones, vivencias y preguntas se guardan dentro de su tratamiento.</p></PageTitle><Treatments embedded/></>;
}

export const router = createBrowserRouter([{ element: <Shell/>, children: [
  { path: '/', element: <Treatments home/> },
  { path: '/tratamientos', element: <Treatments/> },
  { path: '/tratamientos/nuevo', element: <NewTreatment/> },
  { path: '/contexto', element: <Context/> },
  ...['comprender', 'evolucion', 'consulta'].map((path) => ({ path: `/${path}`, element: <ChooseTreatment/> })),
  { path: '/tratamientos/:id', element: <TreatmentLayout/>, children: [
    { index: true, element: <Instructions/> },
    { path: 'indicaciones', element: <Instructions/> },
    { path: 'revision', element: <Review/> },
    { path: 'comprender', element: <Assistance/> },
    { path: 'evolucion', element: <Evolution/> },
    { path: 'consulta', element: <Consultation/> },
  ] },
  { path: '*', element: <><PageTitle title="No encontramos esa página"/><Link to="/">Volver al inicio</Link></> },
] }]);
