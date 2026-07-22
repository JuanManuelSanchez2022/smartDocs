import { createWorker, Worker as TessWorker } from 'tesseract.js';
import { DocumentModel, DocumentType } from '../../types/document';
import { DocumentClassifier } from '../classifier/DocumentClassifier';
import { DocumentParser } from '../parser/DocumentParser';

export interface ProcessingProgress {
  percentage: number;
  step: string;
}

export class OcrService {
  private static activeTessWorker: TessWorker | null = null;
  private static activeCvWorker: Worker | null = null;
  private static isCancelled = false;

  /**
   * Run the full image processing & OCR pipeline.
   * Includes OpenCV preprocessing inside our Web Worker, then Tesseract OCR,
   * then automatic classification and structured information parsing.
   * @param imageSrc Base64 URL of the original image
   * @param options Configuration options (language, OpenCV parameters)
   * @param onProgress Callback to report steps and percentages
   */
  public static async processImage(
    imageSrc: string,
    options: {
      lang: 'spa' | 'eng';
      contrast: number;
      binarizationBlock: number;
      binarizationC: number;
    },
    onProgress: (progress: ProcessingProgress) => void
  ): Promise<{ processedImage: string; text: string; parsed: DocumentModel }> {
    this.isCancelled = false;
    onProgress({ percentage: 5, step: 'Inicializando procesador de imágenes...' });

    // 1. Preprocess image using OpenCV in Web Worker
    const processedImageData = await this.preprocessInWorker(imageSrc, options, onProgress);
    if (this.isCancelled) throw new Error('Procesamiento cancelado por el usuario');

    onProgress({ percentage: 25, step: 'Imagen optimizada con éxito. Inicializando motor OCR local...' });

    // Convert processed ImageData back to Base64 image URL (for UI preview and OCR input)
    const processedImageBase64 = this.imageDataToBase64(processedImageData);
    
    // 2. Run OCR using Tesseract.js local worker
    const extractedText = await this.runOcr(processedImageBase64, options.lang, onProgress);
    if (this.isCancelled) throw new Error('Procesamiento cancelado por el usuario');

    onProgress({ percentage: 95, step: 'Clasificando documento y extrayendo campos...' });

    // 3. Classify document and parse text
    const docType = DocumentClassifier.classify(extractedText);
    const parsedModel = DocumentParser.parse(extractedText, docType);

    onProgress({ percentage: 100, step: '¡Digitalización completa!' });

    return {
      processedImage: processedImageBase64,
      text: extractedText,
      parsed: parsedModel
    };
  }

  /**
   * Cancel the current processing job by terminating active workers.
   */
  public static cancel(): void {
    this.isCancelled = true;
    
    if (this.activeCvWorker) {
      this.activeCvWorker.terminate();
      this.activeCvWorker = null;
      console.log('OpenCV Web Worker terminado debido a cancelación.');
    }

    if (this.activeTessWorker) {
      this.activeTessWorker.terminate();
      this.activeTessWorker = null;
      console.log('Tesseract OCR Worker terminado debido a cancelación.');
    }
  }

  /**
   * Spawns our custom OpenCV Web Worker and processes the image
   */
  private static async preprocessInWorker(
    imageSrc: string,
    options: { contrast: number; binarizationBlock: number; binarizationC: number },
    onProgress: (progress: ProcessingProgress) => void
  ): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      // Create HTMLImageElement to convert Base64 into ImageData
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get 2D canvas context'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, img.width, img.height);

        // Instantiate OpenCV.js Web Worker
        // Vite syntax for worker bundle
        try {
          this.activeCvWorker = new Worker(
            new URL('../../workers/document-processor.worker.ts', import.meta.url)
          );

          this.activeCvWorker.onmessage = (event) => {
            const { type, imageData, error } = event.data;
            
            if (type === 'success' && imageData) {
              this.activeCvWorker?.terminate();
              this.activeCvWorker = null;
              resolve(imageData);
            } else {
              this.activeCvWorker?.terminate();
              this.activeCvWorker = null;
              reject(new Error(error || 'Error processing image inside Web Worker'));
            }
          };

          this.activeCvWorker.onerror = (err) => {
            this.activeCvWorker?.terminate();
            this.activeCvWorker = null;
            reject(err);
          };

          onProgress({ percentage: 10, step: 'Ejecutando filtros de OpenCV (escala de grises, contraste, perspectiva)...' });

          // Send image data to worker
          this.activeCvWorker.postMessage({
            type: 'process_image',
            imageData: imgData,
            options: {
              contrast: options.contrast,
              binarizationBlock: options.binarizationBlock,
              binarizationC: options.binarizationC
            }
          }, [imgData.data.buffer]); // Transfer buffer for zero-copy efficiency

        } catch (workerErr) {
          reject(workerErr);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load input image.'));
      };

      img.src = imageSrc;
    });
  }

  /**
   * Initializes and runs Tesseract.js using offline resources
   */
  private static async runOcr(
    imageBase64: string,
    lang: 'spa' | 'eng',
    onProgress: (progress: ProcessingProgress) => void
  ): Promise<string> {
    try {
      // Initialize Tesseract worker pointing to offline directories in /public
      this.activeTessWorker = await createWorker(lang, 1, {
        workerPath: window.location.origin + '/tesseract/worker.min.js',
        corePath: window.location.origin + '/tesseract',
        langPath: window.location.origin + '/tessdata',
        workerBlobURL: false, // Prevents fetch issue under strict browser policies
        gzip: false, // Since tessdata_fast files are downloaded uncompressed
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const progressVal = 30 + Math.round(m.progress * 60); // maps 0..1 to 30%..90%
            onProgress({
              percentage: progressVal,
              step: `Ejecutando OCR en la imagen (${Math.round(m.progress * 100)}%)...`
            });
          }
        }
      });

      if (this.isCancelled) {
        throw new Error('Procesamiento cancelado por el usuario');
      }

      const { data: { text } } = await this.activeTessWorker.recognize(imageBase64);
      
      await this.activeTessWorker.terminate();
      this.activeTessWorker = null;

      return text;
    } catch (ocrErr) {
      if (this.activeTessWorker) {
        await this.activeTessWorker.terminate();
        this.activeTessWorker = null;
      }
      throw ocrErr;
    }
  }

  /**
   * Helper: Convert ImageData back to a Base64 string URL
   */
  private static imageDataToBase64(imageData: ImageData): string {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(imageData, 0, 0);
    }
    return canvas.toDataURL('image/png');
  }
}
