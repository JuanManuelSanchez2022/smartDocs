import * as XLSX from 'xlsx';
import { DocumentModel, DocumentItem, DocumentType } from '../../types/document';
import { DocumentClassifier } from '../classifier/DocumentClassifier';

export class ExcelService {
  /**
   * Processes an Excel file (XLS/XLSX) from an ArrayBuffer.
   * Extracts sheets, tables, and converts the data into a unified DocumentModel.
   * @param arrayBuffer The Excel file content as an ArrayBuffer
   * @param fileName The name of the file being processed
   */
  public static processExcel(arrayBuffer: ArrayBuffer, fileName: string): DocumentModel {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Concatenate all text in the spreadsheet to classify the document type
    let fullText = '';
    const sheetsData: Record<string, any[][]> = {};

    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
      sheetsData[sheetName] = json;
      
      // Convert to space-separated text for classification
      json.forEach(row => {
        if (Array.isArray(row)) {
          fullText += row.filter(cell => cell !== null && cell !== undefined).join(' ') + '\n';
        }
      });
    });

    // 1. Classify the document
    let docType = DocumentClassifier.classify(fullText);
    if (docType === 'otro') {
      // Excel files are usually price lists or purchase orders by default
      if (fileName.toLowerCase().includes('precio')) {
        docType = 'lista_de_precios';
      } else if (fileName.toLowerCase().includes('orden') || fileName.toLowerCase().includes('pedido')) {
        docType = 'orden_de_compra';
      } else {
        docType = 'lista_de_precios';
      }
    }

    // 2. Parse details from the first sheet (or aggregate)
    const firstSheetName = workbook.SheetNames[0];
    const rows = sheetsData[firstSheetName] || [];

    // Metadata extraction
    let empresa = '';
    let cuit = '';
    let fecha = '';
    let numero = '';
    let totalVal = 0;
    let ivaVal = 0;
    let subtotalVal = 0;
    const items: DocumentItem[] = [];

    // Find CUIT and Date inside all cells of the spreadsheet
    const cuitRegex = /\b(20|23|24|27|30|33|34)-?(\d{8})-?(\d)\b/;
    const dateRegex = /\b(0?[1-9]|[12]\d|3[01])[/-](0?[1-9]|1[0-2])[/-](\d{2,4})\b/;

    for (let r = 0; r < Math.min(rows.length, 25); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;
      
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || '').trim();
        if (!val) continue;

        // Check CUIT
        if (!cuit) {
          const match = cuitRegex.exec(val);
          if (match) {
            cuit = `${match[1]}-${match[2]}-${match[3]}`;
          }
        }

        // Check Date
        if (!fecha) {
          const match = dateRegex.exec(val);
          if (match) {
            fecha = val;
          }
        }
      }
    }

    // Try to guess company name: first cell of first row, or row 0 cell 0, if not a label
    if (rows.length > 0 && Array.isArray(rows[0]) && rows[0].length > 0) {
      const firstCell = String(rows[0][0] || '').trim();
      if (firstCell && firstCell.length > 2 && !firstCell.toLowerCase().includes('cuit') && !firstCell.toLowerCase().includes('fecha')) {
        empresa = firstCell;
      }
    }
    if (!empresa) {
      empresa = 'Proveedor de Planilla';
    }

    // Identify Table start by columns headers
    // We look for columns like "descrip", "detalle", "cantidad", "precio"
    let headerRowIndex = -1;
    let colMap = {
      codigo: -1,
      descripcion: -1,
      cantidad: -1,
      unidad: -1,
      precio: -1,
      subtotal: -1
    };

    for (let r = 0; r < Math.min(rows.length, 30); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;

      let matchCount = 0;
      row.forEach((cell, cIndex) => {
        const cellStr = String(cell || '').toLowerCase();
        if (cellStr.includes('descrip') || cellStr.includes('detalle') || cellStr.includes('artículo') || cellStr.includes('producto')) {
          colMap.descripcion = cIndex;
          matchCount++;
        } else if (cellStr.includes('cant') || cellStr.includes('unidades') || cellStr.includes('qty')) {
          colMap.cantidad = cIndex;
          matchCount++;
        } else if (cellStr.includes('precio') || cellStr.includes('p.unit') || cellStr.includes('costo') || cellStr.includes('unitario')) {
          colMap.precio = cIndex;
          matchCount++;
        } else if (cellStr.includes('cód') || cellStr.includes('cod') || cellStr.includes('sku') || cellStr.includes('referencia')) {
          colMap.codigo = cIndex;
          matchCount++;
        } else if (cellStr.includes('uni') || cellStr.includes('medida')) {
          colMap.unidad = cIndex;
          matchCount++;
        } else if (cellStr.includes('subtotal') || cellStr.includes('importe') || cellStr.includes('total row') || cellStr.includes('monto')) {
          colMap.subtotal = cIndex;
          matchCount++;
        }
      });

      // If we found at least 2 key columns (description and price/quantity), this is our header row!
      if (colMap.descripcion !== -1 && (colMap.precio !== -1 || colMap.cantidad !== -1)) {
        headerRowIndex = r;
        break;
      }
    }

    // Parse items
    const startRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;
    
    for (let r = startRow; r < rows.length; r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;

      // Extract cells based on column maps
      const descVal = colMap.descripcion !== -1 ? String(row[colMap.descripcion] || '').trim() : '';
      if (!descVal || descVal.toLowerCase().includes('total') || descVal.toLowerCase().includes('subtotal') || descVal.toLowerCase().includes('resumen')) {
        // Stop or skip if we reach total rows
        // Read totals
        row.forEach(cell => {
          const valStr = String(cell || '').toLowerCase();
          if (valStr.includes('total')) {
            // Check next cell or numeric values in this row
            const nums = row.filter(x => typeof x === 'number') as number[];
            if (nums.length > 0) {
              totalVal = nums[nums.length - 1];
            }
          }
        });
        continue;
      }

      const cantVal = colMap.cantidad !== -1 ? Number(row[colMap.cantidad]) : 1;
      const precioVal = colMap.precio !== -1 ? Number(row[colMap.precio]) : 0;
      const codVal = colMap.codigo !== -1 ? String(row[colMap.codigo] || '').trim() : 'S/C';
      const uniVal = colMap.unidad !== -1 ? String(row[colMap.unidad] || '').trim() : 'u';
      const subVal = colMap.subtotal !== -1 ? Number(row[colMap.subtotal]) : (cantVal * precioVal);

      if (descVal && !isNaN(cantVal) && !isNaN(precioVal) && precioVal > 0) {
        items.push({
          codigo: codVal || 'S/C',
          descripcion: descVal,
          cantidad: isNaN(cantVal) || cantVal === 0 ? 1 : cantVal,
          unidad: uniVal || 'u',
          precio: precioVal,
          subtotal: isNaN(subVal) ? (cantVal * precioVal) : subVal
        });
      }
    }

    // Calculate totals if not found in total rows
    if (totalVal === 0) {
      subtotalVal = items.reduce((sum, item) => sum + item.subtotal, 0);
      if (docType === 'factura') {
        ivaVal = Math.round(subtotalVal * 0.21 * 100) / 100;
        totalVal = Math.round((subtotalVal + ivaVal) * 100) / 100;
      } else {
        totalVal = subtotalVal;
      }
    } else {
      if (docType === 'factura') {
        ivaVal = Math.round((totalVal - (totalVal / 1.21)) * 100) / 100;
        subtotalVal = Math.round((totalVal - ivaVal) * 100) / 100;
      } else {
        subtotalVal = totalVal;
      }
    }

    // Format dates to DD/MM/YYYY
    if (!fecha) {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      fecha = `${dd}/${mm}/${yyyy}`;
    }

    return {
      tipo: docType,
      empresa,
      cuit,
      fecha,
      numero: numero || 'Excel-' + Math.floor(1000 + Math.random() * 9000),
      items,
      subtotal: subtotalVal,
      iva: ivaVal,
      total: totalVal,
      observaciones: 'Importado de archivo Excel: ' + fileName
    };
  }
}
