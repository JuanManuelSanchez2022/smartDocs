export interface DocumentItem {
  codigo: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  precio: number;
  subtotal: number;
}

export type DocumentType = 'factura' | 'remito' | 'lista_de_precios' | 'presupuesto' | 'orden_de_compra' | 'otro';

export interface DocumentModel {
  tipo: DocumentType;
  empresa: string;
  cuit: string;
  fecha: string;
  numero: string;
  items: DocumentItem[];
  subtotal: number;
  iva: number;
  total: number;
  observaciones: string;
}

export interface ProcessedDocument {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  processedAt: string;
  status: 'processing' | 'success' | 'failed';
  errorMessage?: string;
  rawText?: string;
  originalImage?: string; // Base64 url
  processedImage?: string; // Base64 url
  extractedData: DocumentModel;
}
