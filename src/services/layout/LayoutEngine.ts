import { DocumentLayout } from '../../types/document';

export class LayoutEngine {
  private static readonly STORAGE_KEY = 'DocuMind.Layouts';
  private static layouts: DocumentLayout[] = [];
  private static initialized = false;

  public static initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    const raw = window.localStorage.getItem(this.STORAGE_KEY);
    if (raw) {
      try {
        this.layouts = JSON.parse(raw) as DocumentLayout[];
      } catch {
        this.layouts = [];
        this.save();
      }
    }
  }

  public static recordLayout(layout: DocumentLayout): void {
    this.initialize();
    const existing = this.layouts.find((item) => item.provider === layout.provider);
    if (existing) {
      existing.columns = layout.columns;
      existing.order = layout.order;
      existing.array = layout.array;
      existing.updatedAt = new Date().toISOString();
    } else {
      this.layouts.push({ ...layout, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.save();
  }

  public static findLayout(provider: string): DocumentLayout | null {
    this.initialize();
    return this.layouts.find((item) => item.provider?.toLowerCase() === provider?.toLowerCase()) || null;
  }

  public static getAll(): DocumentLayout[] {
    this.initialize();
    return [...this.layouts];
  }

  private static save(): void {
    window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.layouts));
  }
}
