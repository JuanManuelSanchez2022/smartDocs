import { describe, it, expect } from 'vitest';
import { RecordReconstructor } from './RecordReconstructor';

describe('RecordReconstructor', () => {
  it('reconstructs a price-list record from a compact OCR line', () => {
    const raw = 'ACEITE "CAÑUELAS" X 900 CC- 3740.00';
    const records = RecordReconstructor.reconstruct(raw);

    expect(records).toHaveLength(1);
    expect(records[0].rawText).toBe(raw);
    expect(records[0].product).toBe('ACEITE');
    expect(records[0].brand).toBe('CAÑUELAS');
    expect(records[0].presentation).toBe('X 900 CC');
    expect(records[0].price).toBe(3740);
  });

  it('keeps missing fields as missing and does not emit learning items for them', () => {
    const raw = 'ARROZ X KG- 1138.50';
    const records = RecordReconstructor.reconstruct(raw);
    expect(records).toHaveLength(1);
    expect(records[0].fields.codigo.status).toBe('MISSING');
    expect(records[0].fields.tipo.status).toBe('MISSING');
    expect(records[0].fields.cantidadBulto.status).toBe('MISSING');
  });
});
