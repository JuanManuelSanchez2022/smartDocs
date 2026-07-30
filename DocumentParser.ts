import {
  DocumentModel,
  DocumentItem,
  DocumentType,
  CAMPOS_OBLIGATORIOS_LISTA,
} from '../../types/document';

export class DocumentParser {
  /**
   * Parses raw document text into the structured DocumentModel.
   * @param text     Raw text of the document
   * @param docType  Classified document type
   */
  public static parse(text: string, docType: DocumentType): DocumentModel {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    const cuit    = this.extractCUIT(text);
    const fecha   = this.extractDate(text);
    const numero  = this.extractNumber(text);
    const empresa = this.extractEmpresa(lines);

    const total    = this.extractTotal(text);
    const iva      = this.extractIVA(text, total, docType);
    const subtotal = this.extractSubtotal(text, total, iva);

    const items = this.extractItems(lines, docType, empresa);
    const observaciones = this.extractObservaciones(text);

    // Cuenta items pendientes de revisión para el módulo de Aprendizaje
    const itemsPendientes = items.filter(i => i.pendienteRevision === true).length;

    const model: DocumentModel = {
      tipo: docType,
      empresa,
      cuit,
      fecha,
      numero,
      items,
      subtotal,
      iva,
      total,
      observaciones,
    };

    // Adjuntamos itemsPendientes al modelo para que useDocumentStore
    // lo pueda propagar a ProcessedDocument sin tener que recalcular.
    (model as any).__itemsPendientes = itemsPendientes;

    return model;
  }

  // ------------------------------------------------------------------
  // Extractores de metadatos (sin cambios respecto a versión anterior)
  // ------------------------------------------------------------------

  private static extractCUIT(text: string): string {
    const cuitRegex = /\b(20|23|24|27|30|33|34)-?(\d{8})-?(\d)\b/g;
    const match = cuitRegex.exec(text);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;

    const numericRegex = /\b\d{11}\b/;
    const numMatch = numericRegex.exec(text.replace(/[-\s]/g, ''));
    if (numMatch) {
      const c = numMatch[0];
      return `${c.slice(0, 2)}-${c.slice(2, 10)}-${c.slice(10)}`;
    }
    return '';
  }

  private static extractDate(text: string): string {
    const dateRegex = /\b(0?[1-9]|[12]\d|3[01])[/-](0?[1-9]|1[0-2])[/-](\d{2,4})\b/;
    let match = dateRegex.exec(text);
    if (match) {
      let day   = match[1].padStart(2, '0');
      let month = match[2].padStart(2, '0');
      let year  = match[3].length === 2 ? '20' + match[3] : match[3];
      return `${day}/${month}/${year}`;
    }

    const months: Record<string, string> = {
      enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
      julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
    };
    const spanishDateRegex = new RegExp(
      `\\b(0?[1-9]|[12]\\d|3[01])\\s+de\\s+(${Object.keys(months).join('|')})\\s+de\\s+(\\d{4})\\b`,
      'i'
    );
    match = spanishDateRegex.exec(text);
    if (match) {
      const day       = match[1].padStart(2, '0');
      const monthName = match[2].toLowerCase() as keyof typeof months;
      return `${day}/${months[monthName]}/${match[3]}`;
    }
    return '';
  }

  private static extractNumber(text: string): string {
    const argInvoiceNumRegex = /\b(\d{3,5})\s*[-–/]\s*(\d{7,10})\b/;
    let match = argInvoiceNumRegex.exec(text);
    if (match) return `${match[1].padStart(4, '0')}-${match[2].padStart(8, '0')}`;

    const labelRegex = /(?:nro|nº|n°|número|numero|n\.)\s*[:#]*\s*(\d+)/i;
    match = labelRegex.exec(text);
    if (match) return match[1];
    return '';
  }

  private static extractEmpresa(lines: string[]): string {
    const suffixRegex = /\b(s\.?a\.?|s\.?r\.?l\.?|s\.?h\.?|s\.?a\.?s\.?)\b/i;
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      if (suffixRegex.test(lines[i])) return this.cleanLineOfSymbols(lines[i]);
    }

    const stopwords = [
      'factura', 'remito', 'presupuesto', 'cuit', 'fecha', 'número', 'numero',
      'nro', 'original', 'duplicado', 'triplicado', 'ingresos brutos', 'i.b.', 'ib:',
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
    return line.replace(/[|:\-_=+\/\\*]/g, '').replace(/\s+/g, ' ').trim();
  }

  private static extractTotal(text: string): number {
    const regex = /total\s*(?:[a-zA-Z\s$]+)?\s*[:$]*\s*([0-9.,]+)/gi;
    let match: RegExpExecArray | null;
    let bestTotal = 0;
    while ((match = regex.exec(text)) !== null) {
      const value = this.parseNumber(match[1]);
      if (value > bestTotal) bestTotal = value;
    }
    return bestTotal;
  }

  private static extractIVA(text: string, total: number, docType: DocumentType): number {
    if (docType === 'remito') return 0;

    const ivaRegex = /(?:iva|i\.v\.a\.)\s*(?:21|10\.?5|27)?%?\s*[:$]*\s*([0-9.,]+)/i;
    const match = ivaRegex.exec(text);
    if (match) return this.parseNumber(match[1]);

    if (docType === 'factura' && total > 0) {
      return Math.round((total - total / 1.21) * 100) / 100;
    }
    return 0;
  }

  private static extractSubtotal(text: string, total: number, iva: number): number {
    const subtotalRegex = /subtotal\s*[:$]*\s*([0-9.,]+)/i;
    const match = subtotalRegex.exec(text);
    if (match) return this.parseNumber(match[1]);
    if (total > 0) return Math.max(0, Math.round((total - iva) * 100) / 100);
    return 0;
  }

  private static extractObservaciones(text: string): string {
    const obsRegex = /(?:observaciones|notas|comentario|comentarios)\s*[:]*\s*([^\n]+)/i;
    const match = obsRegex.exec(text);
    return match ? match[1].trim() : '';
  }

  // ------------------------------------------------------------------
  // parseNumber — sin cambios
  // ------------------------------------------------------------------

  private static parseNumber(str: string): number {
    let clean = str.replace(/[$\s]/g, '');
    if (clean.includes('.') && clean.includes(',')) {
      clean = clean.replace(/\./g, '').replace(/,/g, '.');
    } else if (clean.includes(',')) {
      const parts = clean.split(',');
      if (parts.length === 2 && parts[1].length <= 2) {
        clean = clean.replace(/,/g, '.');
      } else {
        clean = clean.replace(/,/g, '');
      }
    }
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }

  // ------------------------------------------------------------------
  // extractItems — bifurca por docType (sin cambios en la rama
  // factura/remito/presupuesto, solo recibe el parámetro empresa)
  // ------------------------------------------------------------------

  private static extractItems(
    lines: string[],
    docType: DocumentType,
    empresa: string
  ): DocumentItem[] {
    if (docType === 'lista_de_precios') {
      return this.extractPriceListItems(lines, empresa);
    }

    // ---- Lógica original para factura/remito/presupuesto (intacta) ----
    const items: DocumentItem[] = [];
    const footerKeywords = ['subtotal', 'iva', 'total', 'observaciones', 'condiciones', 'pagar', 'neto'];
    const headerKeywords = ['descrip', 'detalle', 'cant', 'producto', 'art', 'cód', 'precio', 'p.unit'];

    let inTable = false;

    for (let i = 0; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase();

      if (headerKeywords.some(k => lineLower.includes(k)) && !inTable) {
        inTable = true;
        continue;
      }

      if (inTable) {
        if (footerKeywords.some(k => lineLower.includes(k))) break;
        const item = this.parseItemLine(lines[i]);
        if (item) items.push(item);
      }
    }

    if (items.length === 0) {
      for (const line of lines) {
        const lineLower = line.toLowerCase();
        if (footerKeywords.some(k => lineLower.includes(k))) continue;
        const item = this.parseItemLine(line);
        if (item) items.push(item);
      }
    }

    return items;
  }

  // ------------------------------------------------------------------
  // parseItemLine — parser original para facturas/remitos (sin cambios)
  // ------------------------------------------------------------------

  private static parseItemLine(line: string): DocumentItem | null {
    const numericRegex = /(\d+(?:[.,]\d+)?)/g;
    const matches = line.match(numericRegex);
    if (!matches || matches.length < 2) return null;

    const cleanNumbers = matches.map(m => this.parseNumber(m));
    const matchPositions: { valStr: string; index: number; length: number }[] = [];
    let lastIndex = 0;
    for (const m of matches) {
      const idx = line.indexOf(m, lastIndex);
      matchPositions.push({ valStr: m, index: idx, length: m.length });
      lastIndex = idx + m.length;
    }

    if (cleanNumbers.length >= 2) {
      const cant     = cleanNumbers[0];
      const precio   = cleanNumbers[cleanNumbers.length - 2];
      const subtotal = cleanNumbers[cleanNumbers.length - 1];

      const descStartIdx = matchPositions[0].index + matchPositions[0].length;
      const descEndIdx   = matchPositions[matchPositions.length - 2].index;
      let desc = line.substring(descStartIdx, descEndIdx).trim();

      const unitRegex = /^(?:u|un|unid|unidades|kg|lts|mts|unidades)\b/i;
      const unitMatch = unitRegex.exec(desc);
      let unidad = 'u';
      if (unitMatch) {
        unidad = unitMatch[0];
        desc   = desc.substring(unidad.length).trim();
      }

      let codigo = '';
      const beforeCant = line.substring(0, matchPositions[0].index).trim();
      if (beforeCant.length > 0 && beforeCant.length < 15) codigo = beforeCant;

      if (desc.length > 2 && cant > 0 && precio > 0) {
        return {
          codigo: codigo || 'S/C',
          descripcion: desc.replace(/^[\s\-:|]+/, '').trim(),
          cantidad: cant,
          unidad: unidad || 'u',
          precio,
          subtotal: subtotal || cant * precio,
        };
      }
    }
    return null;
  }

  // ==================================================================
  // FASE 1 — Extractor dedicado para LISTAS DE PRECIOS
  // ==================================================================
  //
  // Reglas:
  // - Nunca perder una fila con precio detectable aunque falten otros campos.
  // - originalText SIEMPRE se preserva.
  // - proveedor se propaga desde empresa (DocumentModel.empresa).
  // - tokenPositions se guarda para el entrenamiento de la red neuronal.
  // - pendienteRevision se calcula contra CAMPOS_OBLIGATORIOS_LISTA.
  // ==================================================================

  private static readonly PRESENTATION_UNIT_WORDS =
    'cc|ml|mls|lts?|litros?|kg|kgs|grs?|gramos?|mts?|metros?|unid\\w*|cm3?|gr';

  private static readonly PRESENTATION_REGEX = new RegExp(
    `x\\s*(?:[\\d.,]+\\s*)?(?:${DocumentParser.PRESENTATION_UNIT_WORDS})\\b\\.?`,
    'i'
  );

  // Detecta si la línea tiene el patrón "precio sin IVA | precio con IVA"
  // típico de listas argentinas: dos números grandes al final separados
  // por espacio (con o sin columna de porcentaje alícuota entre ellos).
  // Ej: "ACEITE OLIVA X 500ML  1250,00  21%  1512,50"
  // Ej: "ACEITE OLIVA X 500ML  1250,00  1512,50"
  private static readonly DUAL_PRICE_REGEX =
    /(\d+(?:[.,]\d+)?)\s+(?:\d+(?:[.,]\d+)?\s*%\s+)?(\d+(?:[.,]\d+)?)\s*$/;

  private static extractPriceListItems(lines: string[], empresa: string): DocumentItem[] {
    const items: DocumentItem[] = [];
    for (const line of lines) {
      const item = this.parsePriceListLine(line, empresa);
      if (item) items.push(item);
    }
    return items;
  }

  private static parsePriceListLine(line: string, empresa: string): DocumentItem | null {
    // Sin letras → no es producto (puede ser una fecha u otro dato)
    if (!/[a-zA-ZÀ-ÿ]/.test(line)) return null;

    // Todos los números con su posición exacta
    const numberRegex = /\d+(?:[.,]\d+)?/g;
    const numberMatches: { valStr: string; index: number; length: number }[] = [];
    let m: RegExpExecArray | null;
    while ((m = numberRegex.exec(line)) !== null) {
      numberMatches.push({ valStr: m[0], index: m.index, length: m[0].length });
    }

    if (numberMatches.length === 0) return null;

    // ------------------------------------------------------------------
    // GAP ③ CERRADO — Detección de doble columna de precio
    // ------------------------------------------------------------------
    // Si la línea termina con el patrón "precioSinIVA [alicuota%] precioConIVA",
    // tomamos el segundo número (precio sin IVA) como precio normalizado.
    // Esto evita que el parser tome el precio con IVA, que es el mayor.
    // En los demás casos, el último número sigue siendo el precio.
    let precio = 0;
    let precioConIVA = 0;
    let lastPriceMatchIndex: number;

    const dualMatch = this.DUAL_PRICE_REGEX.exec(line);
    if (dualMatch && numberMatches.length >= 2) {
      const v1 = this.parseNumber(dualMatch[1]);
      const v2 = this.parseNumber(dualMatch[2]);
      // Validamos que v2 > v1 (precio con IVA siempre es mayor)
      // y que la diferencia sea coherente con IVAs argentinos (10.5%, 21%, 27%)
      if (v2 > v1 && v1 > 0) {
        const ratio = v2 / v1;
        const coherente = ratio >= 1.08 && ratio <= 1.30;
        if (coherente) {
          precio      = v1;
          precioConIVA = v2;
          // El índice de priceMatch que vamos a excluir de la descripción
          // es el del último número (precio con IVA)
          lastPriceMatchIndex = numberMatches.length - 1;
        }
      }
    }

    if (precio === 0) {
      // Caso general: último número es el precio
      const priceMatch = numberMatches[numberMatches.length - 1];
      precio = this.parseNumber(priceMatch.valStr);
      lastPriceMatchIndex = numberMatches.length - 1;
    }

    if (precio <= 0) return null;

    const priceMatch    = numberMatches[lastPriceMatchIndex!];
    const prevPriceMatch =
      precioConIVA > 0 ? numberMatches[lastPriceMatchIndex! - 1] : null;

    // ------------------------------------------------------------------
    // Presentación — sin cambios
    // ------------------------------------------------------------------
    const presentationMatch = this.PRESENTATION_REGEX.exec(line);
    const presentacion = presentationMatch ? presentationMatch[0].trim() : '';
    const presentationRange = presentationMatch
      ? { start: presentationMatch.index, end: presentationMatch.index + presentationMatch[0].length }
      : null;

    // ------------------------------------------------------------------
    // Código — sin cambios
    // ------------------------------------------------------------------
    let codigo    = '';
    let codigoEnd = 0;
    const leadingCodeMatch = /^(\d{1,6})\s+(?=\D)/.exec(line);
    if (leadingCodeMatch) {
      const isPriceItself =
        leadingCodeMatch[1] === priceMatch.valStr && numberMatches.length === 1;
      if (!isPriceItself) {
        codigo    = leadingCodeMatch[1];
        codigoEnd = leadingCodeMatch[0].length;
      }
    }

    // ------------------------------------------------------------------
    // Cantidad por bulto — evitamos el prevPriceMatch (precio sin IVA
    // en doble columna) para no clasificarlo como cantidadBulto
    // ------------------------------------------------------------------
    let cantidadBulto = '';
    for (const num of numberMatches) {
      if (num === priceMatch)     continue;
      if (num === prevPriceMatch) continue; // precio sin IVA, no es bulto
      const insidePresentation =
        presentationRange &&
        num.index >= presentationRange.start &&
        num.index < presentationRange.end;
      if (insidePresentation) continue;
      if (codigo && num.index < codigoEnd) continue;
      cantidadBulto = num.valStr;
      break;
    }

    // ------------------------------------------------------------------
    // Descripción — removemos precio(s), cantidadBulto, presentación y código
    // ------------------------------------------------------------------
    let descripcion = line;

    const toRemove = [priceMatch];
    if (prevPriceMatch) toRemove.push(prevPriceMatch);
    if (cantidadBulto) {
      const cantMatch = numberMatches.find(
        n => n.valStr === cantidadBulto && n !== priceMatch && n !== prevPriceMatch
      );
      if (cantMatch) toRemove.push(cantMatch);
    }
    toRemove.sort((a, b) => b.index - a.index);
    for (const rem of toRemove) {
      descripcion = descripcion.slice(0, rem.index) + descripcion.slice(rem.index + rem.length);
    }

    if (presentationMatch) {
      descripcion = descripcion.replace(presentationMatch[0], ' ');
    }
    if (codigo) {
      descripcion = descripcion.slice(codigoEnd);
    }

    descripcion = descripcion
      .replace(/["""]/g, '')
      .replace(/[-–|:]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // ------------------------------------------------------------------
    // tokenPositions — para entrenamiento de red neuronal
    // ------------------------------------------------------------------
    const lineLen = line.length || 1;
    const tokenPositions = numberMatches.map(n => ({
      valor:       n.valStr,
      posRelativa: parseFloat((n.index / lineLen).toFixed(3)),
    }));

    // ------------------------------------------------------------------
    // GAP ② CERRADO — proveedor propagado desde empresa
    // ------------------------------------------------------------------
    const item: DocumentItem = {
      codigo,
      descripcion,
      cantidad: 0,   // las listas de precios no tienen cantidad de pedido
      unidad: '',
      precio,
      subtotal: precioConIVA > 0 ? precioConIVA : precio,
      proveedor:    empresa || '',    // ← PROPAGADO
      categoria:    '',
      presentacion,
      marca:        '',
      tipo:         '',
      cantidadBulto,
      originalText: line,
      tokenPositions,
    };

    // ------------------------------------------------------------------
    // GAP ④ CERRADO — marcar pendienteRevision según campos obligatorios
    // ------------------------------------------------------------------
    const camposVacios = CAMPOS_OBLIGATORIOS_LISTA.filter(campo => {
      const val = item[campo];
      return val === undefined || val === null || val === '' || val === 0;
    });
    item.pendienteRevision = camposVacios.length > 0;

    return item;
  }
}
