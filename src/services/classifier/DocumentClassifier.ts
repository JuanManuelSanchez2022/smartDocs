import { DocumentType } from '../../types/document';

export class DocumentClassifier {
  private static readonly KEYWORDS: Record<Exclude<DocumentType, 'otro'>, string[]> = {
    factura: [
      'factura', 'invoice', 'facturación', 'cuit', 'c.u.i.t', 'condicion de venta',
      'condición de venta', 'fecha de vto', 'fecha de vencimiento', 'iva inscripto',
      'iva no inscripto', 'monotributista', 'factura a', 'factura b', 'factura c',
      'alícuota', 'ingresos brutos', 'punto de venta'
    ],
    remito: [
      'remito', 'remisión', 'recibí conforme', 'recibi conforme', 'bultos',
      'mercadería recibida', 'entregado por', 'recibido por', 'duplicado remito',
      'transportista', 'chofer', 'patente', 'firma receptor', 'remitos'
    ],
    lista_de_precios: [
      'lista de precios', 'lista general de precios', 'precios vigentes',
      'precio de lista', 'lista sugerida', 'validez de precios', 'precios unitarios',
      'precios sujetos a cambio', 'catálogo de precios'
    ],
    presupuesto: [
      'presupuesto', 'cotización', 'cotizacion', 'validez de la oferta',
      'estimado', 'propuesta comercial', 'estimación de costos', 'validez del presupuesto',
      'copia de presupuesto'
    ],
    orden_de_compra: [
      'orden de compra', 'purchase order', 'oc de compra', 'pedido de compra',
      'solicitud de compra', 'comprador', 'proveedor adjudicado', 'fecha de entrega requerida'
    ]
  };

  /**
   * Classifies a document based on raw text contents using keyword scoring.
   * @param text The raw extracted text from OCR or PDF
   */
  public static classify(text: string): DocumentType {
    if (!text) return 'otro';
    
    const normalized = text.toLowerCase();
    let bestType: DocumentType = 'otro';
    let maxScore = 0;

    for (const [type, keywords] of Object.entries(this.KEYWORDS)) {
      let score = 0;
      keywords.forEach(keyword => {
        // Count occurrences
        const regex = new RegExp(this.escapeRegExp(keyword), 'g');
        const matches = normalized.match(regex);
        if (matches) {
          score += matches.length * (keyword.includes(' ') ? 1.5 : 1.0); // weighted for multi-word phrases
        }
      });

      if (score > maxScore) {
        maxScore = score;
        bestType = type as DocumentType;
      }
    }

    // A minimum threshold to avoid false positives on very short noise texts
    return maxScore > 1 ? bestType : 'otro';
  }

  private static escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
