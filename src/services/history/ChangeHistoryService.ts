import { ChangeRecord } from '../../types/document';

export class ChangeHistoryService {
  private static readonly STORAGE_KEY = 'DocuMind.ChangeHistory';
  private static records: ChangeRecord[] = [];
  private static initialized = false;

  public static initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    const raw = window.localStorage.getItem(this.STORAGE_KEY);
    if (raw) {
      try {
        this.records = JSON.parse(raw) as ChangeRecord[];
      } catch {
        this.records = [];
        this.save();
      }
    }
  }

  public static addRecord(record: ChangeRecord): void {
    this.initialize();
    this.records.push({
      ...record,
      id: record.id || `hist_${Math.random().toString(36).slice(2, 12)}`,
      createdAt: new Date().toISOString()
    });
    this.save();
  }

  public static getRecords(): ChangeRecord[] {
    this.initialize();
    return [...this.records];
  }

  private static save(): void {
    window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.records));
  }
}
