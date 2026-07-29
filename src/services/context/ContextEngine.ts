import type {
  DocContext,
  TempObject,
  RecordCandidate,
  FieldConfidence
} from '../../types/smartdocs'

/**
 * Context Engine maintains document-level context and emits records
 * when a complete logical row (product + presentation + price) is detected.
 *
 * This is a lightweight, testable skeleton that will be extended with
 * pattern matching, provider heuristics and persistence.
 */
export class ContextEngine {
  private context: DocContext

  constructor() {
    this.context = {}
  }

  reset() {
    this.context = {}
  }

  getContext(): DocContext {
    return { ...this.context }
  }

  // Update the current context with a TempObject that suggests
  // a specific field. Store both value and confidence so the
  // NormalizationEngine can reason about low-confidence context.
  updateFrom(obj: TempObject) {
    if (!obj.candidates) return
    for (const c of obj.candidates) {
      const val = { value: c.value, confidence: c.confidence }
      switch (c.field) {
        case 'Proveedor':
          // update if more confident than existing
          if (!this.context.proveedor || c.confidence > this.context.proveedor.confidence) this.context.proveedor = val
          break
        case 'Categoria':
          if (!this.context.categoria || c.confidence > this.context.categoria.confidence) this.context.categoria = val
          break
        case 'Producto':
          if (!this.context.producto || c.confidence > this.context.producto.confidence) this.context.producto = val
          break
        case 'Tipo':
          if (!this.context.tipo || c.confidence > this.context.tipo.confidence) this.context.tipo = val
          break
        case 'Marca':
          if (!this.context.marca || c.confidence > this.context.marca.confidence) this.context.marca = val
          break
      }
    }
  }

  /**
   * Process a sequence of blocks (parser output) and create one or more
   * UniversalRecords. This implementation uses a simple rule:
   * - update context from strong candidates
   * - when a block contains Presentation+Price candidates, emit a record
   */
  processBlocks(blocks: TempObject[]): RecordCandidate[] {
    const candidates: RecordCandidate[] = []

    for (const b of blocks) {
      // update context first
      this.updateFrom(b)

      const presList = (b.candidates || []).filter((c) => c.field === 'Presentacion')
      const priceList = (b.candidates || []).filter((c) => c.field === 'Precio')

      // If there are multiple presentations or prices, we generate combinations
      const combos: Array<{ presentacion?: FieldConfidence; precio?: FieldConfidence }> = []
      if (presList.length && priceList.length) {
        for (const p of presList) {
          for (const pr of priceList) combos.push({ presentacion: p, precio: pr })
        }
      } else if (presList.length && !priceList.length) {
        for (const p of presList) combos.push({ presentacion: p })
      } else if (!presList.length && priceList.length) {
        for (const pr of priceList) combos.push({ precio: pr })
      }

      // If there's no presentation/price combination, still produce candidate records
      if (combos.length === 0) combos.push({})

      for (const combo of combos) {
        // build record candidate by selecting best candidate per field from block or falling back to context
        const pick = (fieldName: string): { value: string; confidence: number } => {
          const fromBlock = (b.candidates || []).filter((c) => c.field === fieldName).sort((a, z) => z.confidence - a.confidence)[0]
          if (fromBlock) return { value: fromBlock.value, confidence: fromBlock.confidence }
          // fall back to context
          const ctxVal = (this.context as any)[fieldName.toLowerCase()]
          if (ctxVal) return { value: ctxVal.value, confidence: ctxVal.confidence }
          return { value: '', confidence: 0 }
        }

        const precioVal = combo.precio ? { value: Number(combo.precio.value), confidence: combo.precio.confidence } : { value: null, confidence: 0 }

        const rc: RecordCandidate = {
          proveedor: pick('Proveedor'),
          categoria: pick('Categoria'),
          codigo: pick('Codigo'),
          marca: pick('Marca'),
          producto: pick('Producto'),
          tipo: pick('Tipo'),
          presentacion: combo.presentacion ? { value: combo.presentacion.value, confidence: combo.presentacion.confidence } : pick('Presentacion'),
          cantidadBulto: pick('CantidadBulto'),
          precio: precioVal,
          page: b.page,
          sourceText: b.text
        }

        candidates.push(rc)
      }
    }

    return candidates
  }
}

export default ContextEngine
