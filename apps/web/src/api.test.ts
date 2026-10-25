import { describe, expect, it, vi } from 'vitest';
import { api, json, RequestError } from './api';

describe('cliente API real', () => {
  it('no convierte un fallo de red en éxito', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')));
    await expect(api('/treatments', json('POST', { title: 'Ficticio', reason: '' }))).rejects.toThrow('Conservamos los cambios');
  });
  it('conserva código y referencia y explica conflictos sin descartar datos', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'VERSION_CONFLICT', message: 'conflicto', requestId: 'request-id' }), { status: 409 })));
    const error = await api('/context').catch((err) => err);
    expect(error).toBeInstanceOf(RequestError);
    if (!(error instanceof RequestError)) throw new Error('Se esperaba un error HTTP tipado.');
    expect(error.details).toMatchObject({ code: 'VERSION_CONFLICT', requestId: 'request-id' });
    expect(error.message).toContain('Tus cambios siguen aquí');
  });
  it('tolera errores no JSON sin presentar HTML del proxy', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>unavailable</html>', { status: 503 })));
    await expect(api('/capabilities')).rejects.toThrow('registro manual');
  });
  it('deja al navegador poner el boundary multipart', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetcher);
    const form = new FormData(); form.set('syntheticAcknowledged', 'true');
    await api('/treatments/id/documents', { method: 'POST', body: form });
    expect(fetcher.mock.calls[0][0]).toBe('/api/v1/treatments/id/documents');
    expect(fetcher.mock.calls[0][1].headers).toEqual({});
  });
});
