
"use client";

import type { Product, ProductFormData } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { 
  fetchProductsAction, 
  addProductAction, 
  updateProductStockAction, 
  deleteProductAction,
  getProductByIdAction
} from '@/actions/productActions';

interface ProductContextType {
  products: Product[];
  addProduct: (productData: ProductFormData) => Promise<Product | void>; // Can return product or void on error
  updateProductStock: (productId: string, newStockLevel: number) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  getProductById: (productId: string) => Product | undefined; // Keep this sync for local cache access
  fetchProductByIdFromServer: (productId: string) => Promise<Product | null>; // New async fetcher
  loading: boolean;
  error: string | null;
  refreshProducts: () => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider = ({ children }: { children: ReactNode }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dbProducts = await fetchProductsAction();
      setProducts(dbProducts);
    } catch (e: any) {
      console.error("ProductContext: Failed to refresh products:", e);
      setError(e.message || "Failed to load products from database.");
      setProducts([]); 
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  const addProduct = async (productData: ProductFormData) => {
    setLoading(true);
    setError(null);
    try {
      const newProduct = await addProductAction(productData);
      setProducts((prevProducts) => [...prevProducts, newProduct]);
      setLoading(false);
      return newProduct;
    } catch (e: any) {
      console.error("ProductContext: Failed to add product:", e);
      setError(e.message || "Failed to add product to database.");
      setLoading(false);
      throw e; 
    }
  };

  const updateProductStock = async (productId: string, newStockLevel: number) => {
    // Optimistic update can be added here if desired
    setError(null);
    try {
      await updateProductStockAction(productId, newStockLevel);
      setProducts((prevProducts) =>
        prevProducts.map((p) =>
          p.id === productId ? { ...p, stockLevel: newStockLevel } : p
        )
      );
    } catch (e: any) {
      console.error("ProductContext: Failed to update product stock:", e);
      setError(e.message || "Failed to update product stock in database.");
      await refreshProducts(); // Re-fetch to ensure consistency on error
      throw e;
    }
  };

  const deleteProduct = async (productId: string) => {
    // Optimistic update can be added here
    setError(null);
    try {
      setProducts((prevProducts) => prevProducts.filter(p => p.id !== productId)); // Optimistic UI update
      await deleteProductAction(productId);
      // If server action fails, refreshProducts will correct the state.
      // Or, add more specific error handling to revert optimistic update.
    } catch (e: any) {
      console.error("ProductContext: Failed to delete product:", e);
      setError(e.message || "Failed to delete product from database.");
      await refreshProducts(); // Re-fetch to ensure consistency
      throw e;
    }
  };

  const getProductById = (productId: string): Product | undefined => {
    return products.find(p => p.id === productId);
  };

  const fetchProductByIdFromServer = async (productId: string): Promise<Product | null> => {
    setLoading(true);
    setError(null);
    try {
      const product = await getProductByIdAction(productId);
      // Optionally update local cache if needed, though usually not for a single get
      setLoading(false);
      return product;
    } catch (e: any) {
      console.error("ProductContext: Failed to fetch product by ID:", e);
      setError(e.message || `Failed to fetch product ${productId}`);
      setLoading(false);
      return null;
    }
  };


  return (
    <ProductContext.Provider value={{ 
      products, 
      addProduct, 
      updateProductStock, 
      deleteProduct, 
      getProductById, 
      fetchProductByIdFromServer,
      loading, 
      error, 
      refreshProducts 
    }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};
