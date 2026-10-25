import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DocumentExtractionSchema } from '../src/index.js';

describe('Python / TypeScript document contract', () => {
  it('accepts the shared fixture produced by the Python service', () => {
    const fixture = JSON.parse(readFileSync(new URL('../../../services/documents/tests/fixtures/document-extraction.json', import.meta.url), 'utf8'));
    expect(DocumentExtractionSchema.parse(fixture)).toEqual(fixture);
  });
});
