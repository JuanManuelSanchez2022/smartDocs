import { DocumentSegment, ParserSegmentType } from '../../types/document';

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
  'subtotal',
  'iva'
];

const IGNORE_PATTERNS: RegExp[] = [
  /\b(?:tel[eé]fono|telefono|celular|e-mail|email|contacto)\b/i,
  /\b(?:los precios no incluyen iva|no incluyen iva|precios sujetos a cambio|precios vigentes|sujeto a cambio)\b/i,
  /\b(?:www\.|http:\/\/|https:\/\/|@)\b/i,
  /^[\s\-–—\|\*•·]+$/,
  /^[\d\s\(\)\-\+\.]{6,}$/
];

const FOOTER_PATTERNS: RegExp[] = [
  /\b(?:subtotal|iva|total|observaciones|condiciones|forma de pago|forma de pago|pago|vencimiento|neto)\b/i
];

const TABLE_LINE_REGEX = /\d+[\.,]?\d*\s*(?:un|unid|unidad|kg|kgs|lt|l|g|gr|grs)?\b|\$?\d+[\.,]\d{2}/i;

export class DocumentSegmenter {
  public static segment(rawText: string, page = 1): DocumentSegment[] {
    const lines = rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const repeatedHeaders = this.findRepeatedHeaders(lines);

    return lines.map((text, index) => {
      const lineIndex = index + 1;
      const normalized = text.toLowerCase();
      const segmentType = this.determineSegmentType(text, normalized, repeatedHeaders);
      return {
        id: `segment_${page}_${lineIndex}`,
        type: segmentType,
        text,
        lineIndex,
        page,
        isRepeatedHeader: repeatedHeaders.has(text),
        metadata: {
          words: text.split(/\s+/).length,
          repeatedHeader: repeatedHeaders.has(text)
        }
      };
    });
  }

  private static findRepeatedHeaders(lines: string[]): Set<string> {
    const candidates = new Set<string>();
    const seen = new Set<string>();

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (seen.has(trimmed) && this.isHeaderLine(trimmed.toLowerCase())) {
        candidates.add(trimmed);
      }
      seen.add(trimmed);
    });

    return candidates;
  }

  private static determineSegmentType(text: string, normalized: string, repeatedHeaders: Set<string>): ParserSegmentType {
    if (this.isIgnored(text, normalized)) {
      return 'ignored';
    }

    if (repeatedHeaders.has(text) || this.isHeaderLine(normalized)) {
      return 'header';
    }

    if (this.isFooterLine(normalized)) {
      return 'footer';
    }

    if (this.isTableLine(text)) {
      return 'table';
    }

    if (text.length > 0 && text === text.toUpperCase() && text.split(/\s+/).length <= 6 && HEADER_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
      return 'subheader';
    }

    return 'line';
  }

  private static isIgnored(text: string, normalized: string): boolean {
    return IGNORE_PATTERNS.some((pattern) => pattern.test(text) || pattern.test(normalized));
  }

  private static isHeaderLine(normalized: string): boolean {
    const keywordMatches = HEADER_KEYWORDS.filter((keyword) => normalized.includes(keyword));
    const numericParts = normalized.match(/\d+/g) || [];
    return keywordMatches.length >= 2 || (keywordMatches.length >= 1 && numericParts.length >= 2);
  }

  private static isFooterLine(normalized: string): boolean {
    return FOOTER_PATTERNS.some((pattern) => pattern.test(normalized));
  }

  private static isTableLine(text: string): boolean {
    const numericParts = text.match(/\d+/g) || [];
    if (numericParts.length === 0) return false;
    const hasPricePattern = /\$?\s*\d+(?:[.,]\d+)?/.test(text);
    return hasPricePattern || TABLE_LINE_REGEX.test(text);
  }
}
