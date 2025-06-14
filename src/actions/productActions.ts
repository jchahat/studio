
'use server';

import { Collection, ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';
import type { Product, ProductFormData, ProductUpdateData } from '@/types';

async function getProductsStore(): Promise<Collection<Omit<Product, 'id'>>> {
  const { db } = await connectToDatabase();
  return db.collection<Omit<Product, 'id'>>('products');
}

// Helper to convert MongoDB document to Product type with robust type coercion
function mongoDocToProduct(doc: any): Product {
  if (!doc || !doc._id) {
    // It's better to return null or throw a more specific error if the doc structure is truly invalid.
    // For now, let's assume if _id is missing, it's problematic.
    // However, to prevent downstream errors, we could return a default-like structure or throw.
    // Given the context of its usage, throwing might be better if an ID is always expected.
    // But if it's just about type safety for the form, providing defaults might be "safer" to avoid crashes,
    // though it might hide underlying data issues.
    // For this fix, focusing on type coercion for form binding:
    console.error("Invalid document structure passed to mongoDocToProduct:", doc);
    // Fallback to a structure that won't break forms, though this indicates a deeper issue.
    return {
        id: doc?._id?.toString() || new ObjectId().toString(), // provide a dummy id if totally missing
        name: String(doc?.name || ''),
        description: String(doc?.description || ''),
        price: Number(doc?.price || 0),
        discountPercentage: Number(doc?.discountPercentage || 0),
        stockLevel: Number(doc?.stockLevel || 0),
        reorderPoint: Number(doc?.reorderPoint || 0),
        category: String(doc?.category || ''),
        mediaUrls: Array.isArray(doc?.mediaUrls) ? doc.mediaUrls.map(String) : [],
    };
  }
  return {
    id: doc._id.toString(),
    name: String(doc.name || ''),
    description: String(doc.description || ''),
    price: Number(doc.price || 0),
    discountPercentage: Number(doc.discountPercentage || 0),
    stockLevel: Number(doc.stockLevel || 0),
    reorderPoint: Number(doc.reorderPoint || 0),
    category: String(doc.category || ''),
    mediaUrls: Array.isArray(doc.mediaUrls) && doc.mediaUrls.length > 0
                 ? doc.mediaUrls.map(url => String(url || '')) // Ensure each URL is a string
                 : [], // Default to empty array if no mediaUrls
  };
}


export async function fetchProductsAction(): Promise<Product[]> {
  try {
    const productsCollection = await getProductsStore();
    const dbProducts = await productsCollection.find({}).sort({ name: 1 }).toArray();
    return dbProducts.map(mongoDocToProduct);
  } catch (e: any) {
    console.error("Failed to fetch products from DB:", e);
    throw new Error(`Failed to load products from database. Original error: ${e.message || String(e)}`);
  }
}

export async function addProductAction(productData: ProductFormData): Promise<Product> {
  try {
    const productsCollection = await getProductsStore();

    const productDocument = {
      name: String(productData.name || ''),
      description: String(productData.description || ''),
      price: Number(productData.price || 0),
      discountPercentage: Number(productData.discountPercentage || 0),
      stockLevel: Number(productData.stockLevel || 0),
      reorderPoint: Number(productData.reorderPoint || 0),
      category: String(productData.category || ''),
      mediaUrls: Array.isArray(productData.mediaUrls) ? productData.mediaUrls.map(String) : [],
    };

    const result = await productsCollection.insertOne(productDocument as Omit<Product, 'id'>);

    const insertedDoc = { _id: result.insertedId, ...productDocument };
    return mongoDocToProduct(insertedDoc);

  } catch (e: any) {
    console.error("Failed to add product to DB:", e);
    throw new Error(`Failed to add product to database. Original error: ${e.message || String(e)}`);
  }
}

export async function updateProductAction(productId: string, productData: ProductUpdateData): Promise<Product | null> {
  try {
    const productsCollection = await getProductsStore();

    const updateDocument: Partial<Omit<Product, 'id'>> = {};
    if (productData.name !== undefined) updateDocument.name = String(productData.name || '');
    if (productData.description !== undefined) updateDocument.description = String(productData.description || '');
    if (productData.price !== undefined) updateDocument.price = Number(productData.price || 0);
    if (productData.discountPercentage !== undefined) {
        updateDocument.discountPercentage = Number(productData.discountPercentage || 0);
    } else if (productData.hasOwnProperty('discountPercentage')) {
        updateDocument.discountPercentage = 0; // Explicitly set to 0 if key exists but value is undefined
    }
    if (productData.stockLevel !== undefined) updateDocument.stockLevel = Number(productData.stockLevel || 0);
    if (productData.reorderPoint !== undefined) updateDocument.reorderPoint = Number(productData.reorderPoint || 0);
    if (productData.category !== undefined) updateDocument.category = String(productData.category || '');

    if (productData.mediaUrls !== undefined) {
      updateDocument.mediaUrls = Array.isArray(productData.mediaUrls) ? productData.mediaUrls.map(String) : [];
    }

    if (Object.keys(updateDocument).length === 0) {
        const currentProduct = await getProductByIdAction(productId);
        return currentProduct;
    }

    const result = await productsCollection.findOneAndUpdate(
      { _id: new ObjectId(productId) },
      { $set: updateDocument },
      { returnDocument: 'after' }
    );

    if (result) {
      return mongoDocToProduct(result);
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
      { $set: { stockLevel: Number(newStockLevel || 0) } }
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
    const productDoc = await productsCollection.findOne({ _id: new ObjectId(productId) });
    if (productDoc) {
      return mongoDocToProduct(productDoc);
    }
    return null;
  } catch (e: any) {
    console.error("Failed to get product by ID from DB:", e);
    throw new Error(`Failed to get product by ID from database. Original error: ${e.message || String(e)}`);
  }
}
