import { ProcessedDocument } from '../../types/document';

export interface IStorageService {
  saveDocument(doc: ProcessedDocument): Promise<void>;
  getDocument(id: string): Promise<ProcessedDocument | null>;
  getAllDocuments(): Promise<ProcessedDocument[]>;
  deleteDocument(id: string): Promise<void>;
  clearAll(): Promise<void>;
}
