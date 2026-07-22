import { DocumentModel, DocumentItem, DocumentType } from '../../types/document';

export class DocumentParser {
  /**
   * Parses raw document text into the structured DocumentModel.
   * @param text Raw text of the document
   * @param docType Classified document type
   */
  public static parse(text: string, docType: DocumentType): DocumentModel {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const cuit = this.extractCUIT(text);
    const fecha = this.extractDate(text);
    const numero = this.extractNumber(text);
    const empresa = this.extractEmpresa(lines);
    
    // Parse money values
    const total = this.extractTotal(text);
    const iva = this.extractIVA(text, total, docType);
    const subtotal = this.extractSubtotal(text, total, iva);
    
    const items = this.extractItems(lines);
    const observaciones = this.extractObservaciones(text);

    return {
      tipo: docType,
      empresa,
      cuit,
      fecha,
      numero,
      items,
      subtotal,
      iva,
      total,
      observaciones
    };
  }

  private static extractCUIT(text: string): string {
    // Argentine CUIT format: XX-XXXXXXXX-X or XXXXXXXXXXX
    const cuitRegex = /\b(20|23|24|27|30|33|34)-?(\d{8})-?(\d)\b/g;
    const match = cuitRegex.exec(text);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
    
    // Fallback: search for 11 digits
    const numericRegex = /\b\d{11}\b/;
    const numMatch = numericRegex.exec(text.replace(/[-\s]/g, ''));
    if (numMatch) {
      const c = numMatch[0];
      return `${c.slice(0, 2)}-${c.slice(2, 10)}-${c.slice(10)}`;
    }
    
    return '';
  }

  private static extractDate(text: string): string {
    // Regex for standard formats DD/MM/YYYY or DD-MM-YYYY
    const dateRegex = /\b(0?[1-9]|[12]\d|3[01])[/-](0?[1-9]|1[0-2])[/-](\d{2,4})\b/;
    let match = dateRegex.exec(text);
    if (match) {
      let day = match[1].padStart(2, '0');
      let month = match[2].padStart(2, '0');
      let year = match[3];
      if (year.length === 2) {
        year = '20' + year;
      }
      return `${day}/${month}/${year}`;
    }

    // Regex for "DD de [Mes] de YYYY"
    const months = {
      enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
      julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12'
    };
    const spanishDateRegex = new RegExp(
      `\\b(0?[1-9]|[12]\\d|3[01])\\s+de\\s+(${Object.keys(months).join('|')})\\s+de\\s+(\\d{4})\\b`,
      'i'
    );
    match = spanishDateRegex.exec(text);
    if (match) {
      const day = match[1].padStart(2, '0');
      const monthName = match[2].toLowerCase() as keyof typeof months;
      const month = months[monthName];
      const year = match[3];
      return `${day}/${month}/${year}`;
    }

    return '';
  }

  private static extractNumber(text: string): string {
    // Search for Argentine format: 0001-00001234 or similar
    const argInvoiceNumRegex = /\b(\d{3,5})\s*[-–/]\s*(\d{7,10})\b/;
    let match = argInvoiceNumRegex.exec(text);
    if (match) {
      return `${match[1].padStart(4, '0')}-${match[2].padStart(8, '0')}`;
    }

    // Search for labels like Nº, Nro, N°, Numero
    const labelRegex = /(?:nro|nº|n°|número|numero|n\.)\s*[:#]*\s*(\d+)/i;
    match = labelRegex.exec(text);
    if (match) {
      return match[1];
    }

    return '';
  }

  private static extractEmpresa(lines: string[]): string {
    // Look for lines containing SA, SRL, SH, SAS ( Argentinian corporate suffixes )
    const suffixRegex = /\b(s\.?a\.?|s\.?r\.?l\.?|s\.?h\.?|s\.?a\.?s\.?)\b/i;
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      if (suffixRegex.test(lines[i])) {
        // Clean line from symbols
        return this.cleanLineOfSymbols(lines[i]);
      }
    }

    // Otherwise, take the first line that is not a document label or metadata
    const stopwords = [
      'factura', 'remito', 'presupuesto', 'cuit', 'fecha', 'número', 'numero',
      'nro', 'original', 'duplicado', 'triplicado', 'ingresos brutos', 'i.b.', 'ib:'
    ];

    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const lineLower = lines[i].toLowerCase();
      const hasStopword = stopwords.some(stop => lineLower.includes(stop));
      if (!hasStopword && lines[i].length > 3 && !/^\d+$/.test(lines[i])) {
        return this.cleanLineOfSymbols(lines[i]);
      }
    }

    return 'Proveedor Desconocido';
  }

  private static cleanLineOfSymbols(line: string): string {
    return line
      .replace(/[|:\-_=+\/\\*]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static extractTotal(text: string): number {
    // Match strings like: Total: 1.250,50 or Total $ 1250.50
    const totalRegex = /total\s*(?:[a-zA-Z\s$]+)?\s*[:$]*\s*([0-9.,]+)/i;
    let match: RegExpExecArray | null;
    let bestTotal = 0;
    
    // We search all matches to pick the one closest to typical invoice sizes, 
    // or just the last match in the document which is usually the final total.
    const regex = new RegExp(totalRegex.source, 'gi');
    while ((match = regex.exec(text)) !== null) {
      const value = this.parseNumber(match[1]);
      if (value > bestTotal) {
        bestTotal = value;
      }
    }
    
    return bestTotal;
  }

  private static extractIVA(text: string, total: number, docType: DocumentType): number {
    if (docType === 'remito') return 0; // Remitos don't have tax values

    // Look for lines containing "IVA" or "21%" or "10.5%"
    const ivaRegex = /(?:iva|i\.v\.a\.)\s*(?:21|10\.?5|27)?%?\s*[:$]*\s*([0-9.,]+)/i;
    const match = ivaRegex.exec(text);
    if (match) {
      return this.parseNumber(match[1]);
    }

    // Default heuristic for invoices if not found: estimate 21% of subtotal or total / 1.21 * 0.21
    if (docType === 'factura' && total > 0) {
      return Math.round((total - (total / 1.21)) * 100) / 100;
    }

    return 0;
  }

  private static extractSubtotal(text: string, total: number, iva: number): number {
    const subtotalRegex = /subtotal\s*[:$]*\s*([0-9.,]+)/i;
    const match = subtotalRegex.exec(text);
    if (match) {
      return this.parseNumber(match[1]);
    }

    // Heuristic: total - iva
    if (total > 0) {
      return Math.max(0, Math.round((total - iva) * 100) / 100);
    }

    return 0;
  }

  private static extractObservaciones(text: string): string {
    const obsRegex = /(?:observaciones|notas|comentario|comentarios)\s*[:]*\s*([^\n]+)/i;
    const match = obsRegex.exec(text);
    if (match) {
      return match[1].trim();
    }
    return '';
  }

  private static parseNumber(str: string): number {
    // Remove currency signs, spaces
    let clean = str.replace(/[$\s]/g, '');
    
    // Detect format: 1.250,50 vs 1250.50
    // If it has dot and comma, replace dots with empty and commas with dot
    if (clean.includes('.') && clean.includes(',')) {
      clean = clean.replace(/\./g, '').replace(/,/g, '.');
    } else if (clean.includes(',')) {
      // If it only has a comma, check if it acts as decimal (like 1250,50)
      // Standard in Argentina is comma for decimal
      const parts = clean.split(',');
      if (parts.length === 2 && parts[1].length <= 2) {
        clean = clean.replace(/,/g, '.');
      } else {
        // Treat as thousands separator
        clean = clean.replace(/,/g, '');
      }
    }

    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }

  private static extractItems(lines: string[]): DocumentItem[] {
    const items: DocumentItem[] = [];
    
    // Stopwords that mark the end of the item table
    const footerKeywords = ['subtotal', 'iva', 'total', 'observaciones', 'condiciones', 'pagar', 'neto'];
    
    // Headers indicating start of table
    const headerKeywords = ['descrip', 'detalle', 'cant', 'producto', 'art', 'cód', 'precio', 'p.unit'];

    let inTable = false;
    let tableStartIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase();
      
      const isHeader = headerKeywords.some(keyword => lineLower.includes(keyword));
      if (isHeader && !inTable) {
        inTable = true;
        tableStartIndex = i + 1;
        continue;
      }

      if (inTable) {
        const isFooter = footerKeywords.some(keyword => lineLower.includes(keyword));
        if (isFooter) {
          break;
        }

        // Try to parse this line as an item
        const item = this.parseItemLine(lines[i]);
        if (item) {
          items.push(item);
        }
      }
    }

    // Fallback: If no header table structure detected, parse all lines that fit item formats
    if (items.length === 0) {
      for (const line of lines) {
        // Skip lines that have footer keywords
        const lineLower = line.toLowerCase();
        const isFooter = footerKeywords.some(keyword => lineLower.includes(keyword));
        if (isFooter) continue;

        const item = this.parseItemLine(line);
        if (item) {
          items.push(item);
        }
      }
    }

    return items;
  }

  private static parseItemLine(line: string): DocumentItem | null {
    // Regex looking for: [Codigo]? [Descripcion] [Cantidad] [Unidad]? [Precio] [Subtotal]?
    // Let's create a regex that matches:
    // A quantity at the start or end, followed/preceded by words, followed by one or two decimal numbers.
    // Standard row pattern: 
    // Cantidad - Descripcion - Precio Unitario - Importe
    // Example: "10 unidades Tornillos 1/2 15.50 155.00"
    // Or: "PROD100 Lapicera azul 2 45,00"
    
    // We try a general regex:
    // Group 1: Optional code at the start (alphanumeric, like AX-32 or 1234)
    // Group 2: Quantity (integer or decimal: 1 or 2.5)
    // Group 3: Optional unit (u, un, unit, kg, mts, ltr, etc.)
    // Group 4: Description (text)
    // Group 5: Price (decimal)
    // Group 6: Optional Total (decimal)
    
    // A simplified robust parser for lines:
    // Find all numbers in the line
    const numericRegex = /(\d+(?:[.,]\d+)?)/g;
    const matches = line.match(numericRegex);
    
    if (!matches || matches.length < 2) {
      return null;
    }

    // In most item lines, the quantity is the first number or one of the first.
    // Price is usually the second to last, and subtotal is the last.
    // Let's analyze the text structure.
    
    // Try to match: Cantidad | Descripcion | Precio | Total
    // Example: "5 Tornillos de acero 120.00 600.00"
    // Numbers found: ["5", "120.00", "600.00"]
    // Let's reconstruct.
    const cleanNumbers = matches.map(m => this.parseNumber(m));
    
    // Find the position of the matches in the original line
    const matchPositions = [];
    let lastIndex = 0;
    for (const m of matches) {
      const idx = line.indexOf(m, lastIndex);
      matchPositions.push({ valStr: m, index: idx, length: m.length });
      lastIndex = idx + m.length;
    }

    if (cleanNumbers.length >= 2) {
      const cant = cleanNumbers[0];
      const precio = cleanNumbers[cleanNumbers.length - 2];
      const subtotal = cleanNumbers[cleanNumbers.length - 1];

      // Description is what's in between
      const descStartIdx = matchPositions[0].index + matchPositions[0].length;
      const descEndIdx = matchPositions[matchPositions.length - 2].index;
      
      let desc = line.substring(descStartIdx, descEndIdx).trim();
      
      // Clean up description: remove units like "un", "unidades", "kg" from start
      const unitRegex = /^(?:u|un|unid|unidades|kg|lts|mts|unidades)\b/i;
      const unitMatch = unitRegex.exec(desc);
      let unidad = 'u';
      if (unitMatch) {
        unidad = unitMatch[0];
        desc = desc.substring(unidad.length).trim();
      }

      // Check if there is an item code at the beginning of the line before the quantity
      let codigo = '';
      const beforeCant = line.substring(0, matchPositions[0].index).trim();
      if (beforeCant.length > 0 && beforeCant.length < 15) {
        codigo = beforeCant;
      }

      // Validate: Description must be non-empty, and cant/precio must be greater than 0
      if (desc.length > 2 && cant > 0 && precio > 0) {
        return {
          codigo: codigo || 'S/C',
          descripcion: desc.replace(/^[\s\-:|]+/, '').trim(),
          cantidad: cant,
          unidad: unidad || 'u',
          precio: precio,
          subtotal: subtotal || (cant * precio)
        };
      }
    }

    return null;
  }
}
