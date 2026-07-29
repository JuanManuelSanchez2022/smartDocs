/**
 * TrainingManager converts user corrections into training examples and
 * persists them to a training dataset. This is a lightweight implementation
 * that uses IndexedDB or localStorage later; for now it stores in-memory
 * and exposes an async API.
 */
export interface CorrectionExample {
  textoOriginal: string
  categoriaAnterior: string
  categoriaNueva: string
  proveedor?: string
  contexto?: string
  producto?: string
  usuario?: string
  fecha: string
  confianzaAnterior?: number
}

export class TrainingManager {
  private examples: CorrectionExample[] = []

  async addCorrection(example: CorrectionExample) {
    // Do not overwrite—always append
    this.examples.push(example)
    // TODO: persist to IndexedDB / backend
    return Promise.resolve()
  }

  async listExamples(): Promise<CorrectionExample[]> {
    return Promise.resolve([...this.examples])
  }
}

export default TrainingManager
