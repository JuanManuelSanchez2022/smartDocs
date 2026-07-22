import * as pdfjsLib from 'pdfjs-dist';

// @ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Initialize the worker local path
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface PdfTextResult {
  isDigital: boolean;
  text: string;
  pages?: string[]; // Base64 image urls if scanned
}

export class PdfService {
  /**
   * Reads a PDF from an ArrayBuffer and determines if it is digital or scanned.
   * If digital, returns the extracted text. If scanned, returns page images.
   * @param arrayBuffer The PDF file content as an ArrayBuffer
   * @param onProgress Optional callback for progress updates
   */
  public static async processPdf(
    arrayBuffer: ArrayBuffer,
    onProgress?: (progress: number, step: string) => void
  ): Promise<PdfTextResult> {
    onProgress?.(5, 'Cargando documento PDF...');
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    
    let totalText = '';
    let hasDigitalText = false;
    const extractedPagesText: string[] = [];

    onProgress?.(15, 'Analizando contenido digital del PDF...');
    // 1. Check all pages for text content
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        // @ts-ignore
        .map((item) => item.str || '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      extractedPagesText.push(pageText);
      totalText += pageText + '\n';
    }

    // Heuristic: If we extracted a reasonable amount of text (average 20 chars per page), 
    // we consider it a digital PDF.
    const averageChars = totalText.trim().length / numPages;
    if (averageChars > 20) {
      hasDigitalText = true;
      onProgress?.(100, 'Texto extraído directamente del PDF digital.');
      return {
        isDigital: true,
        text: totalText.trim(),
      };
    }

    // 2. If it has no digital text, render each page to an image canvas
    onProgress?.(30, 'El PDF parece escaneado. Renderizando páginas a imágenes...');
    const pageImages: string[] = [];
    
    for (let i = 1; i <= numPages; i++) {
      onProgress?.(
        30 + Math.round((i / numPages) * 40),
        `Renderizando página ${i} de ${numPages}...`
      );
      
      const page = await pdf.getPage(i);
      
      // Standard resolution scale (1.5x gives about 150 DPI which is good for OCR)
      const viewport = page.getViewport({ scale: 1.5 });
      
      // Create canvas in-memory
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error(`Failed to get canvas 2D context for page ${i}`);
      }
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
      
      // Convert to Base64 image
      const dataUrl = canvas.toDataURL('image/png');
      pageImages.push(dataUrl);
    }

    onProgress?.(80, 'Renderización de páginas completa.');
    return {
      isDigital: false,
      text: '',
      pages: pageImages,
    };
  }
}
