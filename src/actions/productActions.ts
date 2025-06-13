
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
                 ? doc.mediaUrls 
                 : [`https://placehold.co/300x200.png?text=${encodeURIComponent(doc.name) || 'Product'}`],
  };
}

function parseMediaUrls(urlsString?: string, productName?: string): string[] {
  if (urlsString && urlsString.trim() !== '') {
    const urls = urlsString.split(',').map(url => url.trim()).filter(url => url !== '');
    if (urls.length > 0) return urls;
  }
  // If urlsString is empty or only contains placeholders from a previous save, 
  // and we are not explicitly clearing them, we might want to preserve them.
  // However, if it's truly empty, generate a placeholder.
  // For file uploads, this string will be a comma-separated list of Data URIs.
  if (!productName && (!urlsString || urlsString.trim() === '')) {
      return [`https://placehold.co/300x200.png?text=Product`];
  }
  return [`https://placehold.co/300x200.png?text=${encodeURIComponent(productName || 'Product')}`];
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
    // mediaUrls from ProductFormData is expected to be a comma-separated string of Data URIs from file uploads
    const parsedMediaUrls = productData.mediaUrls && productData.mediaUrls.trim() !== ''
      ? productData.mediaUrls.split(',').map(url => url.trim()).filter(url => url !== '')
      : parseMediaUrls(undefined, productData.name); // Fallback to placeholder if no media uploaded

    const productDocument = {
      name: productData.name,
      description: productData.description,
      price: Number(productData.price),
      discountPercentage: Number(productData.discountPercentage ?? 0),
      stockLevel: Number(productData.stockLevel),
      reorderPoint: Number(productData.reorderPoint),
      category: productData.category,
      mediaUrls: parsedMediaUrls.length > 0 ? parsedMediaUrls : [`https://placehold.co/300x200.png?text=${encodeURIComponent(productData.name || 'Product')}`],
    };

    const result = await productsCollection.insertOne(productDocument as Omit<Product, 'id'>);
    
    const newProduct: Product = {
      id: result.insertedId.toString(),
      name: productDocument.name,
      description: productDocument.description,
      price: productDocument.price,
      discountPercentage: productDocument.discountPercentage,
      stockLevel: productDocument.stockLevel,
      reorderPoint: productDocument.reorderPoint,
      category: productDocument.category,
      mediaUrls: productDocument.mediaUrls,
    };
    return newProduct;
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
    
    // Handle mediaUrls for updates
    if (productData.mediaUrls !== undefined) {
      if (productData.mediaUrls.trim() === '') { // Explicitly clearing media
        updateDocument.mediaUrls = parseMediaUrls(undefined, productData.name); // Set to default placeholder
      } else {
        const parsedUrls = productData.mediaUrls.split(',').map(url => url.trim()).filter(url => url !== '');
        if (parsedUrls.length > 0) {
          updateDocument.mediaUrls = parsedUrls;
        } else {
           // If string was not empty but resulted in no valid URLs (e.g. just commas), use placeholder
           updateDocument.mediaUrls = parseMediaUrls(undefined, productData.name);
        }
      }
    }
    
    if (Object.keys(updateDocument).length === 0) {
        // If no actual data fields are being updated, just media might have changed
        // but media is handled above. If mediaUrls was undefined, it means no change to media.
        // If it was defined (even if empty string for clearing), it's handled.
        // So if updateDocument is empty, it means no actual product fields were changed.
        // We might want to return early if only media was "changed" to the same value.
        // However, the findOneAndUpdate will handle this fine.
        // If truly nothing changed, we can fetch and return current.
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
