import { KnowledgeEntry } from '../../types/document';

/**
 * KnowledgeBase: persistent store for providers, categories, products,
 * synonyms, corrections and learned patterns.
 *
 * This is a minimal in-memory skeleton. Persist to IndexedDB or server
 * will be added later.
 */
export class KnowledgeBase {
  private static readonly STORAGE_KEY = 'DocuMind.KnowledgeBase';
  private static entries: KnowledgeEntry[] = [];
  private static initialized = false;

  public static initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    const raw = window.localStorage.getItem(this.STORAGE_KEY);
    if (raw) {
      try {
        this.entries = JSON.parse(raw) as KnowledgeEntry[];
      } catch {
        this.entries = [];
        this.save();
      }
    } else {
      this.entries = [];
      this.save();
    }
  }

  public static addEntry(entry: KnowledgeEntry): void {
    this.initialize();
    this.entries.push({
      ...entry,
      id: entry.id || `kb_${Math.random().toString(36).slice(2, 12)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    this.save();
  }

  public static getEntries(): KnowledgeEntry[] {
    this.initialize();
    return [...this.entries];
  }

  public static query(predicate: (entry: KnowledgeEntry) => boolean): KnowledgeEntry[] {
    this.initialize();
    return this.entries.filter(predicate);
  }

  private static save(): void {
    window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.entries));
  }
}

export default KnowledgeBase
