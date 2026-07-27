import { DocumentCategory, DocumentSegment, ParsedToken } from '../../types/document';

const HEADER_KEYWORDS = [
  'producto',
  'codigo',
  'código',
  'precio',
  'cantidad',
  'presentación',
  'presentacion',
  'proveedor',
  'marca',
  'categoria',
  'categoría'
];

const FOOTER_PATTERNS = [
  /\b(subtotal|iva|total|observaciones|condiciones|forma de pago|pago|vencimiento|neto)\b/i
];

export class PatternDetector {
  private static readonly weightRegex = /^(\d+(?:[.,]\d+)?)\s*(grs?|gr|g|kgs?|kg|lt|l|ml|mls?)\b/i;
  private static readonly quantityRegex = /^(\d+(?:[.,]\d+)?)\s*(un|unid(?:ades)?|unidad(?:es)?|u|pack|pallet|par|pares?)\b/i;
  private static readonly priceRegex = /^\$?\s*\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?$/i;
  private static readonly codeRegex = /^[A-Z0-9\-]{3,}$/i;
  private static readonly providerHintRegex = /\b(proveedor|empresa|raz[oó]n social|distribuidor|vendedor|srl|sa|sas)\b/i;

  public static detectFromToken(token: ParsedToken): { category: DocumentCategory; confidence: number; pattern?: string } {
    const text = token.normalizedText.trim();
    if (!text) {
      return { category: 'otro', confidence: 0.1 };
    }

    if (this.priceRegex.test(text)) {
      return { category: 'precio', confidence: 0.98, pattern: 'price' };
    }

    if (this.weightRegex.test(text)) {
      return { category: 'presentacion', confidence: 0.95, pattern: 'weight' };
    }

    if (this.quantityRegex.test(text)) {
      return { category: 'cantidad', confidence: 0.95, pattern: 'quantity' };
    }

    if (this.codeRegex.test(text) && /\d/.test(text)) {
      return { category: 'codigo', confidence: 0.9, pattern: 'code' };
    }

    if (token.sourceSegmentId && token.originalSegmentText) {
      const segmentText = token.originalSegmentText.toLowerCase();
      if (this.providerHintRegex.test(segmentText) && token.columnIndex < 5) {
        return { category: 'proveedor', confidence: 0.9, pattern: 'provider' };
      }
    }

    if (text.length > 2 && !/^[\d$.]+$/.test(text)) {
      return { category: 'producto', confidence: 0.72, pattern: 'product' };
    }

    return { category: 'otro', confidence: 0.4, pattern: 'unknown' };
  }

  public static detectProvider(segments: DocumentSegment[]): string {
    const candidate = segments.find((segment) => {
      const normalized = segment.text.toLowerCase();
      return (
        segment.type === 'line' &&
        normalized.length > 10 &&
        !this.isFooter(normalized) &&
        !this.isHeader(normalized)
      );
    });

    if (!candidate) {
      return '';
    }

    const text = candidate.text.trim();
    if (text.split(/\s+/).length > 2 && /[A-ZÁÉÍÓÚÜÑ]/.test(text)) {
      return text;
    }

    return candidate.text;
  }

  private static isHeader(normalized: string): boolean {
    return HEADER_KEYWORDS.some((keyword) => normalized.includes(keyword));
  }

  private static isFooter(normalized: string): boolean {
    return FOOTER_PATTERNS.some((pattern) => pattern.test(normalized));
  }
}
