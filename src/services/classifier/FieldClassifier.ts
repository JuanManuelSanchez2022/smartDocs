import { DocumentCategory } from '../../types/document';

export interface FieldClassificationResult {
  category: DocumentCategory;
  confidence: number;
  matchedTerm?: string;
}

export class FieldClassifier {
  private static readonly CATEGORY_KEYWORDS: Record<DocumentCategory, string[]> = {
    proveedor: ['proveedor', 'empresa', 'razón social', 'razon social', 'supplier', 'distribuidor', 'vendedor'],
    codigo: ['código', 'codigo', 'sku', 'artículo', 'articulo', 'cod.', 'cód.'],
    producto: ['producto', 'productos', 'descripcion', 'detalle', 'item', 'artículo', 'articulo'],
    presentacion: ['presentación', 'presentacion', 'envase', 'presentación', 'presentación'],
    cantidad: ['cantidad', 'cant', 'unidades', 'qty', 'cant.', 'cantidad'],
    precio: ['precio', 'valor unitario', 'p.unit', 'p.u.', 'importe', 'precio unitario', 'valor unitario'],
    marca: ['marca', 'brand'],
    categoria: ['categoría', 'categoria', 'rubro', 'segmento'],
    tipo: ['tipo', 'variante', 'serie', 'formato'],
    subcategoria: ['subcategoría', 'subcategoria', 'subrubro'],
    unidad: ['unidad', 'u.', 'u', 'unidad de medida'],
    iva: ['iva', 'alícuota', 'alicuota', 'tax'],
    moneda: ['moneda', 'pesos', 'dólares', 'dolares', 'usd', 'ars', '$'],
    precio_mayorista: ['precio mayorista', 'mayorista', 'precio por mayor'],
    precio_caja: ['precio caja', 'caja', 'precio de caja'],
    descuento: ['descuento', 'promo', 'rebaja', 'bonificación', 'bonificacion'],
    observaciones: ['observaciones', 'notas', 'comentario', 'comentarios'],
    otro: []
  };

  public static classify(text: string): FieldClassificationResult {
    const normalized = text.trim().toLowerCase();
    if (!normalized) {
      return { category: 'otro', confidence: 0.1 };
    }

    let bestCategory: DocumentCategory = 'otro';
    let bestScore = 0;

    for (const [category, keywords] of Object.entries(this.CATEGORY_KEYWORDS) as [DocumentCategory, string[]][]) {
      const score = this.scoreText(normalized, keywords);
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }

    const confidence = Math.min(0.98, Math.max(0.05, bestScore / 10));
    return {
      category: bestCategory,
      confidence,
      matchedTerm: bestCategory !== 'otro' ? normalized : undefined
    };
  }

  public static registerCategory(category: DocumentCategory, keywords: string[]): void {
    if (!this.CATEGORY_KEYWORDS[category]) {
      (this.CATEGORY_KEYWORDS as Record<string, string[]>)[category] = [];
    }
    this.CATEGORY_KEYWORDS[category].push(...keywords.map((term) => term.toLowerCase()));
  }

  public static getCategories(): DocumentCategory[] {
    return Object.keys(this.CATEGORY_KEYWORDS) as DocumentCategory[];
  }

  private static scoreText(text: string, keywords: string[]): number {
    if (keywords.length === 0) return 0;
    let score = 0;
    for (const keyword of keywords) {
      if (!keyword) continue;
      const pattern = new RegExp(`\\b${this.escapeRegExp(keyword)}\\b`, 'gi');
      const matches = text.match(pattern);
      if (matches) {
        score += matches.length * (keyword.split(' ').length + 1);
      }
    }
    return score;
  }

  private static escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
