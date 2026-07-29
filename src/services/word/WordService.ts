import mammoth from 'mammoth';
import { DocumentModel, ParserDebugSnapshot, ParsedRecord, InterpretationResult, DocumentSegment, ParsedToken } from '../../types/document';
import { DocumentClassifier } from '../classifier/DocumentClassifier';
import { DocumentParser } from '../parser/DocumentParser';

export class WordService {
  /**
   * Processes a Word document (.docx) from an ArrayBuffer.
   * Extracts raw text, classifies it, and parses it into the unified DocumentModel.
   * @param arrayBuffer The Word document file content as an ArrayBuffer
   */
  public static async processWord(arrayBuffer: ArrayBuffer): Promise<{
    text: string;
    parsed: DocumentModel;
    parserDebug?: ParserDebugSnapshot;
    parsedRecords?: ParsedRecord[];
    interpretation?: InterpretationResult;
    segments?: DocumentSegment[];
    tokens?: ParsedToken[];
  }> {
    // Extract raw text from docx
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value;

    // Classify document
    const docType = DocumentClassifier.classify(text);

    // Parse document details with debug output
    const parseResult = DocumentParser.debug(text, docType);

    return {
      text,
      parsed: parseResult.documentModel,
      parserDebug: parseResult.debugInfo,
      parsedRecords: parseResult.records,
      interpretation: parseResult.interpretation
      ,
      segments: parseResult.segments,
      tokens: parseResult.tokens
    };
  }
}
