"use client";

import type { Product, ProductFormData } from '@/types';
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ProductContextType {
  products: Product[];
  addProduct: (productData: ProductFormData) => void;
  updateProductStock: (productId: string, newStockLevel: number) => void;
  getProductById: (productId: string) => Product | undefined;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

const initialProducts: Product[] = [
  {
    id: '1',
    name: 'Wireless Mouse',
    description: 'Ergonomic wireless mouse with 5 buttons.',
    stockLevel: 50,
    reorderPoint: 10,
    category: 'Electronics',
    imageUrl: 'https://placehold.co/100x100.png?text=Mouse',
  },
  {
    id: '2',
    name: 'Mechanical Keyboard',
    description: 'RGB mechanical keyboard with blue switches.',
    stockLevel: 25,
    reorderPoint: 5,
    category: 'Electronics',
    imageUrl: 'https://placehold.co/100x100.png?text=Keyboard',
  },
  {
    id: '3',
    name: 'Cotton T-Shirt',
    description: 'Plain white cotton t-shirt, size M.',
    stockLevel: 120,
    reorderPoint: 20,
    category: 'Clothing',
    imageUrl: 'https://placehold.co/100x100.png?text=T-Shirt',
  },
   {
    id: '4',
    name: 'Coffee Mug',
    description: '12oz ceramic coffee mug with logo.',
    stockLevel: 75,
    reorderPoint: 15,
    category: 'Home Goods',
    imageUrl: 'https://placehold.co/100x100.png?text=Mug',
  },
];


export const ProductProvider = ({ children }: { children: ReactNode }) => {
  const [products, setProducts] = useState<Product[]>(initialProducts);

  const addProduct = (productData: ProductFormData) => {
    const newProduct: Product = {
      ...productData,
      id: Date.now().toString(), // Simple ID generation
    };
    setProducts((prevProducts) => [...prevProducts, newProduct]);
  };

  const updateProductStock = (productId: string, newStockLevel: number) => {
    setProducts((prevProducts) =>
      prevProducts.map((p) =>
        p.id === productId ? { ...p, stockLevel: newStockLevel } : p
      )
    );
  };

  const getProductById = (productId: string) => {
    return products.find(p => p.id === productId);
  };

  return (
    <ProductContext.Provider value={{ products, addProduct, updateProductStock, getProductById }}>
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
