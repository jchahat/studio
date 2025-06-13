
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPercentage?: number; // Optional, defaults to 0
  stockLevel: number;
  reorderPoint: number;
  category: string;
  mediaUrls?: string[]; // Array of public URLs from Firebase Storage
}

export type ProductFormData = Omit<Product, 'id' | 'mediaUrls'> & {
  mediaUrls?: string[]; // Form will pass an array of Firebase URLs
};


// Specific type for product updates, where all fields might be optional
export type ProductUpdateData = Partial<Omit<Product, 'id' | 'mediaUrls'>> & {
  mediaUrls?: string[]; // Form will pass an array of Firebase URLs
};
