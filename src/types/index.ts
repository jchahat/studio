export interface Product {
  id: string;
  name: string;
  description: string;
  stockLevel: number;
  reorderPoint: number;
  category: string;
  imageUrl?: string;
}

export type ProductFormData = Omit<Product, 'id'>;
