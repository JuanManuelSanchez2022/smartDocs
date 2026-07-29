import type { LearningReviewItem } from '../../types/document';

export interface LearningCorrectionEvent {
  itemId: string;
  documentId: string;
  field: string;
  originalValue: string;
  correctedValue: string;
  category: string;
  confidence: number;
  page: number;
}

export type CorrectionSubscriber = (event: LearningCorrectionEvent) => void;

export class LearningActions {
  private static subscribers: CorrectionSubscriber[] = [];

  public static subscribe(subscriber: CorrectionSubscriber) {
    this.subscribers.push(subscriber);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== subscriber);
    };
  }

  public static notify(event: LearningCorrectionEvent) {
    for (const subscriber of this.subscribers) {
      subscriber(event);
    }
  }

  public static buildCorrection(item: LearningReviewItem, correctedValue: string, category: string): LearningCorrectionEvent {
    return {
      itemId: item.id,
      documentId: item.documentId,
      field: item.category,
      originalValue: item.rawText,
      correctedValue,
      category,
      confidence: item.confidence,
      page: item.page
    };
  }
}
