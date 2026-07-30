export type DocumentCategory =
  | 'proveedor'
  | 'codigo'
  | 'producto'
  | 'presentacion'
  | 'cantidad'
  | 'precio'
  | 'marca'
  | 'categoria'
  | 'subcategoria'
  | 'unidad'
  | 'iva'
  | 'moneda'
  | 'precio_mayorista'
  | 'precio_caja'
  | 'descuento'
  | 'observaciones'
  | 'tipo'
  | 'otro';

export type ParserSegmentType = 'header' | 'subheader' | 'table' | 'line' | 'footer' | 'ignored';

export interface DocumentSegment {
  id: string;
  type: ParserSegmentType;
  text: string;
  lineIndex: number;
  page: number;
  isRepeatedHeader: boolean;
  metadata: Record<string, unknown>;
}

export type FieldStatus = 'DETECTED' | 'CONFIRMED' | 'CORRECTED' | 'MISSING' | 'UNKNOWN' | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'NO_DATA';

export interface ParsedToken {
  id: string;
  rawText: string;
  normalizedText: string;
  category: DocumentCategory;
  confidence: number;
  lineIndex: number;
  columnIndex: number;
  page: number;
  tokenIndex: number;
  positionX: number;
  positionY: number;
  sourceSegmentId: string;
  boundingBox?: BoundingBox;
  providerDetected?: string;
  layoutDetected?: string;
  matchedPattern?: string;
  originalSegmentText: string;
}

export interface ParsedRecord {
  id: string;
  proveedor: string;
  codigo: string;
  producto: string;
  presentacion: string;
  cantidad: string;
  precio: number;
  originalText: string;
  normalizedText: string;
  lineIndex: number;
  page: number;
  confidence: number;
  tokens: ParsedToken[];
}

export interface ParserStageTiming {
  stage: string;
  durationMs: number;
}

export interface ParserDebugSnapshot {
  segmentsDetected: number;
  tableLinesDetected: number;
  linesDetected: number;
  tokensDetected: number;
  productsBuilt: number;
  errorsDetected: number;
  recordsBuilt: number;
  lowConfidenceTokens: number;
  stageTimings: ParserStageTiming[];
  processedAt: string;
}

export interface ParseResult {
  documentModel: DocumentModel;
  segments: DocumentSegment[];
  tokens: ParsedToken[];
  records: ParsedRecord[];
  interpretation: InterpretationResult;
  debugInfo: ParserDebugSnapshot;
  provider: string;
  layoutId?: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type LearningItemStatus = 'PENDING' | 'ACCEPTED' | 'CORRECTED' | 'REJECTED' | 'NO_DATA';

export interface InterpretedField {
  rawText: string;
  normalizedText: string;
  category: DocumentCategory;
  confidence: number;
  status?: FieldStatus;
  row: number;
  column?: number;
  page?: number;
  boundingBox?: BoundingBox;
  providerDetected?: string;
  layoutDetected?: string;
  confirmed: boolean;
  editable: boolean;
  metadata?: Record<string, unknown>;
}

export interface InterpretationResult {
  fields: InterpretedField[];
  provider: string;
  layoutId?: string;
  categories: DocumentCategory[];
}

export interface DocumentItem {
  codigo: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  precio: number;
  subtotal: number;
  originalDescription?: string;
  normalizedDescription?: string;
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

export interface TrainingExampleEntry {
  rawText: string;
  normalizedText: string;
  assignedCategory: string;
  context: string;
  neighboringText: string;
  documentType: string;
  provider: string;
  categoryContext: string;
  previousPrediction: string | null;
  previousConfidence: number;
  humanCorrection: boolean;
  timestamp: string;
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
  interpretation?: InterpretationResult;
  parserDebug?: ParserDebugSnapshot;
  parsedRecords?: ParsedRecord[];
  segments?: DocumentSegment[];
  tokens?: ParsedToken[];
  trainingExamples?: TrainingExampleEntry[];
  version?: number;
  changeHistoryIds?: string[];
}

export interface LearningReviewItem {
  id: string;
  documentId: string;
  fileName: string;
  page: number;
  lineIndex: number;
  rawText: string;
  category: DocumentCategory;
  confidence: number;
  correctedValue?: string;
  status?: LearningItemStatus;
  context?: string;
  detectedCategory?: DocumentCategory | 'otro';
  sourceDocument?: string;
  sourceBlock?: string;
  sourceLine?: string;
}

export type CatalogEntityType =
  | 'proveedor'
  | 'producto'
  | 'categoria'
  | 'subcategoria'
  | 'marca'
  | 'presentacion'
  | 'unidad'
  | 'sinonimo'
  | 'codigo'
  | 'diseno';

export interface MasterCatalogRecord {
  id: string;
  type: CatalogEntityType;
  name: string;
  normalizedName: string;
  aliases: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentLayout {
  provider: string;
  columns: number;
  order: string[];
  array: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeEntry {
  id?: string;
  originalText: string;
  correctedText: string;
  category: DocumentCategory;
  provider?: string;
  documentId?: string;
  page?: number;
  row?: number;
  column?: number;
  layout?: string;
  confidence: number;
  correction?: string;
  user?: string;
  date?: string;
  version?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ValidationRecord {
  id?: string;
  documentId: string;
  fieldPath: string;
  originalValue: string;
  correctedValue: string;
  category: DocumentCategory;
  confirmed: boolean;
  user?: string;
  reason?: string;
  createdAt?: string;
}

export interface ChangeRecord {
  id?: string;
  documentId: string;
  fieldPath: string;
  before: string;
  after: string;
  user?: string;
  reason?: string;
  version?: string;
  createdAt?: string;
}

export interface PendingDocumentSummary {
  id: string;
  fileName: string;
  issues: string[];
  confidenceScore: number;
}

export interface LearningSummary {
  pendingDocuments: PendingDocumentSummary[];
  pendingTokens: LearningReviewItem[];
  newLayouts: string[];
  unknownProducts: string[];
  newCategories: string[];
  lowConfidenceItems: string[];
  possibleDuplicates: string[];
  detectedSynonyms: string[];
  documentsProcessed: number;
  recordsNormalized: number;
  fieldsAutoClassified: number;
  fieldsPending: number;
  fieldsCorrected: number;
  averageConfidence: number;
  estimatedPrecision: number;
}
