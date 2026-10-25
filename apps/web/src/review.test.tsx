import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { emptySnapshot, type TreatmentView } from '@mmh/contracts';
import { Review } from './review';

const context = vi.hoisted(() => ({ treatment: null as TreatmentView | null, update: vi.fn(), reload: vi.fn() }));
vi.mock('./App', () => ({ useTreatment: () => context }));

const base: TreatmentView = { id: '00000000-0000-4000-8000-000000000001', title: 'Registro ficticio', reason: '', status: 'following', currentRevision: 3, snapshot: emptySnapshot(), draft: null, createdAt: '2026-10-25T12:00:00Z', updatedAt: '2026-10-25T12:00:00Z' };
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
function renderReview() {
  const router = createMemoryRouter([{ path: '/', element: <Review/> }]);
  return render(<RouterProvider router={router}/>);
}

beforeEach(() => { context.treatment = structuredClone(base); });

describe('revisión y guardado separado', () => {
  it('preserva el borrador en pantalla ante error y no habilita confirmación', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') return response({ code: 'UNAVAILABLE', message: 'Servidor no disponible' }, 503);
      if (url.endsWith('/reference-catalog')) return response({ items: [] });
      return response({ ...base, documents: [] });
    }));
    renderReview();
    fireEvent.click(screen.getByRole('button', { name: '+ Añadir medicamento manualmente' }));
    fireEvent.change(screen.getByRole('textbox', { name: /^Nombre/ }), { target: { value: 'Nombre ficticio' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Motivo de esta revisión/ }), { target: { value: 'Comparé con el original' } });
    expect(screen.getByRole('button', { name: 'Confirmar borrador guardado' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador sin confirmar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Servidor no disponible');
    expect(screen.getByRole('textbox', { name: /^Nombre/ })).toHaveValue('Nombre ficticio');
    expect(screen.getByRole('textbox', { name: /Dosis indicada/ })).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Confirmar borrador guardado' })).toBeDisabled();
  });

  it('guarda con CAS y confirma solamente la versión persistida, sin inventar dosis', async () => {
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') { const input = JSON.parse(init.body as string); return response({ ...base, draft: { version: 1, baseRevision: 3, snapshot: input.snapshot } }); }
      if (init?.method === 'POST' && url.endsWith('/revisions')) return response({ ...base, currentRevision: 4, draft: null });
      if (url.endsWith('/reference-catalog')) return response({ items: [] });
      return response({ ...base, documents: [] });
    });
    vi.stubGlobal('fetch', fetcher); vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderReview();
    fireEvent.click(screen.getByRole('button', { name: '+ Añadir medicamento manualmente' }));
    fireEvent.change(screen.getByRole('textbox', { name: /^Nombre/ }), { target: { value: 'Medicamento ficticio' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Motivo de esta revisión/ }), { target: { value: 'Revisión personal' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador sin confirmar' }));
    await screen.findByText('Borrador guardado en el servidor. No es una revisión confirmada.');
    const save = fetcher.mock.calls.find(([, init]) => init?.method === 'PUT')!;
    const body = JSON.parse(save[1]!.body as string);
    expect(body).toMatchObject({ expectedDraftVersion: 0, baseRevision: 3 });
    expect(body.snapshot.medications[0].dose).toMatchObject({ value: null, issue: 'missing', provenance: 'patient' });
    expect(body.snapshot.medications[0].referenceSelection).toBeNull();
    const confirm = screen.getByRole('button', { name: 'Confirmar borrador guardado' });
    await waitFor(() => expect(confirm).toBeEnabled());
    fireEvent.click(confirm);
    await screen.findByText('Revisión confirmada y guardada.');
    const request = fetcher.mock.calls.find(([url, init]) => url.endsWith('/revisions') && init?.method === 'POST')!;
    expect(JSON.parse(request[1]!.body as string)).toEqual({ expectedRevision: 3, expectedDraftVersion: 1, changeReason: 'Revisión personal' });
  });
});
