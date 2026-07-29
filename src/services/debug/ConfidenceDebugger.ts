export class ConfidenceDebugger {
  public static LOW_THRESHOLD = 0.8;

  public static isLow(confidence: number): boolean {
    return confidence < this.LOW_THRESHOLD;
  }

  public static formatPercent(confidence: number): string {
    return `${Math.round(confidence * 100)}%`;
  }
}
