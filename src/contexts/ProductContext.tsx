
"use client";

import type { Product, ProductFormData } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { connectToDatabase } from '@/lib/mongodb';
import { Collection, ObjectId } from 'mongodb';

interface ProductContextType {
  products: Product[];
  addProduct: (productData: ProductFormData) => Promise<void>;
  updateProductStock: (productId: string, newStockLevel: number) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  getProductById: (productId: string) => Product | undefined;
  loading: boolean;
  error: string | null;
  refreshProducts: () => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

async function getProductsStore(): Promise<Collection<Omit<Product, 'id'>>> {
  const { db } = await connectToDatabase();
  return db.collection<Omit<Product, 'id'>>('products');
}


export const ProductProvider = ({ children }: { children: ReactNode }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const productsCollection = await getProductsStore();
      const dbProducts = await productsCollection.find({}).toArray();
      setProducts(dbProducts.map(p => ({ ...p, id: p._id.toString() } as Product)));
    } catch (e) {
      console.error("Failed to fetch products:", e);
      setError("Failed to load products from database.");
      setProducts([]); // Clear products on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  const addProduct = async (productData: ProductFormData) => {
    setError(null);
    try {
      const productsCollection = await getProductsStore();
      // Ensure stockLevel and reorderPoint are numbers
      const productDocument = {
        ...productData,
        stockLevel: Number(productData.stockLevel),
        reorderPoint: Number(productData.reorderPoint),
        imageUrl: productData.imageUrl || `https://placehold.co/100x100.png?text=${productData.name.charAt(0)}`,
      };

      const result = await productsCollection.insertOne(productDocument as Omit<Product, 'id'>);
      const newProduct: Product = {
        ...productDocument,
        id: result.insertedId.toString(),
      };
      setProducts((prevProducts) => [...prevProducts, newProduct]);
    } catch (e) {
      console.error("Failed to add product:", e);
      setError("Failed to add product to database.");
      throw e; // Re-throw to be caught by the calling form
    }
  };

  const updateProductStock = async (productId: string, newStockLevel: number) => {
    setError(null);
    try {
      const productsCollection = await getProductsStore();
      await productsCollection.updateOne(
        { _id: new ObjectId(productId) },
        { $set: { stockLevel: newStockLevel } }
      );
      setProducts((prevProducts) =>
        prevProducts.map((p) =>
          p.id === productId ? { ...p, stockLevel: newStockLevel } : p
        )
      );
    } catch (e) {
      console.error("Failed to update product stock:", e);
      setError("Failed to update product stock in database.");
      throw e;
    }
  };

  const deleteProduct = async (productId: string) => {
    setError(null);
    try {
      const productsCollection = await getProductsStore();
      await productsCollection.deleteOne({ _id: new ObjectId(productId) });
      setProducts((prevProducts) => prevProducts.filter(p => p.id !== productId));
    } catch (e) {
      console.error("Failed to delete product:", e);
      setError("Failed to delete product from database.");
      throw e;
    }
  };

  const getProductById = (productId: string) => {
    return products.find(p => p.id === productId);
  };

  return (
    <ProductContext.Provider value={{ products, addProduct, updateProductStock, deleteProduct, getProductById, loading, error, refreshProducts }}>
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
