import { expect, test } from '@playwright/test';

const id = 'fa8bbd82-1b75-430e-a36b-35426bb16e30';
const requestId = '34b8d80c-c948-4c97-befd-7877fb905236';
const unknown = { status: 'unknown', items: [] };

test.describe('Web con API simulada: no sustituye integración PostgreSQL', () => {
  test('renders API-provided treatment titles as text, not executable HTML', async ({ page }) => {
    const title = '<img src=x onerror="window.untrustedExecuted=true">';
    const treatment = {
      id, title, reason: 'Caso ficticio', status: 'draft', currentRevision: 0,
      snapshot: null, draft: { version: 0, baseRevision: 0, snapshot: { medications: [], generalInstructions: [] } },
      createdAt: '2026-10-25T10:00:00Z', updatedAt: '2026-10-25T10:00:00Z',
    };
    await page.route('**/api/v1/**', async route => {
      const path = new URL(route.request().url()).pathname;
      const body = path.endsWith('/capabilities')
        ? { aiMode: 'demo', liveAvailable: false, documentProcessingAvailable: false }
        : path.endsWith('/context')
          ? { version: 0, allergies: unknown, conditions: unknown, otherMedications: unknown }
          : path.endsWith('/health') ? { status: 'ok' }
            : { items: [treatment], total: 1 };
      await route.fulfill({ json: body });
    });
    await page.goto('/tratamientos');
    await expect(page.getByText(title, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).untrustedExecuted)).toBeUndefined();
  });

  test('shows a real API failure instead of substituting a fake success', async ({ page }) => {
    await page.route('**/api/v1/**', async route => {
      if (new URL(route.request().url()).pathname.endsWith('/capabilities')) {
        await route.fulfill({ json: { aiMode: 'demo', liveAvailable: false, documentProcessingAvailable: false } });
      } else {
        await route.fulfill({ status: 503, json: { code: 'DATABASE_UNAVAILABLE', message: 'Base de datos de prueba no disponible.', requestId } });
      }
    });
    await page.goto('/tratamientos');
    await expect(page.getByText(/Base de datos de prueba no disponible/)).toBeVisible();
  });

  test('keeps the treatment list inside a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.route('**/api/v1/**', route => route.fulfill({ json:
      new URL(route.request().url()).pathname.endsWith('/capabilities')
        ? { aiMode: 'demo', liveAvailable: false, documentProcessingAvailable: false }
        : { items: [], total: 0 },
    }));
    await page.goto('/tratamientos');
    await expect(page.getByRole('link', { name: /nuevo tratamiento/i }).first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
