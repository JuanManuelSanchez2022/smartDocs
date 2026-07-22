import mammoth from 'mammoth';
import { DocumentModel } from '../../types/document';
import { DocumentClassifier } from '../classifier/DocumentClassifier';
import { DocumentParser } from '../parser/DocumentParser';

export class WordService {
  /**
   * Processes a Word document (.docx) from an ArrayBuffer.
   * Extracts raw text, classifies it, and parses it into the unified DocumentModel.
   * @param arrayBuffer The Word document file content as an ArrayBuffer
   */
  public static async processWord(arrayBuffer: ArrayBuffer): Promise<{ text: string; parsed: DocumentModel }> {
    // Extract raw text from docx
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value;

    // Classify document
    const docType = DocumentClassifier.classify(text);

    // Parse document details
    const parsed = DocumentParser.parse(text, docType);

    return {
      text,
      parsed
    };
  }
}
