
'use server';

import { Collection, ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';
import type { Product, ProductFormData, ProductUpdateData } from '@/types';

async function getProductsStore(): Promise<Collection<Omit<Product, 'id'>>> {
  const { db } = await connectToDatabase();
  return db.collection<Omit<Product, 'id'>>('products');
}

// Helper to ensure a value is a string, defaulting to empty string
function ensureString(value: any): string {
  if (value === null || typeof value === 'undefined') {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  return String(value);
}

// Helper to ensure a value is a number, defaulting to a specified value (typically 0)
function ensureNumber(value: any, defaultValue = 0): number {
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

// Helper to convert MongoDB document to Product type with robust type coercion
function mongoDocToProduct(doc: any): Product {
  if (!doc || !doc._id) {
    console.error("Invalid or empty document passed to mongoDocToProduct:", doc);
    // Provide a default structure if the doc is fundamentally invalid
    // This helps prevent downstream errors in forms if, for example, a product is unexpectedly null
    const newId = new ObjectId().toString(); // Generate a temporary valid ID
    return {
        id: newId,
        name: '',
        description: '',
        price: 0, // Default to 0, Zod schema validation will catch if min not met
        discountPercentage: 0,
        stockLevel: 0,
        reorderPoint: 0,
        category: '',
        mediaUrls: [],
    };
  }
  return {
    id: doc._id.toString(),
    name: ensureString(doc.name),
    description: ensureString(doc.description),
    price: ensureNumber(doc.price, 0), // Ensure price is a number, default to 0
    discountPercentage: ensureNumber(doc.discountPercentage, 0), // Ensure discount is a number, default to 0
    stockLevel: ensureNumber(doc.stockLevel, 0), // Ensure stockLevel is an integer, default to 0
    reorderPoint: ensureNumber(doc.reorderPoint, 0), // Ensure reorderPoint is an integer, default to 0
    category: ensureString(doc.category),
    mediaUrls: Array.isArray(doc.mediaUrls) && doc.mediaUrls.length > 0
                 ? doc.mediaUrls.map(url => ensureString(url)).filter(url => url !== '') // Ensure all URLs are non-empty strings
                 : [], // Default to empty array if no mediaUrls or if it's not an array
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

    // Ensure data types before insertion, consistent with ProductFormData and Product types
    const productDocument = {
      name: ensureString(productData.name),
      description: ensureString(productData.description),
      price: ensureNumber(productData.price, 0.01), // Default to 0.01 if coercion fails, respecting min price
      discountPercentage: ensureNumber(productData.discountPercentage, 0),
      stockLevel: ensureNumber(productData.stockLevel, 0),
      reorderPoint: ensureNumber(productData.reorderPoint, 0),
      category: ensureString(productData.category),
      mediaUrls: Array.isArray(productData.mediaUrls) ? productData.mediaUrls.map(ensureString).filter(url => url !== '') : [],
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
    if (productData.name !== undefined) updateDocument.name = ensureString(productData.name);
    if (productData.description !== undefined) updateDocument.description = ensureString(productData.description);
    if (productData.price !== undefined) updateDocument.price = ensureNumber(productData.price, 0.01);
    
    if (productData.discountPercentage !== undefined) {
        updateDocument.discountPercentage = ensureNumber(productData.discountPercentage, 0);
    } else if (Object.prototype.hasOwnProperty.call(productData, 'discountPercentage')) { // Check if key exists, even if undefined
        updateDocument.discountPercentage = 0; 
    }

    if (productData.stockLevel !== undefined) updateDocument.stockLevel = ensureNumber(productData.stockLevel, 0);
    if (productData.reorderPoint !== undefined) updateDocument.reorderPoint = ensureNumber(productData.reorderPoint, 0);
    if (productData.category !== undefined) updateDocument.category = ensureString(productData.category);

    if (productData.mediaUrls !== undefined) {
      updateDocument.mediaUrls = Array.isArray(productData.mediaUrls) ? productData.mediaUrls.map(ensureString).filter(url => url !== '') : [];
    }

    if (Object.keys(updateDocument).length === 0) {
        // If nothing to update, fetch and return current product to avoid unnecessary DB call
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
      { $set: { stockLevel: ensureNumber(newStockLevel, 0) } }
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
    if (!ObjectId.isValid(productId)) {
        console.warn(`Invalid Product ID format: ${productId}`);
        return null;
    }
    const productDoc = await productsCollection.findOne({ _id: new ObjectId(productId) });
    if (productDoc) {
      return mongoDocToProduct(productDoc);
    }
    return null;
  } catch (e: any) {
    console.error("Failed to get product by ID from DB:", e);
    // Avoid throwing generic error if ID format is the issue, already handled.
    if (!(e instanceof TypeError && e.message.includes("Argument passed in must be a string of 12 bytes or a string of 24 hex characters"))) {
        throw new Error(`Failed to get product by ID from database. Original error: ${e.message || String(e)}`);
    }
    return null; // Return null for other BSON/ObjectId errors during findOne
  }
}
