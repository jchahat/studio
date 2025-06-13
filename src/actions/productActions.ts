
'use server';

import { Collection, ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';
import type { Product, ProductFormData, ProductUpdateData } from '@/types';

async function getProductsStore(): Promise<Collection<Omit<Product, 'id'>>> {
  const { db } = await connectToDatabase();
  return db.collection<Omit<Product, 'id'>>('products');
}

// Helper to convert MongoDB document to Product type
function mongoDocToProduct(doc: any): Product {
  if (!doc || !doc._id) {
    throw new Error('Invalid document structure for conversion');
  }
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description,
    price: Number(doc.price),
    discountPercentage: doc.discountPercentage !== undefined ? Number(doc.discountPercentage) : 0,
    stockLevel: Number(doc.stockLevel),
    reorderPoint: Number(doc.reorderPoint),
    category: doc.category,
    mediaUrls: Array.isArray(doc.mediaUrls) && doc.mediaUrls.length > 0 
                 ? doc.mediaUrls.map(String) // Ensure all elements are strings
                 : [`https://placehold.co/300x200.png`], // Use a generic placeholder
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
      name: productData.name,
      description: productData.description,
      price: Number(productData.price),
      discountPercentage: Number(productData.discountPercentage ?? 0),
      stockLevel: Number(productData.stockLevel),
      reorderPoint: Number(productData.reorderPoint),
      category: productData.category,
      mediaUrls: productData.mediaUrls || [], // Expecting an array of B2 URLs
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
    if (productData.name !== undefined) updateDocument.name = productData.name;
    if (productData.description !== undefined) updateDocument.description = productData.description;
    if (productData.price !== undefined) updateDocument.price = Number(productData.price);
    if (productData.discountPercentage !== undefined) {
        updateDocument.discountPercentage = Number(productData.discountPercentage);
    } else if (productData.hasOwnProperty('discountPercentage')) { 
        updateDocument.discountPercentage = 0;
    }
    if (productData.stockLevel !== undefined) updateDocument.stockLevel = Number(productData.stockLevel);
    if (productData.reorderPoint !== undefined) updateDocument.reorderPoint = Number(productData.reorderPoint);
    if (productData.category !== undefined) updateDocument.category = productData.category;
    
    // Handle mediaUrls for updates - expect an array of B2 URLs
    if (productData.mediaUrls !== undefined) {
      updateDocument.mediaUrls = productData.mediaUrls; 
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
      { $set: { stockLevel: newStockLevel } }
    );
  } catch (e: any) {
    console.error("Failed to update product stock in DB:", e);
    throw new Error(`Failed to update product stock in database. Original error: ${e.message || String(e)}`);
  }
}

export async function deleteProductAction(productId: string): Promise<void> {
  // Note: This does not delete files from Backblaze B2.
  // That would require additional logic and B2 API calls.
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
