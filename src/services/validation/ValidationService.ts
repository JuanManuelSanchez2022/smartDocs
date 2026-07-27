import { ValidationRecord } from '../../types/document';

export class ValidationService {
  private static readonly STORAGE_KEY = 'DocuMind.ValidationRecords';
  private static records: ValidationRecord[] = [];
  private static initialized = false;

  public static initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    const raw = window.localStorage.getItem(this.STORAGE_KEY);
    if (raw) {
      try {
        this.records = JSON.parse(raw) as ValidationRecord[];
      } catch {
        this.records = [];
        this.save();
      }
    }
  }

  public static addValidation(record: ValidationRecord): void {
    this.initialize();
    this.records.push({
      ...record,
      id: record.id || `val_${Math.random().toString(36).slice(2, 12)}`,
      createdAt: new Date().toISOString()
    });
    this.save();
  }

  public static getValidations(): ValidationRecord[] {
    this.initialize();
    return [...this.records];
  }

  private static save(): void {
    window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.records));
  }
}
