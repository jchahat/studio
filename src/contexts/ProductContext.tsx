
"use client";

import type { Product, ProductFormData, ProductUpdateData } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { 
  fetchProductsAction, 
  addProductAction, 
  updateProductAction,
  updateProductStockAction, 
  deleteProductAction,
  getProductByIdAction
} from '@/actions/productActions';

interface ProductContextType {
  products: Product[];
  addProduct: (productData: ProductFormData) => Promise<Product | void>;
  updateProduct: (productId: string, productData: ProductUpdateData) => Promise<Product | void>;
  updateProductStock: (productId: string, newStockLevel: number) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  getProductById: (productId: string) => Product | undefined; 
  fetchProductByIdFromServer: (productId: string) => Promise<Product | null>;
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
      setProducts((prevProducts) => [...prevProducts, newProduct].sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
      return newProduct;
    } catch (e: any) {
      console.error("ProductContext: Failed to add product:", e);
      setError(e.message || "Failed to add product to database.");
      setLoading(false);
      throw e; 
    }
  };

  const updateProduct = async (productId: string, productData: ProductUpdateData) => {
    setLoading(true);
    setError(null);
    try {
      const updatedProduct = await updateProductAction(productId, productData);
      if (updatedProduct) {
        setProducts((prevProducts) =>
          prevProducts.map((p) => (p.id === productId ? updatedProduct : p)).sort((a,b) => a.name.localeCompare(b.name))
        );
      }
      setLoading(false);
      return updatedProduct || undefined;
    } catch (e: any)
     {
      console.error("ProductContext: Failed to update product:", e);
      setError(e.message || "Failed to update product in database.");
      setLoading(false);
      await refreshProducts(); 
      throw e;
    }
  };

  const updateProductStock = async (productId: string, newStockLevel: number) => {
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
      await refreshProducts(); 
      throw e;
    }
  };

  const deleteProduct = async (productId: string) => {
    setError(null);
    try {
      setProducts((prevProducts) => prevProducts.filter(p => p.id !== productId)); 
      await deleteProductAction(productId);
    } catch (e: any) {
      console.error("ProductContext: Failed to delete product:", e);
      setError(e.message || "Failed to delete product from database.");
      await refreshProducts(); 
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
      updateProduct,
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
