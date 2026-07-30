import type {
  TempObject,
  RecordCandidate,
  NormalizedRecord,
  LearningItem
} from '../../types/smartdocs'
import { ContextEngine } from '../context/ContextEngine'
import { AutoClassifier } from '../classifier/AutoClassifier'

/**
 * Normalization Engine: receives temporary parser objects (blocks) and the
 * ContextEngine to produce fully normalized UniversalRecords.
 *
 * This module enforces that all fields exist (as required by the Universal
 * SmartDocs model) and applies light normalization (trim, number parsing).
 */
export class NormalizationEngine {
  private ctx: ContextEngine
  private classifier: AutoClassifier
  private confidenceThreshold: number

  constructor(ctx: ContextEngine) {
    this.ctx = ctx
    this.confidenceThreshold = 0.8
    this.classifier = new AutoClassifier(this.confidenceThreshold)
  }

  /**
   * Normalize accepts parser blocks and returns normalized records and a list
   * of learning items for low-confidence fields. It does NOT auto-correct
   * low-confidence fields but delegates to the `AutoClassifier` to mark
   * accepted fields vs pending ones for the Learning Center.
   */
  normalize(blocks: TempObject[]): { records: NormalizedRecord[]; pending: LearningItem[] } {
    const raw = this.ctx.processBlocks(blocks) as RecordCandidate[]
    const records: NormalizedRecord[] = []
    const pending: LearningItem[] = []

    for (const rc of raw) {
      const nr = this.normalizedFromCandidate(rc)
      // run classifier to split pending fields
      const { accepted, pending: p } = this.classifier.classify(nr)
      records.push(accepted)
      for (const item of p) pending.push(item)
    }

    return { records, pending }
  }

  public normalizedFromCandidate(rc: RecordCandidate): NormalizedRecord {
    const safeStr = (s: any) => (s === undefined || s === null ? '' : String(s).trim())

    const nr: NormalizedRecord = {
      proveedor: { value: safeStr(rc.proveedor.value), confidence: rc.proveedor.confidence },
      categoria: { value: safeStr(rc.categoria.value), confidence: rc.categoria.confidence },
      codigo: { value: safeStr(rc.codigo.value), confidence: rc.codigo.confidence },
      marca: { value: safeStr(rc.marca.value), confidence: rc.marca.confidence },
      producto: { value: safeStr(rc.producto.value), confidence: rc.producto.confidence },
      tipo: { value: safeStr(rc.tipo.value), confidence: rc.tipo.confidence },
      presentacion: { value: safeStr(rc.presentacion.value), confidence: rc.presentacion.confidence },
      cantidadBulto: { value: safeStr(rc.cantidadBulto.value), confidence: rc.cantidadBulto.confidence },
      precio: { value: rc.precio.value === null ? null : Number(rc.precio.value), confidence: rc.precio.confidence },
      page: rc.page,
      sourceText: rc.sourceText
    }

    return nr
  }
}

export default NormalizationEngine
