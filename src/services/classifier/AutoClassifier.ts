import type { NormalizedRecord, LearningItem } from '../../types/smartdocs'

/**
 * AutoClassifier: decide which fields are accepted automatically and which
 * should be sent to the Learning Center. This is intentionally modular so a
 * future ML model can replace the rules.
 */
export class AutoClassifier {
  private threshold: number

  constructor(threshold = 0.8) {
    this.threshold = threshold
  }

  /**
   * Returns accepted record (same shape) and a list of pending LearningItems
   * for fields below confidence threshold.
   */
  classify(record: NormalizedRecord): { accepted: NormalizedRecord; pending: LearningItem[] } {
    const pending: LearningItem[] = []

    const checkField = (fieldName: string, value: any, status?: string) => {
      const conf = value && typeof value.confidence === 'number' ? value.confidence : 0
      const normalizedStatus = status || (conf >= this.threshold ? 'DETECTED' : 'UNKNOWN')

      if (normalizedStatus === 'UNKNOWN' || (normalizedStatus === 'DETECTED' && conf < this.threshold)) {
        pending.push({
          texto: String(value.value || ''),
          campo: fieldName as any,
          proveedor: String(record.proveedor.value || ''),
          pagina: record.page,
          contexto: String(record.categoria.value || ''),
          categoriaSugerida: null,
          confianza: conf,
          estado: 'Pendiente'
        })
      }
    }

    checkField('Proveedor', record.proveedor, record.proveedor.status)
    checkField('Categoria', record.categoria, record.categoria.status)
    checkField('Codigo', record.codigo, record.codigo.status)
    checkField('Marca', record.marca, record.marca.status)
    checkField('Producto', record.producto, record.producto.status)
    checkField('Tipo', record.tipo, record.tipo.status)
    checkField('Presentacion', record.presentacion, record.presentacion.status)
    checkField('CantidadBulto', record.cantidadBulto, record.cantidadBulto.status)
    // precio has special shape
    const precioConf = record.precio && typeof record.precio.confidence === 'number' ? record.precio.confidence : 0
    if (record.precio.status === 'UNKNOWN' || (record.precio.status === 'DETECTED' && precioConf < this.threshold)) {
      pending.push({
        texto: String(record.precio.value ?? ''),
        campo: 'Precio',
        proveedor: String(record.proveedor.value || ''),
        pagina: record.page,
        contexto: String(record.categoria.value || ''),
        categoriaSugerida: null,
        confianza: precioConf,
        estado: 'Pendiente'
      })
    }

    return { accepted: record, pending }
  }
}

export default AutoClassifier
