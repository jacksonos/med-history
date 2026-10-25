import type { ApiError } from '@mmh/contracts';

export class RequestError extends Error {
  constructor(public status: number, public details: Partial<ApiError>) {
    super(details.message || `No se pudo completar la solicitud (${status}).`);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...init,
      headers: { ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
      cache: 'no-store',
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new Error('No se pudo conectar con el servidor. Conservamos los cambios en esta pantalla; vuelve a intentarlo.');
  }
  if (!response.ok) {
    const details = await response.json().catch(() => ({})) as Partial<ApiError>;
    throw new RequestError(response.status, {
      ...details,
      message: response.status === 409
        ? 'Hay una versión más reciente en el servidor. Tus cambios siguen aquí. Abre otra pestaña para comparar antes de recargar.'
        : details.message || (response.status === 503 ? 'Servicio temporalmente no disponible. Puedes seguir con el registro manual y tu evolución.' : undefined),
    });
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });
