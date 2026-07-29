export class ProcessingLogger {
  private static logs: string[] = [];
  public static debugMode = true;

  public static log(message: string) {
    const ts = new Date().toISOString();
    const line = `[${ts}] ${message}`;
    this.logs.push(line);
    if (this.debugMode) console.debug(line);
  }

  public static getAll(): string[] {
    return [...this.logs];
  }

  public static clear(): void {
    this.logs = [];
  }
}
