import { KnowledgeBase } from '../knowledge/KnowledgeBase';
import { MasterCatalog } from '../catalog/MasterCatalog';
import { LearningSummary, PendingDocumentSummary, ProcessedDocument, LearningReviewItem } from '../../types/document';

export class LearningCenterService {
  public static getSummary(documents: ProcessedDocument[]): LearningSummary {
    const pendingDocuments = this.getPendingDocuments(documents);
    const pendingTokens = this.getPendingTokens(documents);
    const unknownProducts = this.getUnknownProducts();
    const newCategories = this.getNewCategories();
    const lowConfidenceItems = this.getLowConfidenceItems();

    return {
      pendingDocuments,
      pendingTokens,
      unknownProducts,
      newCategories,
      lowConfidenceItems,
      newLayouts: this.getNewLayouts(),
      possibleDuplicates: this.getPossibleDuplicates(),
      detectedSynonyms: this.getDetectedSynonyms()
    };
  }

  public static getPendingDocuments(documents: ProcessedDocument[]): PendingDocumentSummary[] {
    return documents
      .filter((doc) => doc.parserDebug?.lowConfidenceTokens && doc.parserDebug.lowConfidenceTokens > 0)
      .map((doc) => ({
        id: doc.id,
        fileName: doc.fileName,
        issues: [`${doc.parserDebug?.lowConfidenceTokens || 0} tokens con baja confianza`],
        confidenceScore: doc.parserDebug ? 1 - doc.parserDebug.lowConfidenceTokens / Math.max(1, doc.parserDebug.tokensDetected) : 0
      }));
  }

  public static getPendingTokens(documents: ProcessedDocument[]): LearningReviewItem[] {
    return documents.flatMap((doc) =>
      doc.interpretation?.fields
        .filter((field) => field.confidence < 0.8)
        .map((field, index) => ({
          id: `${doc.id}_${index}`,
          documentId: doc.id,
          fileName: doc.fileName,
          page: field.page || 1,
          lineIndex: field.row,
          rawText: field.rawText,
          category: field.category,
          confidence: field.confidence,
          correctedValue: field.normalizedText
        })) || []
    );
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
