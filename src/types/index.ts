
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPercentage?: number; // Optional, defaults to 0
  stockLevel: number;
  reorderPoint: number;
  category: string;
  imageUrls?: string[]; // Changed from imageUrl: string to imageUrls: string[]
}

// ProductFormData will include price and discountPercentage
// Omitting 'id' as it's generated or already exists for updates
// For imageUrls, the form will accept a string, to be parsed in actions.
export type ProductFormData = Omit<Product, 'id' | 'imageUrls'> & {
  imageUrls?: string; // Form will take a comma-separated string
};


// Specific type for product updates, where all fields might be optional
// For this implementation, we'll reuse ProductFormData for simplicity in the form
// but the backend update action can be more flexible.
export type ProductUpdateData = Partial<Omit<Product, 'id' | 'imageUrls'>> & {
  imageUrls?: string; // Form will take a comma-separated string
};
