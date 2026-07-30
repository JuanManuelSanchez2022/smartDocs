import * as XLSX from 'xlsx';
import { DocumentModel, DocumentItem, CAMPOS_OBLIGATORIOS_LISTA } from '../../types/document';
import { DocumentClassifier } from '../classifier/DocumentClassifier';

export class ExcelService {
  /**
   * Procesa un archivo Excel (XLS/XLSX) y devuelve un DocumentModel.
   * Fase 1: cuando el docType es lista_de_precios, se completan los
   * campos de normalización y se marca pendienteRevision por item.
   */
  public static processExcel(arrayBuffer: ArrayBuffer, fileName: string): DocumentModel {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    let fullText = '';
    const sheetsData: Record<string, any[][]> = {};

    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const json  = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
      sheetsData[sheetName] = json;
      json.forEach(row => {
        if (Array.isArray(row)) {
          fullText += row.filter(c => c !== null && c !== undefined).join(' ') + '\n';
        }
      });
    });

    // Clasificamos pasando el nombre de archivo como hint (cierra el camino
    // donde antes el ExcelService cortocircuitaba la clasificación)
    let docType = DocumentClassifier.classify(fullText, fileName);
    if (docType === 'otro') {
      // Fallback conservador: los Excel sin keywords suelen ser listas
      docType = 'lista_de_precios';
    }

    const firstSheetName = workbook.SheetNames[0];
    const rows           = sheetsData[firstSheetName] || [];

    // ── Metadatos ────────────────────────────────────────────────────
    let empresa    = '';
    let cuit       = '';
    let fecha      = '';
    const numero   = 'Excel-' + Math.floor(1000 + Math.random() * 9000);
    const items: DocumentItem[] = [];

    const cuitRegex = /\b(20|23|24|27|30|33|34)-?(\d{8})-?(\d)\b/;
    const dateRegex = /\b(0?[1-9]|[12]\d|3[01])[/-](0?[1-9]|1[0-2])[/-](\d{2,4})\b/;

    for (let r = 0; r < Math.min(rows.length, 25); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;
      for (const cell of row) {
        const val = String(cell ?? '').trim();
        if (!val) continue;
        if (!cuit) {
          const match = cuitRegex.exec(val);
          if (match) cuit = `${match[1]}-${match[2]}-${match[3]}`;
        }
        if (!fecha) {
          const match = dateRegex.exec(val);
          if (match) fecha = val;
        }
      }
    }

    // Nombre de empresa: primera celda no-vacía no-label de la primera fila
    if (rows.length > 0 && Array.isArray(rows[0]) && rows[0].length > 0) {
      const firstCell = String(rows[0][0] ?? '').trim();
      if (
        firstCell.length > 2 &&
        !firstCell.toLowerCase().includes('cuit') &&
        !firstCell.toLowerCase().includes('fecha')
      ) {
        empresa = firstCell;
      }
    }
    if (!empresa) empresa = 'Proveedor de Planilla';

    // ── Detección de cabecera de tabla ───────────────────────────────
    let headerRowIndex = -1;
    const colMap = {
      codigo:      -1,
      descripcion: -1,
      cantidad:    -1,
      unidad:      -1,
      precio:      -1,
      precioConIVA:-1,  // ← Fase 1: columna precio con IVA
      presentacion:-1,  // ← Fase 1: columna presentación
      subtotal:    -1,
    };

    for (let r = 0; r < Math.min(rows.length, 30); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;

      row.forEach((cell, cIndex) => {
        const s = String(cell ?? '').toLowerCase();
        if (s.includes('descrip') || s.includes('detalle') || s.includes('artículo') || s.includes('producto')) {
          colMap.descripcion = cIndex;
        } else if (s.includes('cant') || s.includes('qty')) {
          colMap.cantidad = cIndex;
        } else if (
          (s.includes('precio') || s.includes('costo') || s.includes('unitario') || s.includes('p/u')) &&
          !s.includes('iva') && !s.includes('c/iva') && !s.includes('con iva')
        ) {
          colMap.precio = cIndex;
        } else if (
          s.includes('c/iva') || s.includes('con iva') || s.includes('precio iva') ||
          (s.includes('precio') && (s.includes('iva') || s.includes('final')))
        ) {
          colMap.precioConIVA = cIndex;  // ← Fase 1: columna precio con IVA
        } else if (s.includes('cód') || s.includes('cod') || s.includes('sku') || s.includes('referencia')) {
          colMap.codigo = cIndex;
        } else if (s.includes('uni') || s.includes('medida')) {
          colMap.unidad = cIndex;
        } else if (s.includes('subtotal') || s.includes('importe') || s.includes('monto')) {
          colMap.subtotal = cIndex;
        } else if (
          s.includes('present') || s.includes('envase') || s.includes('contenido')
        ) {
          colMap.presentacion = cIndex;  // ← Fase 1: columna presentación
        }
      });

      if (colMap.descripcion !== -1 && (colMap.precio !== -1 || colMap.cantidad !== -1)) {
        headerRowIndex = r;
        break;
      }
    }

    // ── Parseo de filas ───────────────────────────────────────────────
    const startRow  = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;
    let totalVal    = 0;
    let subtotalVal = 0;
    let ivaVal      = 0;

    for (let r = startRow; r < rows.length; r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;

      const descVal = colMap.descripcion !== -1
        ? String(row[colMap.descripcion] ?? '').trim()
        : '';

      if (!descVal) continue;
      const descLower = descVal.toLowerCase();
      if (descLower.includes('total') || descLower.includes('subtotal') || descLower.includes('resumen')) {
        // Intentamos capturar el total de la fila
        const nums = (row as any[]).filter(x => typeof x === 'number') as number[];
        if (nums.length > 0) totalVal = nums[nums.length - 1];
        continue;
      }

      const cantVal    = colMap.cantidad    !== -1 ? Number(row[colMap.cantidad])    : 1;
      const precioVal  = colMap.precio      !== -1 ? Number(row[colMap.precio])      : 0;
      const precioIVA  = colMap.precioConIVA !== -1 ? Number(row[colMap.precioConIVA]) : 0; // ← Fase 1
      const codVal     = colMap.codigo      !== -1 ? String(row[colMap.codigo] ?? '').trim() : '';
      const uniVal     = colMap.unidad      !== -1 ? String(row[colMap.unidad] ?? '').trim() : '';
      const subVal     = colMap.subtotal    !== -1 ? Number(row[colMap.subtotal])    : NaN;
      const presVal    = colMap.presentacion !== -1                                          // ← Fase 1
        ? String(row[colMap.presentacion] ?? '').trim()
        : '';

      if (!isNaN(precioVal) && precioVal > 0) {
        // originalText reconstruido desde la fila Excel
        const originalText = (row as any[])
          .filter(c => c !== null && c !== undefined && String(c).trim() !== '')
          .join(' | ');

        const item: DocumentItem = {
          codigo:      codVal || '',
          descripcion: descVal,
          cantidad:    isNaN(cantVal) || cantVal === 0 ? 1 : cantVal,
          unidad:      uniVal || '',
          precio:      precioVal,
          subtotal:    !isNaN(subVal) && subVal > 0
                         ? subVal
                         : (isNaN(cantVal) ? precioVal : cantVal * precioVal),
        };

        // ── Fase 1: campos de listas de precios ──────────────────────
        if (docType === 'lista_de_precios') {
          item.proveedor    = empresa;            // GAP ② cerrado
          item.presentacion = presVal;
          item.cantidadBulto = '';
          item.originalText  = originalText;
          item.categoria    = '';
          item.marca        = '';
          item.tipo         = '';

          // GAP ③ para Excel: si hay columna precioConIVA, subtotal = precioConIVA
          if (precioIVA > 0 && precioIVA > precioVal) {
            item.subtotal = precioIVA;
          }

          // tokenPositions basadas en posición de columna (normalizado por total de cols)
          const totalCols = Math.max(row.length, 1);
          item.tokenPositions = (row as any[])
            .map((cell, idx) => {
              const numStr = String(cell ?? '');
              const num    = parseFloat(numStr.replace(',', '.'));
              if (isNaN(num) || numStr.trim() === '') return null;
              return { valor: numStr, posRelativa: parseFloat((idx / totalCols).toFixed(3)) };
            })
            .filter((t): t is { valor: string; posRelativa: number } => t !== null);

          // GAP ④ cerrado: marcar items incompletos
          const camposVacios = CAMPOS_OBLIGATORIOS_LISTA.filter(campo => {
            const val = item[campo];
            return val === undefined || val === null || val === '' || val === 0;
          });
          item.pendienteRevision = camposVacios.length > 0;
        }

        items.push(item);
      }
    }

    // ── Totales ───────────────────────────────────────────────────────
    if (totalVal === 0) {
      subtotalVal = items.reduce((sum, i) => sum + i.subtotal, 0);
      if (docType === 'factura') {
        ivaVal      = Math.round(subtotalVal * 0.21 * 100) / 100;
        totalVal    = Math.round((subtotalVal + ivaVal) * 100) / 100;
      } else {
        totalVal = subtotalVal;
      }
    } else {
      if (docType === 'factura') {
        ivaVal      = Math.round((totalVal - totalVal / 1.21) * 100) / 100;
        subtotalVal = Math.round((totalVal - ivaVal) * 100) / 100;
      } else {
        subtotalVal = totalVal;
      }
    }

    if (!fecha) {
      const today = new Date();
      const dd    = String(today.getDate()).padStart(2, '0');
      const mm    = String(today.getMonth() + 1).padStart(2, '0');
      fecha = `${dd}/${mm}/${today.getFullYear()}`;
    }

    return {
      tipo: docType,
      empresa,
      cuit,
      fecha,
      numero: numero || 'Excel-' + Math.floor(1000 + Math.random() * 9000),
      items,
      subtotal: subtotalVal,
      iva:      ivaVal,
      total:    totalVal,
      observaciones: 'Importado de archivo Excel: ' + fileName,
    };
  }
}
