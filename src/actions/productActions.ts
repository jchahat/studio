
'use server';

import { Collection, ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';
import type { Product, ProductFormData } from '@/types';

async function getProductsStore(): Promise<Collection<Omit<Product, 'id'>>> {
  const { db } = await connectToDatabase();
  return db.collection<Omit<Product, 'id'>>('products');
}

export async function fetchProductsAction(): Promise<Product[]> {
  try {
    const productsCollection = await getProductsStore();
    const dbProducts = await productsCollection.find({}).sort({ name: 1 }).toArray();
    return dbProducts.map(p => ({ ...p, id: p._id.toString() } as Product));
  } catch (e) {
    console.error("Failed to fetch products from DB:", e);
    throw new Error("Failed to load products from database.");
  }
}

export async function addProductAction(productData: ProductFormData): Promise<Product> {
  try {
    const productsCollection = await getProductsStore();
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
    return newProduct;
  } catch (e) {
    console.error("Failed to add product to DB:", e);
    throw new Error("Failed to add product to database.");
  }
}

export async function updateProductStockAction(productId: string, newStockLevel: number): Promise<void> {
  try {
    const productsCollection = await getProductsStore();
    await productsCollection.updateOne(
      { _id: new ObjectId(productId) },
      { $set: { stockLevel: newStockLevel } }
    );
  } catch (e) {
    console.error("Failed to update product stock in DB:", e);
    throw new Error("Failed to update product stock in database.");
  }
}

export async function deleteProductAction(productId: string): Promise<void> {
  try {
    const productsCollection = await getProductsStore();
    await productsCollection.deleteOne({ _id: new ObjectId(productId) });
  } catch (e) {
    console.error("Failed to delete product from DB:", e);
    throw new Error("Failed to delete product from database.");
  }
}

export async function getProductByIdAction(productId: string): Promise<Product | null> {
  try {
    const productsCollection = await getProductsStore();
    const product = await productsCollection.findOne({ _id: new ObjectId(productId) });
    if (product) {
      return { ...product, id: product._id.toString() } as Product;
    }
    return null;
  } catch (e) {
    console.error("Failed to get product by ID from DB:", e);
    throw new Error("Failed to get product by ID from database.");
  }
}
