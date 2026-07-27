import { DocumentSegment, ParsedToken } from '../../types/document';
import { NormalizerService } from '../normalizer/NormalizerService';

export class TokenExtractor {
  public static extract(segment: DocumentSegment): ParsedToken[] {
    const rawTokens = segment.text
      .split(/\s+|\||;|\t|\u2022|\u00B7|,/)
      .map((token) => token.trim())
      .filter((token) => token.length > 0);

    return rawTokens.map((token, index) => {
      const cleanedText = token.replace(/^[^\w$]+|[^\w%]+$/g, '').trim();
      const normalizedText = NormalizerService.normalize(cleanedText).normalized;

      return {
        id: `${segment.id}_token_${index}`,
        rawText: token,
        normalizedText: normalizedText || token,
        category: 'otro',
        confidence: 0,
        lineIndex: segment.lineIndex,
        columnIndex: index,
        page: segment.page,
        tokenIndex: index,
        positionX: index,
        positionY: segment.lineIndex,
        sourceSegmentId: segment.id,
        boundingBox: undefined,
        providerDetected: undefined,
        layoutDetected: undefined,
        matchedPattern: undefined,
        originalSegmentText: segment.text
      };
    });
  }

  public static extractAll(segments: DocumentSegment[]): ParsedToken[] {
    return segments.flatMap((segment) => this.extract(segment));
  }
}
