
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPercentage?: number; // Optional, defaults to 0
  stockLevel: number;
  reorderPoint: number;
  category: string;
  mediaUrls?: string[]; // Changed from imageUrls to mediaUrls, can store image/video Data URIs or external URLs
}

// ProductFormData will include price and discountPercentage
// Omitting 'id' as it's generated or already exists for updates
// For mediaUrls, the form will accept a string, to be parsed in actions (if manual input) or handled by file uploads.
export type ProductFormData = Omit<Product, 'id' | 'mediaUrls'> & {
  mediaUrls?: string; // Form will primarily use file uploads, this can be a fallback or for initial data
};


// Specific type for product updates, where all fields might be optional
export type ProductUpdateData = Partial<Omit<Product, 'id' | 'mediaUrls'>> & {
  mediaUrls?: string; // Form will primarily use file uploads for changes
};
