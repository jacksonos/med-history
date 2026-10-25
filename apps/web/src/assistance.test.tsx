import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnalysisResult } from './assistance';

it('muestra HTML como texto y conserva la distinción demo/obsoleto', async () => {
  const hostile = '<img src=x onerror="alert(1)">';
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
    id: 'analysis', treatmentId: 'treatment', kind: 'explanation', status: 'ready', mode: 'demo', stale: true,
    result: { explanation: [{ text: hostile, quote: '<script>alert(1)</script>', chunkIds: ['fragmento-ficticio'] }], concernsToDiscuss: [], questions: [], limitations: ['Cobertura limitada'] },
    errorCode: null, createdAt: '2026-10-25T12:00:00Z',
  }))));
  const { container } = render(<AnalysisResult id="analysis" treatmentId="treatment"/>);
  expect(await screen.findByText(hostile)).toBeVisible();
  expect(container.querySelector('img,script')).toBeNull();
  expect(screen.getByText(/Resultado precargado de demostración/)).toHaveTextContent('OBSOLETO');
  expect(screen.getByText(/no proporcionó metadatos de fuentes/)).toBeVisible();
});
