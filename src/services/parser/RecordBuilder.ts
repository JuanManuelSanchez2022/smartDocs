import { DocumentSegment, ParsedRecord, ParsedToken } from '../../types/document';
import { NormalizerService } from '../normalizer/NormalizerService';

const QUANTITY_RANGE_REGEX = /^(\d+(?:[.,]\d+)?)\s*(un|unid(?:ades)?|unidad(?:es)?|u|pack|pallet|par|pares?)\b/i;
const PRICE_VALUE_REGEX = /[0-9]+(?:[.,][0-9]{2})?/;
const PRESENTATION_REGEX = /\b(\d+(?:[.,]\d+)?\s*(?:grs?|gr|kgs?|kg|lt|l|ml|mls?))\b/i;

export class RecordBuilder {
  public static buildRecords(tokens: ParsedToken[], segments: DocumentSegment[], provider: string): ParsedRecord[] {
    const validSegmentIds = new Set(
      segments
        .filter((segment) => segment.type === 'table' || segment.type === 'line')
        .map((segment) => segment.id)
    );

    const tokensByLine = new Map<string, { page: number; lineIndex: number; segmentId: string; originalText: string; tokens: ParsedToken[] }>();

    tokens.forEach((token) => {
      if (!validSegmentIds.has(token.sourceSegmentId)) return;
      const key = `${token.page}_${token.lineIndex}`;
      const entry = tokensByLine.get(key) || {
        page: token.page,
        lineIndex: token.lineIndex,
        segmentId: token.sourceSegmentId,
        originalText: token.originalSegmentText,
        tokens: [] as ParsedToken[]
      };

      entry.tokens.push(token);
      tokensByLine.set(key, entry);
    });

    const records: ParsedRecord[] = [];

    for (const entry of tokensByLine.values()) {
      const { tokens: lineTokens, originalText, page, lineIndex } = entry;
      const priceToken = lineTokens.find((token) => token.category === 'precio');
      const quantityToken = lineTokens.find((token) => token.category === 'cantidad');
      const presentationToken = lineTokens.find((token) => token.category === 'presentacion');
      const codeToken = lineTokens.find((token) => token.category === 'codigo');
      const productToken = lineTokens.find((token) => token.category === 'producto');

      const candidateTokens = lineTokens.filter((token) => token.category !== 'otro');
      if (candidateTokens.length === 0) continue;
      if (!priceToken && !productToken) continue;

      const codigo = codeToken?.rawText || '';
      const presentacion = presentationToken?.rawText || this.findPresentationFallback(lineTokens);
      const cantidad = quantityToken?.rawText || this.findQuantityFallback(lineTokens);
      const precio = priceToken ? this.parsePrice(priceToken.rawText) : 0;

      const producto = productToken?.rawText || this.findProductFallback(lineTokens, priceToken, quantityToken, presentationToken);
      if (!producto || producto.trim().length === 0) continue;

      const normalizedText = NormalizerService.normalize(originalText).normalized;
      const confidence = this.computeRecordConfidence(lineTokens);

      records.push({
        id: `record_${page}_${lineIndex}`,
        proveedor: provider || 'Proveedor Desconocido',
        codigo,
        producto: producto.trim(),
        presentacion: presentacion.trim(),
        cantidad: cantidad.trim(),
        precio,
        originalText: originalText.trim(),
        normalizedText,
        lineIndex,
        page,
        confidence,
        tokens: lineTokens
      });
    }

    return records;
  }

  private static parsePrice(value: string): number {
    const match = PRICE_VALUE_REGEX.exec(value.replace(/\s+/g, ''));
    if (!match) return 0;
    const cleaned = match[0].replace(/\./g, '').replace(/,/g, '.');
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private static computeRecordConfidence(tokens: ParsedToken[]): number {
    if (tokens.length === 0) return 0.1;
    const total = tokens.reduce((sum, token) => sum + token.confidence, 0);
    return Math.min(0.99, Math.max(0.1, total / tokens.length));
  }

  private static findProductFallback(tokens: ParsedToken[], priceToken?: ParsedToken, quantityToken?: ParsedToken, presentationToken?: ParsedToken): string {
    const nonProductTokens = new Set([priceToken?.id, quantityToken?.id, presentationToken?.id]);
    const productCandidate = tokens.find((token) => !nonProductTokens.has(token.id) && !/^[\d$.]+$/.test(token.rawText));
    return productCandidate?.rawText || '';
  }

  private static findQuantityFallback(tokens: ParsedToken[]): string {
    const quantityGuess = tokens.find((token) => QUANTITY_RANGE_REGEX.test(token.rawText));
    return quantityGuess?.rawText || '';
  }

  private static findPresentationFallback(tokens: ParsedToken[]): string {
    const presentationGuess = tokens.find((token) => PRESENTATION_REGEX.test(token.rawText));
    return presentationGuess?.rawText || '';
  }
}
