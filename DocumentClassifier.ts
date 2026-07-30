import { DocumentType } from '../../types/document';

export class DocumentClassifier {

  // ------------------------------------------------------------------
  // Keywords por tipo de documento
  // Fase 1: se amplió lista_de_precios con vocabulario real argentino
  // ------------------------------------------------------------------
  private static readonly KEYWORDS: Record<Exclude<DocumentType, 'otro'>, string[]> = {
    factura: [
      'factura', 'invoice', 'facturación', 'cuit', 'c.u.i.t', 'condicion de venta',
      'condición de venta', 'fecha de vto', 'fecha de vencimiento', 'iva inscripto',
      'iva no inscripto', 'monotributista', 'factura a', 'factura b', 'factura c',
      'alícuota', 'ingresos brutos', 'punto de venta',
    ],
    remito: [
      'remito', 'remisión', 'recibí conforme', 'recibi conforme', 'bultos',
      'mercadería recibida', 'entregado por', 'recibido por', 'duplicado remito',
      'transportista', 'chofer', 'patente', 'firma receptor', 'remitos',
    ],
    lista_de_precios: [
      // Encabezados explícitos — ya estaban
      'lista de precios', 'lista general de precios', 'precios vigentes',
      'precio de lista', 'lista sugerida', 'validez de precios', 'precios unitarios',
      'precios sujetos a cambio', 'catálogo de precios',

      // ── Vocabulario real argentino agregado en Fase 1 ──────────────

      // Títulos frecuentes sin la palabra "lista"
      'lista general', 'precios al', 'precios al público', 'precios al por mayor',
      'precio mayorista', 'precio minorista', 'precio de referencia',

      // Vigencia / validez
      'vigencia', 'vigente desde', 'válido hasta', 'precios válidos',
      'actualización de precios', 'lista actualizada',

      // Columnas de precio típicas en listas argentinas
      'precio neto', 'precio s/iva', 'precio sin iva', 'precio c/iva', 'precio con iva',
      'sin i.v.a', 'con i.v.a', 'neto', 'p/u', 'p. unit', 'pu', 'precio unit',
      'precio unitario',

      // Presentación / empaque
      'x unidad', 'x kg', 'x litro', 'x caja', 'por mayor', 'bulto',
      'presentación', 'presentacion',

      // Clasificaciones / rubros que encabezan secciones
      'rubro', 'categoría', 'categoria', 'línea', 'familia de productos',
    ],
    presupuesto: [
      'presupuesto', 'cotización', 'cotizacion', 'validez de la oferta',
      'estimado', 'propuesta comercial', 'estimación de costos',
      'validez del presupuesto', 'copia de presupuesto',
    ],
    orden_de_compra: [
      'orden de compra', 'purchase order', 'oc de compra', 'pedido de compra',
      'solicitud de compra', 'comprador', 'proveedor adjudicado',
      'fecha de entrega requerida',
    ],
  };

  // ------------------------------------------------------------------
  // Umbral mínimo de score para no devolver 'otro'
  // ------------------------------------------------------------------
  private static readonly MIN_SCORE = 1;

  /**
   * Clasifica un documento basándose en su texto y, como fallback,
   * en heurísticas estructurales cuando el score de keywords es bajo.
   *
   * @param text   Texto crudo extraído por OCR o de un PDF
   * @param hint   Pista externa (p.ej. nombre de archivo). Opcional.
   */
  public static classify(text: string, hint?: string): DocumentType {
    if (!text) return 'otro';

    const normalized = text.toLowerCase();

    // 1) Scoring por keywords
    let bestType: DocumentType = 'otro';
    let maxScore = 0;

    for (const [type, keywords] of Object.entries(this.KEYWORDS)) {
      let score = 0;
      for (const keyword of keywords) {
        const regex  = new RegExp(this.escapeRegExp(keyword), 'g');
        const hits   = normalized.match(regex);
        if (hits) {
          // Frases multi-palabra pesan 1.5×
          score += hits.length * (keyword.includes(' ') ? 1.5 : 1.0);
        }
      }
      if (score > maxScore) {
        maxScore = score;
        bestType = type as DocumentType;
      }
    }

    if (maxScore > this.MIN_SCORE) return bestType;

    // 2) Heurística estructural para listas de precios
    //    Aplica cuando el scoring no alcanza el umbral pero el texto
    //    parece una lista: muchas líneas con un precio al final y sin
    //    el patrón cantidad×precio=subtotal (3 números por línea con
    //    relación multiplicativa) característico de facturas.
    if (this.looksLikePriceList(text)) return 'lista_de_precios';

    // 3) Pista externa (nombre de archivo, etc.)
    if (hint) {
      const hintLower = hint.toLowerCase();
      if (hintLower.includes('precio') || hintLower.includes('lista')) {
        return 'lista_de_precios';
      }
      if (hintLower.includes('orden') || hintLower.includes('pedido')) {
        return 'orden_de_compra';
      }
      if (hintLower.includes('remito')) return 'remito';
      if (hintLower.includes('presupuesto') || hintLower.includes('cotiz')) {
        return 'presupuesto';
      }
    }

    return 'otro';
  }

  // ------------------------------------------------------------------
  // Heurística estructural
  // ------------------------------------------------------------------

  /**
   * Devuelve true si el texto parece una lista de precios basándose en
   * su estructura: al menos el 30% de las líneas con contenido tienen
   * exactamente UN número al final (precio) y sin patrón de "3 números
   * multiplicativos" que delataría una factura/remito.
   */
  private static looksLikePriceList(text: string): boolean {
    const lines = text
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && /[a-zA-ZÀ-ÿ]/.test(l));

    if (lines.length < 5) return false;

    let singlePriceLines   = 0;
    let invoicePatternLines = 0;

    const numberRegex = /\d+(?:[.,]\d+)?/g;

    for (const line of lines) {
      const nums = line.match(numberRegex) ?? [];
      if (nums.length === 0) continue;

      if (nums.length >= 3) {
        // Verificar si los 3 últimos tienen relación cant × precio ≈ subtotal
        const n = nums.map(n => this.parseNumberSimple(n));
        const last3 = n.slice(-3);
        const [a, b, c] = last3;
        if (b > 0 && Math.abs(a * b - c) / c < 0.05) {
          invoicePatternLines++;
        }
      }

      // Línea con 1 o 2 números al final → patrón lista de precios
      if (nums.length >= 1 && nums.length <= 2) {
        singlePriceLines++;
      }
    }

    const ratio = singlePriceLines / lines.length;
    // Si más del 30% de líneas son "descripción + precio" y hay pocos
    // patrones de factura, clasificamos como lista de precios.
    return ratio >= 0.30 && invoicePatternLines < 3;
  }

  private static parseNumberSimple(str: string): number {
    const clean = str.replace(/\./g, '').replace(/,/g, '.');
    return parseFloat(clean) || 0;
  }

  private static escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
