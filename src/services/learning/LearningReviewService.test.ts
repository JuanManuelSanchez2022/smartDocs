import { describe, it, expect } from 'vitest';
import type { ProcessedDocument } from '../../types/document';
import { LearningReviewService } from './LearningReviewService';

describe('LearningReviewService', () => {
  it('creates pending review items and persists a correction as a training example', () => {
    const document: ProcessedDocument = {
      id: 'doc-1',
      fileName: 'lista.pdf',
      fileSize: 100,
      fileType: 'application/pdf',
      processedAt: '2026-01-01T00:00:00.000Z',
      status: 'success',
      extractedData: {
        tipo: 'lista_de_precios',
        empresa: 'Proveedor X',
        cuit: '',
        fecha: '',
        numero: '',
        items: [],
        subtotal: 0,
        iva: 0,
        total: 0,
        observaciones: ''
      },
      rawText: 'ACEITE "CAÑUELAS" X 900 CC - 3740.00',
      interpretation: {
        provider: 'Proveedor X',
        categories: ['producto', 'marca', 'presentacion', 'precio'],
        fields: [
          {
            rawText: 'ACEITE',
            normalizedText: 'ACEITE',
            category: 'producto',
            confidence: 0.95,
            row: 0,
            confirmed: true,
            editable: true,
            status: 'ACCEPTED'
          },
          {
            rawText: 'CAÑUELAS',
            normalizedText: 'CAÑUELAS',
            category: 'otro',
            confidence: 0.41,
            row: 0,
            confirmed: false,
            editable: true,
            status: 'PENDING'
          },
          {
            rawText: 'X 900 CC',
            normalizedText: 'X 900 CC',
            category: 'presentacion',
            confidence: 0.97,
            row: 0,
            confirmed: true,
            editable: true,
            status: 'ACCEPTED'
          },
          {
            rawText: '3740.00',
            normalizedText: '3740.00',
            category: 'precio',
            confidence: 0.99,
            row: 0,
            confirmed: true,
            editable: true,
            status: 'ACCEPTED'
          }
        ]
      }
    };

    const pendingItems = LearningReviewService.getPendingReviewItems(document);
    expect(pendingItems).toHaveLength(1);
    expect(pendingItems[0].status).toBe('PENDING');

    const updatedDocument = LearningReviewService.applyCorrection(document, pendingItems[0], {
      correctedValue: 'CAÑUELAS',
      correctedCategory: 'marca'
    });

    expect(updatedDocument.interpretation?.fields[1].status).toBe('CORRECTED');
    expect(updatedDocument.interpretation?.fields[1].category).toBe('marca');
    expect(updatedDocument.trainingExamples).toHaveLength(1);
    expect(updatedDocument.trainingExamples?.[0].assignedCategory).toBe('marca');
    expect(updatedDocument.trainingExamples?.[0].humanCorrection).toBe(true);
  });
});
