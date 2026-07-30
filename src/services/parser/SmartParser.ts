import { DocumentModel, DocumentType, ParsedRecord, InterpretedField } from '../../types/document';
import { DocumentSegmenter } from './DocumentSegmenter';
import { TokenExtractor } from './TokenExtractor';
import { FieldClassifier } from './FieldClassifier';
import { RecordBuilder } from './RecordBuilder';
import { PatternDetector } from './PatternDetector';
import { RecordReconstructor } from './RecordReconstructor';
import { ContextEngine } from '../context/ContextEngine';
import { NormalizationEngine } from '../normalizer/NormalizationEngine';
import { AutoClassifier } from '../classifier/AutoClassifier';
import type { RecordCandidate, NormalizedRecord } from '../../types/smartdocs';

export class SmartParser {
  public static parse(rawText: string, docType: DocumentType): DocumentModel {
    const debugResult = this.debug(rawText, docType);
    return debugResult.documentModel;
  }

  public static debug(rawText: string, docType: DocumentType) {
    const startTime = performance.now();
    const segments = DocumentSegmenter.segment(rawText);
    const segmentTime = performance.now();
    const tokens = TokenExtractor.extractAll(segments);
    const tokenTime = performance.now();
    const classifiedTokens = FieldClassifier.classifyTokens(tokens, segments);
    const classificationTime = performance.now();
    const detectedProvider = PatternDetector.detectProvider(segments);

    // Initialize Context Engine and Normalization Engine
    const contextEngine = new ContextEngine();
    if (detectedProvider) {
      contextEngine.setProveedor(detectedProvider);
    }
    const normEngine = new NormalizationEngine(contextEngine);
    const autoClassifier = new AutoClassifier(0.8);

    const parsedRecords: ParsedRecord[] = [];
    const normalizedRecords: NormalizedRecord[] = [];
    const interpretedFields: InterpretedField[] = [];

    // Process segments sequentially updating context and generating records
    segments.forEach((segment) => {
      if (segment.type === 'header' || segment.type === 'subheader') {
        contextEngine.updateFromLine(segment.text, segment.type === 'header', segment.type === 'subheader');
        return;
      }

      if (segment.type === 'ignored' || segment.type === 'footer') {
        return;
      }

      const reconstructed = RecordReconstructor.reconstruct(segment.text);
      const lineTokens = classifiedTokens.filter((t) => t.sourceSegmentId === segment.id);

      if (reconstructed.length > 0) {
        reconstructed.forEach((rec) => {
          const docContext = contextEngine.getContext();

          const candidate: RecordCandidate = {
            proveedor: {
              value: rec.fields.proveedor.value || docContext.proveedor?.value || detectedProvider || '',
              confidence: rec.fields.proveedor.value ? 0.9 : (docContext.proveedor?.confidence || 0.6)
            },
            categoria: {
              value: rec.fields.categoria.value || docContext.categoria?.value || '',
              confidence: rec.fields.categoria.value ? 0.9 : (docContext.categoria?.confidence || 0.6)
            },
            codigo: {
              value: rec.fields.codigo.value || '',
              confidence: rec.fields.codigo.confidence || 0
            },
            marca: {
              value: rec.fields.marca.value || '',
              confidence: rec.fields.marca.confidence || 0
            },
            producto: {
              value: rec.product || segment.text,
              confidence: 0.9
            },
            tipo: {
              value: rec.fields.tipo.value || '',
              confidence: rec.fields.tipo.confidence || 0
            },
            presentacion: {
              value: rec.fields.presentacion.value || '',
              confidence: rec.fields.presentacion.confidence || 0
            },
            cantidadBulto: {
              value: rec.fields.cantidadBulto.value || '',
              confidence: rec.fields.cantidadBulto.confidence || 0
            },
            precio: {
              value: rec.price || null,
              confidence: rec.price ? 0.98 : 0
            },
            page: segment.page,
            sourceText: segment.text
          };

          const normalizedRecord = normEngine.normalizedFromCandidate(candidate);
          const { pending } = autoClassifier.classify(normalizedRecord);
          void pending;
          normalizedRecords.push(normalizedRecord);

          const parsedRecord: ParsedRecord = {
            id: `record_${segment.page}_${segment.lineIndex}`,
            proveedor: String(normalizedRecord.proveedor.value || detectedProvider || 'Proveedor Desconocido'),
            codigo: String(normalizedRecord.codigo.value || ''),
            producto: String(normalizedRecord.producto.value || segment.text),
            presentacion: String(normalizedRecord.presentacion.value || ''),
            cantidad: String(normalizedRecord.cantidadBulto.value || '1'),
            precio: Number(normalizedRecord.precio.value) || 0,
            originalText: segment.text,
            normalizedText: String(normalizedRecord.producto.value || segment.text),
            lineIndex: segment.lineIndex,
            page: segment.page,
            confidence: 0.9,
            tokens: lineTokens
          };

          parsedRecords.push(parsedRecord);

          // Build structured interpreted fields ONLY for non-empty fields
          const addInterpretedField = (cat: any, val: string | number | null, conf: number) => {
            if (val !== null && val !== undefined && String(val).trim() !== '') {
              interpretedFields.push({
                rawText: String(val),
                normalizedText: String(val),
                category: cat,
                confidence: conf,
                row: segment.lineIndex,
                column: 0,
                page: segment.page,
                confirmed: conf >= 0.8,
                editable: true,
                status: conf >= 0.8 ? 'ACCEPTED' : 'PENDING'
              });
            }
          };

          addInterpretedField('producto', normalizedRecord.producto.value, 0.9);
          if (normalizedRecord.precio.value !== null) {
            addInterpretedField('precio', normalizedRecord.precio.value, 0.98);
          }
          addInterpretedField('presentacion', normalizedRecord.presentacion.value, 0.9);
          addInterpretedField('codigo', normalizedRecord.codigo.value, 0.9);
          addInterpretedField('marca', normalizedRecord.marca.value, 0.85);
          addInterpretedField('proveedor', normalizedRecord.proveedor.value, 0.85);
          addInterpretedField('categoria', normalizedRecord.categoria.value, 0.85);
        });
      }
    });

    // Fallback: If no records were reconstructed from lines, try RecordBuilder
    if (parsedRecords.length === 0) {
      const fallbackRecords = RecordBuilder.buildRecords(classifiedTokens, segments, detectedProvider);
      fallbackRecords.forEach((rec) => {
        parsedRecords.push(rec);
        interpretedFields.push({
          rawText: rec.originalText,
          normalizedText: rec.producto,
          category: 'producto',
          confidence: rec.confidence,
          row: rec.lineIndex,
          page: rec.page,
          confirmed: rec.confidence >= 0.8,
          editable: true,
          status: rec.confidence >= 0.8 ? 'ACCEPTED' : 'PENDING'
        });
      });
    }

    const recordTime = performance.now();
    const provider = contextEngine.getContext().proveedor?.value || detectedProvider || '';
    const documentModel = this.buildDocumentModel(parsedRecords, docType, provider);
    const finalTime = performance.now();

    return {
      documentModel,
      segments,
      tokens: classifiedTokens,
      records: parsedRecords,
      normalizedRecords,
      interpretation: {
        fields: interpretedFields,
        provider,
        layoutId: undefined,
        categories: [...new Set(interpretedFields.map((f) => f.category))]
      },
      debugInfo: {
        segmentsDetected: segments.length,
        tableLinesDetected: segments.filter((s) => s.type === 'table').length,
        linesDetected: segments.filter((s) => s.type === 'line').length,
        tokensDetected: classifiedTokens.length,
        productsBuilt: parsedRecords.length,
        errorsDetected: 0,
        recordsBuilt: parsedRecords.length,
        lowConfidenceTokens: interpretedFields.filter((f) => f.confidence < 0.8).length,
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

  private static buildDocumentModel(records: ParsedRecord[], docType: DocumentType, provider: string): DocumentModel {
    const items = records.map((record) => {
      const parsedQty = parseFloat(String(record.cantidad).replace(/[^0-9,.]/g, '').replace(/,/g, '.')) || 1;
      const parsedPrice = typeof record.precio === 'number' ? record.precio : 0;

      return {
        codigo: record.codigo || '',
        descripcion: record.producto || record.originalText,
        cantidad: parsedQty,
        unidad: record.presentacion || 'u',
        precio: parsedPrice,
        subtotal: Math.round(parsedPrice * parsedQty * 100) / 100,
        originalDescription: record.originalText,
        normalizedDescription: record.normalizedText || record.producto
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const iva = Math.round(subtotal * 0.21 * 100) / 100;
    const total = Math.round((subtotal + iva) * 100) / 100;

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
