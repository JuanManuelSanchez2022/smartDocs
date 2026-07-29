import { LearningReviewItem } from '../../types/document';

export class LearningQueue {
  private static items: LearningReviewItem[] = [];

  public static setItems(items: LearningReviewItem[]) {
    this.items = [...items];
  }

  public static getItems(): LearningReviewItem[] {
    return [...this.items];
  }

  public static removeItem(id: string) {
    this.items = this.items.filter((item) => item.id !== id);
  }

  public static updateItem(id: string, updates: Partial<LearningReviewItem>) {
    this.items = this.items.map((item) => (item.id === id ? { ...item, ...updates } : item));
  }

  public static count(): number {
    return this.items.length;
  }
}
