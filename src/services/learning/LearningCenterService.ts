import { KnowledgeBase } from '../knowledge/KnowledgeBase';
import { MasterCatalog } from '../catalog/MasterCatalog';
import {
  LearningSummary,
  PendingDocumentSummary,
  ProcessedDocument,
  LearningReviewItem,
  DocumentCategory
} from '../../types/document';

const CONFIDENCE_THRESHOLD = 0.8;

export class LearningCenterService {
  public static getSummary(documents: ProcessedDocument[], manualCorrections: number = 0): LearningSummary {
    const pendingDocuments = this.getPendingDocuments(documents);
    const pendingTokens = this.getPendingTokens(documents);
    const unknownProducts = this.getUnknownProducts();
    const newCategories = this.getNewCategories();

    return {
      pendingDocuments,
      pendingTokens,
      unknownProducts,
      newCategories,
      lowConfidenceItems: pendingTokens.map((item) => item.rawText),
      newLayouts: this.getNewLayouts(),
      possibleDuplicates: this.getPossibleDuplicates(),
      detectedSynonyms: this.getDetectedSynonyms(),
      documentsProcessed: documents.filter((doc) => doc.status === 'success').length,
      recordsNormalized: documents.reduce((count, doc) => count + (doc.parsedRecords?.length || 0), 0),
      fieldsAutoClassified: this.getAutoClassifiedFieldCount(documents),
      fieldsPending: pendingTokens.length,
      fieldsCorrected: manualCorrections,
      averageConfidence: this.getAverageConfidence(documents),
      estimatedPrecision: this.getEstimatedPrecision(documents)
    };
  }

  public static getPendingDocuments(documents: ProcessedDocument[]): PendingDocumentSummary[] {
    return documents
      .filter((doc) => this.getPendingItemsForDocument(doc).length > 0)
      .map((doc) => {
        const pendingItems = this.getPendingItemsForDocument(doc);
        return {
          id: doc.id,
          fileName: doc.fileName,
          issues: [`${pendingItems.length} campos pendientes`],
          confidenceScore: doc.interpretation ? this.getAverageConfidenceForDoc(doc) : 0
        };
      });
  }

  public static getPendingTokens(documents: ProcessedDocument[]): LearningReviewItem[] {
    return documents.flatMap((doc) => this.getPendingItemsForDocument(doc).map((field, index) => ({
      id: `${doc.id}_${index}`,
      documentId: doc.id,
      fileName: doc.fileName,
      page: field.page || 1,
      lineIndex: field.row,
      rawText: field.rawText,
      category: field.category,
      confidence: field.confidence,
      correctedValue: field.normalizedText,
      status: field.status,
      context: field.metadata?.context as string | undefined,
      detectedCategory: field.metadata?.detectedCategory as DocumentCategory | 'otro' | undefined,
      sourceDocument: doc.fileName,
      sourceBlock: field.metadata?.sourceBlock as string | undefined,
      sourceLine: field.metadata?.sourceLine as string | undefined
    })));
  }

  public static getCategories(): DocumentCategory[] {
    return [
      'proveedor',
      'categoria',
      'codigo',
      'marca',
      'producto',
      'tipo',
      'presentacion',
      'cantidad',
      'precio',
      'otro'
    ];
  }

  private static getPendingItemsForDocument(doc: ProcessedDocument): Array<NonNullable<ProcessedDocument['interpretation']>['fields'][number]> {
    return (doc.interpretation?.fields || []).filter((field) => field.status === 'PENDING' || (!field.status && field.confidence < CONFIDENCE_THRESHOLD));
  }

  private static getAutoClassifiedFieldCount(documents: ProcessedDocument[]): number {
    return documents.reduce((count, doc) => {
      return count + (doc.interpretation?.fields.filter((field) => field.status === 'ACCEPTED' || field.status === 'CORRECTED' || (field.status === undefined && field.confidence >= CONFIDENCE_THRESHOLD)).length || 0);
    }, 0);
  }

  private static getAverageConfidence(documents: ProcessedDocument[]): number {
    const confidences = documents.flatMap((doc) => doc.interpretation?.fields.map((field) => field.confidence) || []);
    if (confidences.length === 0) return 0;
    return confidences.reduce((sum, value) => sum + value, 0) / confidences.length;
  }

  private static getAverageConfidenceForDoc(doc: ProcessedDocument): number {
    if (!doc.interpretation || doc.interpretation.fields.length === 0) return 0;
    const sum = doc.interpretation.fields.reduce((acc, field) => acc + field.confidence, 0);
    return sum / doc.interpretation.fields.length;
  }

  private static getEstimatedPrecision(documents: ProcessedDocument[]): number {
    const totalFields = documents.reduce((count, doc) => count + (doc.interpretation?.fields.length || 0), 0);
    if (totalFields === 0) return 0;
    const resolvedFields = documents.reduce((count, doc) => {
      return count + (doc.interpretation?.fields.filter((field) => field.status === 'ACCEPTED' || field.status === 'CORRECTED').length || 0);
    }, 0);
    return Math.max(0, Math.min(1, resolvedFields / totalFields));
  }

  public static getNewLayouts(): string[] {
    return [];
  }

  public static getUnknownProducts(): string[] {
    const products = MasterCatalog.getEntities('producto');
    return products.filter((product) => product.metadata?.source === 'unknown').map((item) => item.name);
  }

  public static getNewCategories(): string[] {
    const categories = MasterCatalog.getEntities('categoria');
    return categories.filter((item) => item.metadata?.isNew).map((item) => item.name);
  }

  public static getLowConfidenceItems(): string[] {
    const entries = KnowledgeBase.getEntries();
    return entries.filter((entry) => entry.confidence < 0.6).map((entry) => entry.originalText);
  }

  public static getPossibleDuplicates(): string[] {
    return [];
  }

  public static getDetectedSynonyms(): string[] {
    const records = MasterCatalog.getEntities('sinonimo');
    return records.map((record) => record.name);
  }
}
