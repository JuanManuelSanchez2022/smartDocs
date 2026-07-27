import { DocumentModel, DocumentType } from '../../types/document';
import { DocumentSegmenter } from './DocumentSegmenter';
import { TokenExtractor } from './TokenExtractor';
import { FieldClassifier } from './FieldClassifier';
import { RecordBuilder } from './RecordBuilder';
import { PatternDetector } from './PatternDetector';

export class SmartParser {
  public static parse(rawText: string, docType: DocumentType): DocumentModel {
    const segments = DocumentSegmenter.segment(rawText);
    const tokens = TokenExtractor.extractAll(segments);
    const classifiedTokens = FieldClassifier.classifyTokens(tokens, segments);
    const provider = PatternDetector.detectProvider(segments);
    const records = RecordBuilder.buildRecords(classifiedTokens, segments, provider);

    const documentModel = this.buildDocumentModel(records, docType, provider);
    return documentModel;
  }

  public static debug(rawText: string, docType: DocumentType) {
    const startTime = performance.now();
    const segments = DocumentSegmenter.segment(rawText);
    const segmentTime = performance.now();
    const tokens = TokenExtractor.extractAll(segments);
    const tokenTime = performance.now();
    const classifiedTokens = FieldClassifier.classifyTokens(tokens, segments);
    const classificationTime = performance.now();
    const provider = PatternDetector.detectProvider(segments);
    const records = RecordBuilder.buildRecords(classifiedTokens, segments, provider);
    const recordTime = performance.now();
    const documentModel = this.buildDocumentModel(records, docType, provider);
    const finalTime = performance.now();

    return {
      documentModel,
      segments,
      tokens: classifiedTokens,
      records,
      interpretation: {
        fields: classifiedTokens.map((token) => ({
          rawText: token.rawText,
          normalizedText: token.normalizedText,
          category: token.category,
          confidence: token.confidence,
          row: token.lineIndex,
          column: token.columnIndex,
          page: token.page,
          boundingBox: token.boundingBox,
          providerDetected: token.providerDetected,
          layoutDetected: token.layoutDetected,
          confirmed: false,
          editable: true,
          metadata: {
            sourceSegmentId: token.sourceSegmentId,
            matchedPattern: token.matchedPattern
          }
        })),
        provider,
        layoutId: undefined,
        categories: [...new Set(classifiedTokens.map((token) => token.category))]
      },
      debugInfo: {
        segmentsDetected: segments.length,
        tableLinesDetected: segments.filter((segment) => segment.type === 'table').length,
        linesDetected: segments.filter((segment) => segment.type === 'line').length,
        tokensDetected: classifiedTokens.length,
        productsBuilt: records.length,
        errorsDetected: 0,
        recordsBuilt: records.length,
        lowConfidenceTokens: classifiedTokens.filter((token) => token.confidence < 0.8).length,
        stageTimings: [
          { stage: 'segmentation', durationMs: segmentTime - startTime },
          { stage: 'tokenization', durationMs: tokenTime - segmentTime },
          { stage: 'classification', durationMs: classificationTime - tokenTime },
          { stage: 'record_building', durationMs: recordTime - classificationTime },
          { stage: 'model_building', durationMs: finalTime - recordTime }
        ],
        processedAt: new Date().toISOString()
      }
    };
  }

  private static buildDocumentModel(records: ReturnType<typeof RecordBuilder.buildRecords>, docType: DocumentType, provider: string): DocumentModel {
    const items = records.map((record) => ({
      codigo: record.codigo,
      descripcion: record.producto,
      cantidad: parseFloat(record.cantidad.replace(/[^0-9,.]/g, '').replace(/,/g, '.')) || 0,
      unidad: record.presentacion || 'u',
      precio: record.precio,
      subtotal: record.precio * (parseFloat(record.cantidad.replace(/[^0-9,.]/g, '').replace(/,/g, '.')) || 1),
      originalDescription: record.originalText,
      normalizedDescription: record.normalizedText
    }));

    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const iva = Math.round(subtotal * 0.21 * 100) / 100;
    const total = subtotal + iva;

    return {
      tipo: docType,
      empresa: provider || 'Proveedor Desconocido',
      cuit: '',
      fecha: '',
      numero: '',
      items,
      subtotal,
      iva,
      total,
      observaciones: ''
    };
  }
}
