import { IStorageService } from './IStorageService';
import { ProcessedDocument } from '../../types/document';

export class IndexedDBStore implements IStorageService {
  private dbName = 'DocuMindDB';
  private storeName = 'documents';
  private version = 1;
  private db: IDBDatabase | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db);

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error('Error opening IndexedDB database'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          // Store documents using 'id' as keypath
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  public async saveDocument(doc: ProcessedDocument): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.put(doc);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save document in IndexedDB'));
    });
  }

  public async getDocument(id: string): Promise<ProcessedDocument | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(new Error('Failed to get document from IndexedDB'));
    });
  }

  public async getAllDocuments(): Promise<ProcessedDocument[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.getAll();

      request.onsuccess = () => {
        // Return sorted by processed date descending
        const docs = request.result as ProcessedDocument[];
        docs.sort((a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime());
        resolve(docs);
      };
      request.onerror = () => reject(new Error('Failed to retrieve all documents from IndexedDB'));
    });
  }

  public async deleteDocument(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete document from IndexedDB'));
    });
  }

  public async clearAll(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to clear database in IndexedDB'));
    });
  }
}
