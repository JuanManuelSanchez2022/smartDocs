export interface NormalizerRule {
  id: string;
  description?: string;
  pattern: RegExp;
  replacement: string;
  active?: boolean;
}

export interface NormalizationResult {
  original: string;
  normalized: string;
  appliedRules: string[];
}

export class NormalizerService {
  private static rules: NormalizerRule[] = [
    {
      id: 'unit-grams',
      description: 'Normaliza gramos y variantes a g',
      pattern: /\b(\d+[\.,]?\d*)\s*(gs|grs|gr)\b/gi,
      replacement: '$1 g',
      active: true
    },
    {
      id: 'aceituna-sinonimo',
      description: 'Normaliza variantes de aceituna',
      pattern: /\baceit\b/gi,
      replacement: 'aceituna',
      active: true
    },
    {
      id: 'numero-abbreviation',
      description: 'Normaliza abreviaturas de número',
      pattern: /\bN[º°]?\b/gi,
      replacement: 'Número',
      active: true
    },
    {
      id: 'multiple-spaces',
      description: 'Elimina espacios extra',
      pattern: /\s{2,}/g,
      replacement: ' ',
      active: true
    }
  ];

  public static normalize(text: string): NormalizationResult {
    let normalized = text;
    const appliedRules: string[] = [];

    for (const rule of this.rules) {
      if (!rule.active) continue;
      const before = normalized;
      normalized = normalized.replace(rule.pattern, rule.replacement);
      if (normalized !== before) {
        appliedRules.push(rule.id);
      }
    }

    normalized = normalized.trim();

    return {
      original: text,
      normalized,
      appliedRules
    };
  }

  public static registerRule(rule: NormalizerRule): void {
    this.rules = [...this.rules, { ...rule, active: true }];
  }

  public static getRules(): NormalizerRule[] {
    return [...this.rules];
  }

  public static disableRule(id: string): void {
    this.rules = this.rules.map((rule) => ({
      ...rule,
      active: rule.id === id ? false : rule.active
    }));
  }
}
