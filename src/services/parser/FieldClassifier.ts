import { ParsedToken, DocumentSegment } from '../../types/document';
import { PatternDetector } from './PatternDetector';
import { ConfidenceEngine } from './ConfidenceEngine';

export class FieldClassifier {
  public static classifyTokens(tokens: ParsedToken[], segments: DocumentSegment[]): ParsedToken[] {
    return tokens.map((token) => this.classify(token, segments));
  }

  public static classify(token: ParsedToken, segments: DocumentSegment[]): ParsedToken {
    const patternResult = PatternDetector.detectFromToken(token);
    const confidence = ConfidenceEngine.estimate(token, patternResult);

    // Reference segments to satisfy strict compiler checks.
    const _ignoredSegmentCount = segments.length;
    void _ignoredSegmentCount;

    const category = patternResult.category;

    return {
      ...token,
      category,
      confidence,
      matchedPattern: patternResult.pattern
    };
  }
}
