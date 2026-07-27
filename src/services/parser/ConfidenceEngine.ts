import { ParsedToken } from '../../types/document';

export class ConfidenceEngine {
  public static estimate(token: ParsedToken, patternResult: { category: string; confidence: number; pattern?: string }): number {
    let value = patternResult.confidence;

    if (token.category === 'otro') {
      value = Math.min(value, 0.65);
    }

    if (token.normalizedText.length <= 2 && token.category === 'producto') {
      value = Math.max(0.45, value - 0.15);
    }

    if (/\d/.test(token.normalizedText) && token.category === 'producto') {
      value *= 0.85;
    }

    if (token.sourceSegmentId && token.rawText) {
      if (token.rawText.includes('$') && token.category === 'precio') {
        value = Math.max(value, 0.9);
      }
    }

    return Math.min(0.99, Math.max(0.1, value));
  }
}
