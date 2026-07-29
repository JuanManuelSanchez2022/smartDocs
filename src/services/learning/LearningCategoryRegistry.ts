import { FieldClassifier } from '../classifier/FieldClassifier';
import { DocumentCategory } from '../../types/document';

export interface LearningCategory {
  value: DocumentCategory | 'otro';
  label: string;
}

const DEFAULT_CATEGORIES: LearningCategory[] = [
  { value: 'proveedor', label: 'Proveedor' },
  { value: 'categoria', label: 'Categoría' },
  { value: 'codigo', label: 'Código' },
  { value: 'marca', label: 'Marca' },
  { value: 'producto', label: 'Producto' },
  { value: 'tipo', label: 'Tipo' },
  { value: 'presentacion', label: 'Presentación' },
  { value: 'cantidad', label: 'Cantidad del paquete' },
  { value: 'precio', label: 'Precio' },
  { value: 'otro', label: 'Desconocido' }
];

export class LearningCategoryRegistry {
  private static categories: LearningCategory[] = DEFAULT_CATEGORIES;

  public static getCategories(): LearningCategory[] {
    return [...this.categories];
  }

  public static registerCategory(category: LearningCategory) {
    const exists = this.categories.some((item) => item.value === category.value);
    if (!exists) {
      this.categories.push(category);
    }
  }

  public static ensureClassifierCategories(): void {
    const classifierCategories = FieldClassifier.getCategories();
    for (const category of classifierCategories) {
      if (!this.categories.some((item) => item.value === category)) {
        this.categories.push({ value: category, label: category });
      }
    }
  }
}

export default LearningCategoryRegistry;
