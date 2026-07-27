import { FieldClassifier } from '../classifier/FieldClassifier';
import { NormalizerService } from '../normalizer/NormalizerService';
import {
  DocumentCategory,
  InterpretationResult,
  InterpretedField,
  DocumentItem
} from '../../types/document';

export interface InterpreterOptions {
  providerHint?: string;
  page?: number;
  layoutId?: string;
}

export class DocumentInterpreter {
  public static interpret(rawText: string, options: InterpreterOptions = {}): InterpretationResult {
    const cleaned = rawText.trim();
    const normalized = NormalizerService.normalize(cleaned).normalized;
    const lines = normalized
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const fields: InterpretedField[] = lines.map((line, index) => {
      const classification = FieldClassifier.classify(line);
      return {
        rawText: line,
        normalizedText: NormalizerService.normalize(line).normalized,
        category: classification.category,
        confidence: classification.confidence,
        row: index + 1,
        page: options.page,
        column: undefined,
        boundingBox: undefined,
        providerDetected: options.providerHint,
        layoutDetected: options.layoutId,
        confirmed: false,
        editable: true,
        metadata: {
          matchedTerm: classification.matchedTerm,
          appliedNormalization: NormalizerService.normalize(line).appliedRules
        }
      };
    });

    const provider = options.providerHint || this.detectProvider(lines);
    const categories = [...new Set(fields.map((field) => field.category))];

    return {
      fields,
      provider,
      layoutId: options.layoutId,
      categories
    };
  }

  public static registerCategory(category: DocumentCategory, keywords: string[]): void {
    FieldClassifier.registerCategory(category, keywords);
  }

  private static detectProvider(lines: string[]): string {
    const providerIndicators = ['proveedor', 'empresa', 'razón social', 'razon social', 'srl', 'sa', 'sas', 'distribuidor'];
    for (const line of lines.slice(0, 10)) {
      const lower = line.toLowerCase();
      if (providerIndicators.some((token) => lower.includes(token))) {
        return line;
      }
    }
    return '';
  }

  public static describeItem(item: DocumentItem): string {
    const base = item.descripcion || item.originalDescription || '';
    const normalized = item.normalizedDescription ? ` (${item.normalizedDescription})` : '';
    return `${base}${normalized}`.trim();
  }
}
