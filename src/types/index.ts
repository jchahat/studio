
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPercentage?: number; // Optional, defaults to 0
  stockLevel: number;
  reorderPoint: number;
  category: string;
<<<<<<< HEAD
  mediaUrls?: string[]; // Array of public URLs from Firebase Storage
}

export type ProductFormData = Omit<Product, 'id' | 'mediaUrls'> & {
  mediaUrls?: string[]; // Form will pass an array of Firebase URLs
=======
  imageUrls?: string[]; // Changed from imageUrl: string to imageUrls: string[]
}

// ProductFormData will include price and discountPercentage
// Omitting 'id' as it's generated or already exists for updates
// For imageUrls, the form will accept a string, to be parsed in actions.
export type ProductFormData = Omit<Product, 'id' | 'imageUrls'> & {
  imageUrls?: string; // Form will take a comma-separated string
>>>>>>> parent of 416606e (It should display the product page and Existing images and allow them to)
};


// Specific type for product updates, where all fields might be optional
<<<<<<< HEAD
export type ProductUpdateData = Partial<Omit<Product, 'id' | 'mediaUrls'>> & {
  mediaUrls?: string[]; // Form will pass an array of Firebase URLs
=======
// For this implementation, we'll reuse ProductFormData for simplicity in the form
// but the backend update action can be more flexible.
export type ProductUpdateData = Partial<Omit<Product, 'id' | 'imageUrls'>> & {
  imageUrls?: string; // Form will take a comma-separated string
>>>>>>> parent of 416606e (It should display the product page and Existing images and allow them to)
};
