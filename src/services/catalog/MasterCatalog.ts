import { CatalogEntityType, MasterCatalogRecord } from '../../types/document';

export class MasterCatalog {
  private static readonly STORAGE_KEY = 'DocuMind.MasterCatalog';
  private static data: Record<CatalogEntityType, MasterCatalogRecord[]> = {
    proveedor: [],
    producto: [],
    categoria: [],
    subcategoria: [],
    marca: [],
    presentacion: [],
    unidad: [],
    sinonimo: [],
    codigo: [],
    diseno: []
  };

  private static initialized = false;

  public static initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    const raw = window.localStorage.getItem(this.STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<CatalogEntityType, MasterCatalogRecord[]>;
        this.data = { ...this.data, ...parsed };
      } catch {
        this.save();
      }
    } else {
      this.save();
    }
  }

  public static addEntity(type: CatalogEntityType, name: string, metadata: Record<string, unknown> = {}): MasterCatalogRecord {
    this.initialize();
    const normalizedName = name.trim().toLowerCase();
    const existing = this.data[type].find((item) => item.normalizedName === normalizedName);
    if (existing) {
      existing.updatedAt = new Date().toISOString();
      existing.metadata = { ...existing.metadata, ...metadata };
      this.save();
      return existing;
    }

    const record: MasterCatalogRecord = {
      id: `${type}_${Math.random().toString(36).slice(2, 12)}`,
      type,
      name: name.trim(),
      normalizedName,
      aliases: [],
      metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data[type].push(record);
    this.save();
    return record;
  }

  public static addAlias(type: CatalogEntityType, entityId: string, alias: string): void {
    this.initialize();
    const entity = this.data[type].find((item) => item.id === entityId);
    if (!entity) return;
    const normalizedAlias = alias.trim().toLowerCase();
    if (!entity.aliases.includes(normalizedAlias)) {
      entity.aliases.push(normalizedAlias);
      entity.updatedAt = new Date().toISOString();
      this.save();
    }
  }

  public static getEntities(type: CatalogEntityType): MasterCatalogRecord[] {
    this.initialize();
    return [...this.data[type]];
  }

  public static findEntity(type: CatalogEntityType, searchTerm: string): MasterCatalogRecord | null {
    this.initialize();
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return (
      this.data[type].find((item) => item.normalizedName === normalizedSearch || item.aliases.includes(normalizedSearch)) ||
      null
    );
  }

  public static getAll(): Record<CatalogEntityType, MasterCatalogRecord[]> {
    this.initialize();
    return { ...this.data };
  }

  private static save(): void {
    window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
  }
}
