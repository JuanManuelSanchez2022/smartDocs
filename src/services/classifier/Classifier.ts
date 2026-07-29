import type { NormalizedRecord, LearningItem } from '../../types/smartdocs';

export interface ClassificationResult {
  accepted: NormalizedRecord;
  pending: LearningItem[];
}

export interface Classifier {
  classify(input: NormalizedRecord): ClassificationResult;
}
