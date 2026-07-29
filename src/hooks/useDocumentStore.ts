import { create } from 'zustand';
import { ProcessedDocument, DocumentModel, ParserDebugSnapshot, ParsedRecord, InterpretationResult, DocumentSegment, ParsedToken } from '../types/document';
import { IndexedDBStore } from '../services/storage/IndexedDBStore';
import { OcrService } from '../services/ocr/OcrService';
import { PdfService } from '../services/pdf/PdfService';
import { ExcelService } from '../services/excel/ExcelService';
import { DocumentClassifier } from '../services/classifier/DocumentClassifier';
import { DocumentParser } from '../services/parser/DocumentParser';
import { WordService } from '../services/word/WordService';

const storage = new IndexedDBStore();

const markLearningFields = (interpretation?: InterpretationResult): InterpretationResult | undefined => {
  if (!interpretation) {
    return undefined;
  }

  return {
    ...interpretation,
    fields: interpretation.fields.map((field) => {
      const autoAccepted = field.confidence >= 0.8;
      const nextStatus = field.status || (autoAccepted ? 'ACCEPTED' : field.rawText ? 'PENDING' : 'NO_DATA');
      return {
        ...field,
        status: nextStatus as any,
        confirmed: (field.confirmed ?? false) || nextStatus === 'ACCEPTED' || nextStatus === 'CORRECTED',
        editable: field.editable ?? true
      };
    })
  };
};

export interface AppConfig {
  ocrLang: 'spa' | 'eng';
  contrast: number;
  binarizationBlock: number;
  binarizationC: number;
  darkMode: boolean;
}

export interface ProcessingState {
  status: 'idle' | 'processing' | 'success' | 'failed';
  progress: number;
  step: string;
  result: ProcessedDocument | null;
  errorMessage: string;
}

interface DocumentStore {
  documents: ProcessedDocument[];
  config: AppConfig;
  processing: ProcessingState;
  
  loadHistory: () => Promise<void>;
  processFile: (fileOrUrl: File | string, customName?: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  cancelProcessing: () => void;
  updateConfig: (newConfig: Partial<AppConfig>) => void;
  updateDocument: (id: string, updates: Partial<ProcessedDocument>) => void;
  resetProcessing: () => void;
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  documents: [],
  config: {
    ocrLang: 'spa',
    contrast: 1.2,
    binarizationBlock: 15,
    binarizationC: 5,
    darkMode: true
  },
  processing: {
    status: 'idle',
    progress: 0,
    step: '',
    result: null,
    errorMessage: ''
  },

  loadHistory: async () => {
    try {
      const list = await storage.getAllDocuments();
      set({ documents: list });
    } catch (err) {
      console.error('Error loading history:', err);
    }
  },

  processFile: async (fileOrUrl: File | string, customName?: string) => {
    set({
      processing: {
        status: 'processing',
        progress: 0,
        step: 'Iniciando procesamiento de archivo...',
        result: null,
        errorMessage: ''
      }
    });

    const config = get().config;
    let fileName = customName || 'Documento';
    let fileSize = 0;
    let fileType = 'image/png';
    let docId = Math.random().toString(36).substring(2, 11);

    try {
      let documentModel: DocumentModel;
      let rawText = '';
      let originalImage = '';
      let processedImage = '';
      let parserDebug: ParserDebugSnapshot | undefined;
      let parsedRecords: ParsedRecord[] | undefined;
      let interpretation: InterpretationResult | undefined;
      let segments: DocumentSegment[] | undefined;
      let tokens: ParsedToken[] | undefined;

      if (fileOrUrl instanceof File) {
        fileName = fileOrUrl.name;
        fileSize = fileOrUrl.size;
        fileType = fileOrUrl.type;

        const extension = fileName.split('.').pop()?.toLowerCase();

        // 1. Process EXCEL
        if (extension === 'xlsx' || extension === 'xls') {
          set({ processing: { ...get().processing, progress: 20, step: 'Leyendo planilla Excel...' } });
          const arrayBuffer = await fileOrUrl.arrayBuffer();
          documentModel = ExcelService.processExcel(arrayBuffer, fileName);
          rawText = JSON.stringify(documentModel, null, 2);
          set({ processing: { ...get().processing, progress: 80, step: 'Planilla procesada con éxito.' } });
        } 
        
        // 2. Process PDF
        else if (extension === 'pdf') {
          const arrayBuffer = await fileOrUrl.arrayBuffer();
          
          const pdfResult = await PdfService.processPdf(arrayBuffer, (p, s) => {
            set({ processing: { ...get().processing, progress: Math.round(p * 0.4), step: s } });
          });

          if (pdfResult.isDigital) {
            // Digital PDF: parse text directly with debug parser
            rawText = pdfResult.text;
            const docType = DocumentClassifier.classify(rawText);
            const parseResult = DocumentParser.debug(rawText, docType);
            documentModel = parseResult.documentModel;
            parserDebug = parseResult.debugInfo;
            parsedRecords = parseResult.records;
            interpretation = parseResult.interpretation;
            // Store segments and tokens for inspector transparency
            (parserDebug as any) && (parserDebug); // keep linter quiet
            // attach segments/tokens
            segments = parseResult.segments;
            tokens = parseResult.tokens;
          } else if (pdfResult.pages && pdfResult.pages.length > 0) {
            // Scanned PDF: OCR on each rendered page
            const totalPages = pdfResult.pages.length;
            let fullPdfText = '';
            
            for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
              set({
                processing: {
                  ...get().processing,
                  progress: 40 + Math.round((pageIdx / totalPages) * 50),
                  step: `Procesando página ${pageIdx + 1} de ${totalPages} con OCR local...`
                }
              });

              const pageImg = pdfResult.pages[pageIdx];
              const ocrRes = await OcrService.processImage(pageImg, {
                lang: config.ocrLang,
                contrast: config.contrast,
                binarizationBlock: config.binarizationBlock,
                binarizationC: config.binarizationC
              }, (p) => {
                // Nested progress reporting for the current page
                const innerProgress = 40 + Math.round((pageIdx / totalPages) * 50) + Math.round((p.percentage / 100) * (50 / totalPages));
                set({
                  processing: {
                    ...get().processing,
                    progress: Math.min(94, innerProgress),
                    step: `Pág. ${pageIdx + 1}/${totalPages}: ${p.step}`
                  }
                });
              });

              fullPdfText += ocrRes.text + '\n';
              if (pageIdx === 0) {
                originalImage = pageImg; // Use first page as original cover
                processedImage = ocrRes.processedImage; // First page as processed cover
              }
            }

            rawText = fullPdfText.trim();
            const docType = DocumentClassifier.classify(rawText);
            const parseResult = DocumentParser.debug(rawText, docType);
            documentModel = parseResult.documentModel;
            parserDebug = parseResult.debugInfo;
            parsedRecords = parseResult.records;
            interpretation = parseResult.interpretation;
            segments = parseResult.segments;
            tokens = parseResult.tokens;
          } else {
            throw new Error('El PDF no pudo ser procesado.');
          }
        } 
        
        // 3. Process IMAGE (JPG, PNG, etc)
        else if (fileOrUrl.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(extension || '')) {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(fileOrUrl);
          });
          
          originalImage = await base64Promise;
          
          const ocrRes = await OcrService.processImage(originalImage, {
            lang: config.ocrLang,
            contrast: config.contrast,
            binarizationBlock: config.binarizationBlock,
            binarizationC: config.binarizationC
          }, (p) => {
            set({ processing: { ...get().processing, progress: p.percentage, step: p.step } });
          });

          processedImage = ocrRes.processedImage;
          rawText = ocrRes.text;
          documentModel = ocrRes.parsed;
          parserDebug = ocrRes.parserDebug;
          parsedRecords = ocrRes.parsedRecords;
          interpretation = markLearningFields(ocrRes.interpretation);
          // include segments/tokens from OCR result (if present)
          segments = (ocrRes as any).segments;
          tokens = (ocrRes as any).tokens;
        }
        // 4. Process WORD
        else if (extension === 'docx') {
          set({ processing: { ...get().processing, progress: 20, step: 'Extrayendo texto de archivo Word (.docx)...' } });
          const arrayBuffer = await fileOrUrl.arrayBuffer();
          const wordResult = await WordService.processWord(arrayBuffer);
          documentModel = wordResult.parsed;
          rawText = wordResult.text;
          parserDebug = wordResult.parserDebug;
          parsedRecords = wordResult.parsedRecords;
          interpretation = markLearningFields(wordResult.interpretation);
          segments = (wordResult as any).segments;
          tokens = (wordResult as any).tokens;
          set({ processing: { ...get().processing, progress: 80, step: 'Documento Word procesado con éxito.' } });
        }
        else if (extension === 'doc') {
          throw new Error('El formato .doc antiguo no está soportado directamente. Por favor, conviértelo a .docx (Word moderno) y vuelve a cargarlo.');
        } else {
          throw new Error('Tipo de archivo no soportado. Cargue JPG, PNG, PDF, Excel o Word.');
        }

      } else {
        // fileOrUrl is a string Base64 (from camera capture)
        originalImage = fileOrUrl;
        fileSize = Math.round((fileOrUrl.length * 3) / 4); // Estimate size in bytes
        
        const ocrRes = await OcrService.processImage(originalImage, {
          lang: config.ocrLang,
          contrast: config.contrast,
          binarizationBlock: config.binarizationBlock,
          binarizationC: config.binarizationC
        }, (p) => {
          set({ processing: { ...get().processing, progress: p.percentage, step: p.step } });
        });

        processedImage = ocrRes.processedImage;
        rawText = ocrRes.text;
        documentModel = ocrRes.parsed;
        parserDebug = ocrRes.parserDebug;
        parsedRecords = ocrRes.parsedRecords;
        interpretation = markLearningFields(ocrRes.interpretation);
      }

      // Save successful result to history
      const processedDoc: ProcessedDocument = {
        id: docId,
        fileName,
        fileSize,
        fileType,
        processedAt: new Date().toISOString(),
        status: 'success',
        rawText,
        originalImage,
        processedImage,
        extractedData: documentModel,
        parserDebug,
        parsedRecords,
        interpretation
        ,
        segments,
        tokens
      };

      await storage.saveDocument(processedDoc);
      await get().loadHistory();

      set({
        processing: {
          status: 'success',
          progress: 100,
          step: '¡Documento digitalizado con éxito!',
          result: processedDoc,
          errorMessage: ''
        }
      });

    } catch (err: any) {
      console.error('Error processing file:', err);
      
      const failedDoc: ProcessedDocument = {
        id: docId,
        fileName,
        fileSize,
        fileType,
        processedAt: new Date().toISOString(),
        status: 'failed',
        errorMessage: err.message || 'Error desconocido durante la digitalización.',
        extractedData: {
          tipo: 'otro',
          empresa: 'Error',
          cuit: '',
          fecha: '',
          numero: '',
          items: [],
          subtotal: 0,
          iva: 0,
          total: 0,
          observaciones: err.message || 'Fallo en la extracción.'
        }
      };

      set({
        processing: {
          status: 'failed',
          progress: 100,
          step: 'Error durante el procesamiento.',
          result: failedDoc,
          errorMessage: err.message || 'Error desconocido.'
        }
      });
    }
  },

  deleteDocument: async (id: string) => {
    try {
      await storage.deleteDocument(id);
      await get().loadHistory();
    } catch (err) {
      console.error('Error deleting document:', err);
    }
  },

  updateDocument: async (id: string, updates: Partial<ProcessedDocument>) => {
    const current = get().documents.find((doc) => doc.id === id);
    if (!current) {
      return;
    }

    const nextDoc = { ...current, ...updates };
    set((state) => ({
      documents: state.documents.map((doc) => (doc.id === id ? nextDoc : doc))
    }));

    try {
      await storage.saveDocument(nextDoc);
    } catch (err) {
      console.error('Error persisting updated document:', err);
    }
  },

  clearHistory: async () => {
    try {
      await storage.clearAll();
      set({ documents: [] });
    } catch (err) {
      console.error('Error clearing history:', err);
    }
  },

  cancelProcessing: () => {
    OcrService.cancel();
    set({
      processing: {
        status: 'failed',
        progress: 0,
        step: 'Procesamiento cancelado por el usuario.',
        result: null,
        errorMessage: 'El usuario canceló la operación.'
      }
    });
  },

  updateConfig: (newConfig: Partial<AppConfig>) => {
    const updated = { ...get().config, ...newConfig };
    set({ config: updated });
    
    // Toggle dark mode class in HTML document element for global CSS styling
    if (newConfig.darkMode !== undefined) {
      if (newConfig.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  },

  resetProcessing: () => {
    set({
      processing: {
        status: 'idle',
        progress: 0,
        step: '',
        result: null,
        errorMessage: ''
      }
    });
  }
}));
