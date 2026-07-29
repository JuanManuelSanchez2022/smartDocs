export type UniversalRecord = {
  proveedor: string
  categoria: string
  codigo: string
  marca: string
  producto: string
  tipo: string
  presentacion: string
  cantidadBulto: string
  precio: number | null
}

export type FieldName =
  | 'Proveedor'
  | 'Categoria'
  | 'Codigo'
  | 'Marca'
  | 'Producto'
  | 'Tipo'
  | 'Presentacion'
  | 'CantidadBulto'
  | 'Precio'

export interface FieldConfidence {
  field: FieldName
  value: string
  confidence: number // 0..1
}

export interface ContextValue {
  value: string
  confidence: number
}

export interface DocContext {
  proveedor?: ContextValue
  categoria?: ContextValue
  producto?: ContextValue
  tipo?: ContextValue
  marca?: ContextValue
}

export interface TempObject {
  // A small structure produced by the parser (blocks)
  text: string
  page: number
  bbox?: [number, number, number, number]
  candidates?: FieldConfidence[]
}

export interface RecordCandidate {
  // Values for every field (may be empty strings) with an associated confidence
  proveedor: { value: string; confidence: number }
  categoria: { value: string; confidence: number }
  codigo: { value: string; confidence: number }
  marca: { value: string; confidence: number }
  producto: { value: string; confidence: number }
  tipo: { value: string; confidence: number }
  presentacion: { value: string; confidence: number }
  cantidadBulto: { value: string; confidence: number }
  precio: { value: number | null; confidence: number }
  // provenance
  page: number
  sourceText: string
}

export interface NormalizedField {
  value: string | number | null
  confidence: number
}

export interface NormalizedRecord {
  proveedor: NormalizedField
  categoria: NormalizedField
  codigo: NormalizedField
  marca: NormalizedField
  producto: NormalizedField
  tipo: NormalizedField
  presentacion: NormalizedField
  cantidadBulto: NormalizedField
  precio: { value: number | null; confidence: number }
  // metadata
  page: number
  sourceText: string
}

export interface LearningItem {
  texto: string
  campo: FieldName | 'Precio'
  documento?: string
  proveedor?: string
  pagina?: number
  contexto?: string
  categoriaSugerida?: string | null
  confianza: number
  estado: 'Pendiente'
}
