import { DocumentModel, DocumentType } from '../../types/document';
import { SmartParser } from './SmartParser';

export class DocumentParser {
  public static parse(text: string, docType: DocumentType): DocumentModel {
    return SmartParser.parse(text, docType);
  }

  public static debug(text: string, docType: DocumentType) {
    return SmartParser.debug(text, docType);
  }
}
