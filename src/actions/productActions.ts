
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
    imageUrls: Array.isArray(doc.imageUrls) && doc.imageUrls.length > 0 
                 ? doc.imageUrls 
                 : [`https://placehold.co/300x200.png?text=${encodeURIComponent(doc.name) || 'Product'}`],
  };
}

function parseImageUrls(urlsString?: string, productName?: string): string[] {
  if (urlsString && urlsString.trim() !== '') {
    const urls = urlsString.split(',').map(url => url.trim()).filter(url => url !== '');
    if (urls.length > 0) return urls;
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
    const parsedImageUrls = parseImageUrls(productData.imageUrls, productData.name);

    const productDocument = {
      name: productData.name,
      description: productData.description,
      price: Number(productData.price),
      discountPercentage: Number(productData.discountPercentage ?? 0),
      stockLevel: Number(productData.stockLevel),
      reorderPoint: Number(productData.reorderPoint),
      category: productData.category,
      imageUrls: parsedImageUrls,
    };

    const result = await productsCollection.insertOne(productDocument as Omit<Product, 'id'>);
    
    // Construct the Product object carefully for return
    const newProduct: Product = {
      id: result.insertedId.toString(),
      name: productDocument.name,
      description: productDocument.description,
      price: productDocument.price,
      discountPercentage: productDocument.discountPercentage,
      stockLevel: productDocument.stockLevel,
      reorderPoint: productDocument.reorderPoint,
      category: productDocument.category,
      imageUrls: productDocument.imageUrls,
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
    if (productData.imageUrls !== undefined) {
      updateDocument.imageUrls = parseImageUrls(productData.imageUrls, productData.name);
    }
    
    if (Object.keys(updateDocument).length === 0) {
        return getProductByIdAction(productId);
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
