export type FieldStatus = 'DETECTED' | 'CONFIRMED' | 'CORRECTED' | 'MISSING' | 'UNKNOWN';

export interface ParsedFieldValue {
  value: string;
  confidence: number;
  status: FieldStatus;
  evidence?: string;
}

export interface ParsedFieldNumberValue {
  value: number | null;
  confidence: number;
  status: FieldStatus;
  evidence?: string;
}

export interface ReconstructedRecord {
  rawText: string;
  product: string;
  brand: string;
  presentation: string;
  price: number;
  fields: {
    proveedor: ParsedFieldValue;
    categoria: ParsedFieldValue;
    codigo: ParsedFieldValue;
    producto: ParsedFieldValue;
    tipo: ParsedFieldValue;
    presentacion: ParsedFieldValue;
    precio: ParsedFieldNumberValue;
    marca: ParsedFieldValue;
    cantidadBulto: ParsedFieldValue;
  };
}

export class RecordReconstructor {
  public static reconstruct(rawText: string): ReconstructedRecord[] {
    const normalized = rawText.trim();
    if (!normalized) {
      return [];
    }

    const numericTokens = Array.from(normalized.matchAll(/\d[\d.,]*/g), (match) => match[0]);
    const priceToken = [...numericTokens].reverse().find((token) => {
      const numeric = token.replace(/[^0-9]/g, '');
      return numeric.length >= 3 && (token.includes(',') || token.includes('.') || numeric.length >= 4);
    }) || numericTokens[numericTokens.length - 1] || '';
    const price = priceToken ? this.parseCurrency(priceToken) : 0;

    const quotedBrandMatch = normalized.match(/"([^"]+)"/);
    const brand = quotedBrandMatch ? quotedBrandMatch[1].trim() : '';

    const presentationMatch = normalized.match(/x\s*([0-9.,]+\s*(?:cc|ml|grs?|kgs?|lt|l|un|unid|caja|cajas|pack|pallet)?)\b/i);
    const presentation = presentationMatch ? `X ${presentationMatch[0].replace(/^x\s*/i, '').trim()}` : '';

    const explicitCodeMatch = normalized.match(/^(?:c[oó]d(?:igo)?:?|art\.?|ref\.?)\s*([A-Z0-9\-_]{2,15})\s+/i);
    const leadingNumberCodeMatch = normalized.match(/^(\d{2,15})\s+/);

    let codigo = '';
    let textWithoutCode = normalized;

    if (explicitCodeMatch) {
      codigo = explicitCodeMatch[1];
      textWithoutCode = normalized.slice(explicitCodeMatch[0].length);
    } else if (leadingNumberCodeMatch) {
      codigo = leadingNumberCodeMatch[1];
      textWithoutCode = normalized.slice(leadingNumberCodeMatch[0].length);
    }

    const productPart = textWithoutCode
      .replace(/"[^"]+"/g, '')
      .replace(/x\s*[0-9.,]+\s*(?:cc|ml|grs?|kgs?|lt|l|un|unid|caja|cajas|pack|pallet)?\b/gi, '')
      .replace(/-\s*\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?/g, '')
      .replace(/\$?\s*\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?$/g, '')
      .trim();

    const product = productPart
      .split(/\s+/)
      .filter(Boolean)
      .filter((token) => !/^\$?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?$/.test(token))
      .join(' ') || textWithoutCode;

    return [
      {
        rawText: normalized,
        product,
        brand,
        presentation,
        price,
        fields: {
          proveedor: { value: '', confidence: 0, status: 'MISSING', evidence: 'no_provider_detected' },
          categoria: { value: '', confidence: 0, status: 'MISSING', evidence: 'no_category_context' },
          codigo: { value: codigo, confidence: codigo ? 0.9 : 0, status: codigo ? 'DETECTED' : 'MISSING', evidence: codigo ? 'code_pattern' : 'no_code_detected' },
          producto: { value: product || '', confidence: product ? 0.9 : 0.1, status: product ? 'DETECTED' : 'UNKNOWN', evidence: 'product_pattern' },
          tipo: { value: '', confidence: 0, status: 'MISSING', evidence: 'no_type_detected' },
          presentacion: { value: presentation || '', confidence: presentation ? 0.93 : 0.1, status: presentation ? 'DETECTED' : 'UNKNOWN', evidence: 'presentation_pattern' },
          precio: { value: price || null, confidence: price ? 0.98 : 0.1, status: price ? 'DETECTED' : 'UNKNOWN', evidence: 'price_pattern' },
          marca: { value: brand || '', confidence: brand ? 0.9 : 0.1, status: brand ? 'DETECTED' : 'UNKNOWN', evidence: 'quoted_brand_pattern' },
          cantidadBulto: { value: '', confidence: 0, status: 'MISSING', evidence: 'no_bulto_detected' }
        }
      }
    ];
  }

  private static parseCurrency(value: string): number {
    const sanitized = value.trim().replace(/\s+/g, '');
    if (!sanitized) {
      return 0;
    }

    const hasComma = sanitized.includes(',');
    const hasDot = sanitized.includes('.');

    if (hasComma && hasDot) {
      const lastComma = sanitized.lastIndexOf(',');
      const lastDot = sanitized.lastIndexOf('.');
      const decimalSeparator = lastComma > lastDot ? ',' : '.';
      const normalized = decimalSeparator === ','
        ? sanitized.replace(/\./g, '').replace(/,/g, '.')
        : sanitized.replace(/,/g, '');
      const parsed = Number.parseFloat(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    if (hasComma) {
      const parts = sanitized.split(',');
      if (parts.length === 2) {
        const fractional = parts[1];
        if (fractional.length <= 2) {
          const parsed = Number.parseFloat(`${parts[0].replace(/\./g, '')}.${fractional}`);
          return Number.isFinite(parsed) ? parsed : 0;
        }
      }

      const parsed = Number.parseFloat(sanitized.replace(/,/g, ''));
      return Number.isFinite(parsed) ? parsed : 0;
    }

    if (hasDot) {
      const parts = sanitized.split('.');
      if (parts.length > 1) {
        const lastPart = parts[parts.length - 1];
        if (lastPart.length <= 2) {
          const parsed = Number.parseFloat(parts.join('.'));
          return Number.isFinite(parsed) ? parsed : 0;
        }
      }

      const parsed = Number.parseFloat(sanitized.replace(/\./g, ''));
      return Number.isFinite(parsed) ? parsed : 0;
    }

    const parsed = Number.parseFloat(sanitized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
