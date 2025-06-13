
'use server';

import { Collection, ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';
import type { Product, ProductFormData, ProductUpdateData } from '@/types';

async function getProductsStore(): Promise<Collection<Omit<Product, 'id'>>> {
  const { db } = await connectToDatabase();
  return db.collection<Omit<Product, 'id'>>('products');
}

export async function fetchProductsAction(): Promise<Product[]> {
  try {
    const productsCollection = await getProductsStore();
    const dbProducts = await productsCollection.find({}).sort({ name: 1 }).toArray();
    return dbProducts.map(p => ({ 
      ...p, 
      _id: p._id, // Keep MongoDB's _id if needed elsewhere
      id: p._id.toString(),
      discountPercentage: p.discountPercentage ?? 0, // Ensure default
    } as unknown as Product));
  } catch (e: any) {
    console.error("Failed to fetch products from DB:", e);
    throw new Error(`Failed to load products from database. Original error: ${e.message || String(e)}`);
  }
}

export async function addProductAction(productData: ProductFormData): Promise<Product> {
  try {
    const productsCollection = await getProductsStore();
    const productDocument = {
      ...productData,
      price: Number(productData.price),
      discountPercentage: Number(productData.discountPercentage ?? 0),
      stockLevel: Number(productData.stockLevel),
      reorderPoint: Number(productData.reorderPoint),
      imageUrl: productData.imageUrl || `https://placehold.co/300x200.png`, // Updated placeholder
    };

    const result = await productsCollection.insertOne(productDocument as Omit<Product, 'id'>);
    const newProduct: Product = {
      ...productDocument,
      _id: result.insertedId, // Keep MongoDB's _id
      id: result.insertedId.toString(),
    } as unknown as Product;
    return newProduct;
  } catch (e: any) {
    console.error("Failed to add product to DB:", e);
    throw new Error(`Failed to add product to database. Original error: ${e.message || String(e)}`);
  }
}

export async function updateProductAction(productId: string, productData: ProductUpdateData): Promise<Product | null> {
  try {
    const productsCollection = await getProductsStore();
    
    // Construct the update object, ensuring numbers are correctly typed
    const updateDocument: Partial<Omit<Product, 'id'>> = { ...productData };
    if (productData.price !== undefined) updateDocument.price = Number(productData.price);
    if (productData.discountPercentage !== undefined) updateDocument.discountPercentage = Number(productData.discountPercentage);
    else updateDocument.discountPercentage = 0; // Default if not provided or cleared
    if (productData.stockLevel !== undefined) updateDocument.stockLevel = Number(productData.stockLevel);
    if (productData.reorderPoint !== undefined) updateDocument.reorderPoint = Number(productData.reorderPoint);
    if (productData.imageUrl === '') updateDocument.imageUrl = `https://placehold.co/300x200.png`;


    // Remove id if it's accidentally passed in productData
    // @ts-ignore
    delete updateDocument.id; 
    // @ts-ignore
    delete updateDocument._id;


    const result = await productsCollection.findOneAndUpdate(
      { _id: new ObjectId(productId) },
      { $set: updateDocument },
      { returnDocument: 'after' }
    );

    if (result) {
      const updatedProductDoc = result as unknown as (Omit<Product, 'id'> & {_id: ObjectId});
      return { 
        ...updatedProductDoc, 
        id: updatedProductDoc._id.toString(),
        discountPercentage: updatedProductDoc.discountPercentage ?? 0,
       } as Product;
    }
    return null;
  } catch (e: any) {
    console.error("Failed to update product in DB:", e);
    throw new Error(`Failed to update product in database. Original error: ${e.message || String(e)}`);
  }
}


export async function updateProductStockAction(productId: string, newStockLevel: number): Promise<void> {
  try {
    const productsCollection = await getProductsStore();
    await productsCollection.updateOne(
      { _id: new ObjectId(productId) },
      { $set: { stockLevel: newStockLevel } }
    );
  } catch (e: any) {
    console.error("Failed to update product stock in DB:", e);
    throw new Error(`Failed to update product stock in database. Original error: ${e.message || String(e)}`);
  }
}

export async function deleteProductAction(productId: string): Promise<void> {
  try {
    const productsCollection = await getProductsStore();
    await productsCollection.deleteOne({ _id: new ObjectId(productId) });
  } catch (e: any) {
    console.error("Failed to delete product from DB:", e);
    throw new Error(`Failed to delete product from database. Original error: ${e.message || String(e)}`);
  }
}

export async function getProductByIdAction(productId: string): Promise<Product | null> {
  try {
    const productsCollection = await getProductsStore();
    const product = await productsCollection.findOne({ _id: new ObjectId(productId) });
    if (product) {
      return { 
        ...product, 
        _id: product._id, // Keep MongoDB's _id
        id: product._id.toString(),
        discountPercentage: product.discountPercentage ?? 0,
      } as unknown as Product;
    }
    return null;
  } catch (e: any) {
    console.error("Failed to get product by ID from DB:", e);
    throw new Error(`Failed to get product by ID from database. Original error: ${e.message || String(e)}`);
  }
}
