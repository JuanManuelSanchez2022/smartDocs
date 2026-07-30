// ============================================================
// SmartDocs — types/document.ts
// Fase 1: campos de listas de precios + marcador de revisión
// ============================================================

export interface DocumentItem {
  codigo: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  precio: number;
  subtotal: number;

  // --- Campos de normalización de listas de precios (SmartDocs Fase 1) ---
  // Opcionales para no afectar el flujo existente de factura/remito/presupuesto,
  // que no los completa.
  proveedor?: string;      // propagado desde DocumentModel.empresa en el parser
  categoria?: string;      // se completa en Fase 2 (ContextEngine)
  presentacion?: string;   // ej: "X 900 CC", "X 1 LITRO", "X KG"
  marca?: string;          // se completa en fases de clasificación
  tipo?: string;           // se completa en fases de clasificación
  cantidadBulto?: string;  // cantidad por bulto/paquete detectada en la línea
  originalText?: string;   // texto OCR original de la fila, siempre preservado

  // --- Control de calidad / aprendizaje ---
  // true  → al menos un campo obligatorio vacío; el item va a la cola de revisión
  // false → todos los campos obligatorios tienen valor
  // undefined → no es una lista de precios (factura/remito/etc.), no aplica
  pendienteRevision?: boolean;

  // Posiciones normalizadas de cada token numérico en la línea original.
  // Útil para el entrenamiento de la red neuronal: captura la estructura
  // espacial del layout sin perder el texto OCR.
  // posRelativa ∈ [0, 1]: 0 = inicio de línea, 1 = fin de línea.
  tokenPositions?: Array<{ valor: string; posRelativa: number }>;
}

// Campos que DEBEN tener valor para que un item de lista de precios
// se considere normalizado. Se usa en el parser y en la UI de aprendizaje.
export const CAMPOS_OBLIGATORIOS_LISTA: (keyof DocumentItem)[] = [
  'proveedor',
  'codigo',
  'descripcion',
  'presentacion',
  'cantidad',
  'precio',
];

export type DocumentType =
  | 'factura'
  | 'remito'
  | 'lista_de_precios'
  | 'presupuesto'
  | 'orden_de_compra'
  | 'otro';

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
  originalImage?: string;   // Base64 url
  processedImage?: string;  // Base64 url
  extractedData: DocumentModel;

  // Cuántos items de este documento están pendientes de revisión manual.
  // Se calcula en el parser y se actualiza cuando el usuario normaliza items
  // desde el módulo de Aprendizaje.
  itemsPendientes?: number;
}
