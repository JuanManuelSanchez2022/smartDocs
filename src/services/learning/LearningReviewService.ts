import type { ProcessedDocument, LearningReviewItem, DocumentCategory, InterpretedField } from '../../types/document';
import { TrainingManager } from '../training/TrainingManager';

export interface LearningReviewCorrectionInput {
  correctedValue: string;
  correctedCategory: DocumentCategory | 'otro';
}

export interface TrainingExample {
  rawText: string;
  normalizedText: string;
  assignedCategory: string;
  context: string;
  neighboringText: string;
  documentType: string;
  provider: string;
  categoryContext: string;
  previousPrediction: string | null;
  previousConfidence: number;
  humanCorrection: boolean;
  timestamp: string;
}

export class LearningReviewService {
  public static getPendingReviewItems(document: ProcessedDocument): LearningReviewItem[] {
    if (!document.interpretation?.fields) {
      return [];
    }

    return document.interpretation.fields
      .filter((field) => field.status === 'PENDING' || (!field.status && field.confidence < 0.8))
      .map((field, index) => ({
        id: `${document.id}_${index}`,
        documentId: document.id,
        fileName: document.fileName,
        page: field.page || 1,
        lineIndex: field.row || 0,
        rawText: field.rawText,
        category: (field.category || 'otro') as DocumentCategory,
        confidence: field.confidence || 0,
        correctedValue: field.normalizedText,
        status: field.status || 'PENDING',
        context: field.metadata?.context as string | undefined,
        detectedCategory: field.metadata?.detectedCategory as DocumentCategory | 'otro' | undefined,
        sourceDocument: document.fileName,
        sourceBlock: field.metadata?.sourceBlock as string | undefined,
        sourceLine: field.metadata?.sourceLine as string | undefined
      }));
  }

  public static applyCorrection(
    document: ProcessedDocument,
    item: LearningReviewItem,
    input: LearningReviewCorrectionInput
  ): ProcessedDocument {
    const nextFields = (document.interpretation?.fields || []).map((field) => {
      const matches = field.rawText === item.rawText && (field.page || 1) === item.page && (field.row || 0) === item.lineIndex;
      if (!matches) {
        return field;
      }

      const nextField: InterpretedField = {
        ...field,
        normalizedText: input.correctedValue,
        category: input.correctedCategory as DocumentCategory,
        confidence: Math.max(field.confidence, 0.99),
        confirmed: true,
        editable: true,
        status: 'CORRECTED',
        metadata: {
          ...(field.metadata || {}),
          correctedValue: input.correctedValue,
          correctedCategory: input.correctedCategory,
          correctedAt: new Date().toISOString(),
          previousPrediction: field.category,
          previousConfidence: field.confidence,
          sourceBlock: field.metadata?.sourceBlock || field.rawText,
          sourceLine: field.metadata?.sourceLine || field.row,
          context: field.metadata?.context || document.rawText || ''
        }
      };

      return nextField;
    });

    const trainingExample: TrainingExample = {
      rawText: item.rawText,
      normalizedText: input.correctedValue,
      assignedCategory: input.correctedCategory,
      context: item.context || document.rawText || '',
      neighboringText: document.rawText || '',
      documentType: document.extractedData?.tipo || 'lista_de_precios',
      provider: document.interpretation?.provider || document.extractedData?.empresa || '',
      categoryContext: input.correctedCategory,
      previousPrediction: item.detectedCategory || null,
      previousConfidence: item.confidence,
      humanCorrection: true,
      timestamp: new Date().toISOString()
    };

    const manager = new TrainingManager();
    void manager.addCorrection({
      textoOriginal: item.rawText,
      categoriaAnterior: item.detectedCategory || item.category,
      categoriaNueva: input.correctedCategory,
      proveedor: document.interpretation?.provider || document.extractedData?.empresa || '',
      contexto: item.context || document.rawText || '',
      producto: document.extractedData?.items?.[0]?.descripcion || '',
      usuario: 'usuario',
      fecha: new Date().toISOString(),
      confianzaAnterior: item.confidence
    });

    return {
      ...document,
      interpretation: {
        ...(document.interpretation || {}),
        provider: document.interpretation?.provider || document.extractedData?.empresa || '',
        fields: nextFields
      },
      trainingExamples: [...(document.trainingExamples || []), trainingExample]
    } as ProcessedDocument;
  }
}
