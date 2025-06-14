
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
  return isNaN(num) || !isFinite(num) ? defaultValue : num;
}

// Helper to convert MongoDB document to Product type with robust type coercion
function mongoDocToProduct(doc: any): Product {
  if (!doc || !doc._id || !ObjectId.isValid(doc._id)) {
    console.error("Invalid or empty document/ID passed to mongoDocToProduct:", doc);
    // Provide a default structure if the doc is fundamentally invalid
    // This helps prevent downstream errors in forms if, for example, a product is unexpectedly null
    const newId = new ObjectId().toString(); 
    return {
        id: newId,
        name: '',
        description: '',
        price: 0.01, // Align with Zod schema min(0.01)
        discountPercentage: 0,
        stockLevel: 0,
        reorderPoint: 0,
        category: '',
        mediaUrls: [],
    };
  }
  return {
    id: doc._id.toString(),
<<<<<<< HEAD
    name: ensureString(doc.name),
    description: ensureString(doc.description),
    price: ensureNumber(doc.price, 0.01), 
    discountPercentage: ensureNumber(doc.discountPercentage, 0), 
    stockLevel: ensureNumber(doc.stockLevel, 0), 
    reorderPoint: ensureNumber(doc.reorderPoint, 0), 
    category: ensureString(doc.category),
    mediaUrls: Array.isArray(doc.mediaUrls) && doc.mediaUrls.length > 0
                 ? doc.mediaUrls.map(url => ensureString(url)).filter(url => url !== '') 
                 : [], 
  };
}

=======
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

>>>>>>> parent of 416606e (It should display the product page and Existing images and allow them to)

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
<<<<<<< HEAD

    const productDocument = {
      name: ensureString(productData.name),
      description: ensureString(productData.description),
      price: ensureNumber(productData.price, 0.01), 
      discountPercentage: ensureNumber(productData.discountPercentage, 0),
      stockLevel: ensureNumber(productData.stockLevel, 0),
      reorderPoint: ensureNumber(productData.reorderPoint, 0),
      category: ensureString(productData.category),
      mediaUrls: Array.isArray(productData.mediaUrls) ? productData.mediaUrls.map(ensureString).filter(url => url !== '') : [],
    };

    const result = await productsCollection.insertOne(productDocument as Omit<Product, 'id'>);

    const insertedDoc = { _id: result.insertedId, ...productDocument };
    return mongoDocToProduct(insertedDoc);

=======
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
>>>>>>> parent of 416606e (It should display the product page and Existing images and allow them to)
  } catch (e: any) {
    console.error("Failed to add product to DB:", e);
    throw new Error(`Failed to add product to database. Original error: ${e.message || String(e)}`);
  }
}

export async function updateProductAction(productId: string, productData: ProductUpdateData): Promise<Product | null> {
  try {
    const productsCollection = await getProductsStore();
    if (!ObjectId.isValid(productId)) {
        console.warn(`Invalid Product ID format for update: ${productId}`);
        return null; // Or throw an error
    }

    const updateDocument: Partial<Omit<Product, 'id'>> = {};
    if (productData.name !== undefined) updateDocument.name = ensureString(productData.name);
    if (productData.description !== undefined) updateDocument.description = ensureString(productData.description);
    if (productData.price !== undefined) updateDocument.price = ensureNumber(productData.price, 0.01);
    
    if (productData.discountPercentage !== undefined) {
        updateDocument.discountPercentage = ensureNumber(productData.discountPercentage, 0);
    } else if (Object.prototype.hasOwnProperty.call(productData, 'discountPercentage')) { 
        updateDocument.discountPercentage = 0; 
    }
<<<<<<< HEAD

    if (productData.stockLevel !== undefined) updateDocument.stockLevel = ensureNumber(productData.stockLevel, 0);
    if (productData.reorderPoint !== undefined) updateDocument.reorderPoint = ensureNumber(productData.reorderPoint, 0);
    if (productData.category !== undefined) updateDocument.category = ensureString(productData.category);

    if (productData.mediaUrls !== undefined) {
      updateDocument.mediaUrls = Array.isArray(productData.mediaUrls) ? productData.mediaUrls.map(ensureString).filter(url => url !== '') : [];
=======
    if (productData.stockLevel !== undefined) updateDocument.stockLevel = Number(productData.stockLevel);
    if (productData.reorderPoint !== undefined) updateDocument.reorderPoint = Number(productData.reorderPoint);
    if (productData.category !== undefined) updateDocument.category = productData.category;
    if (productData.imageUrls !== undefined) {
      updateDocument.imageUrls = parseImageUrls(productData.imageUrls, productData.name);
>>>>>>> parent of 416606e (It should display the product page and Existing images and allow them to)
    }

    if (Object.keys(updateDocument).length === 0) {
<<<<<<< HEAD
        const currentProduct = await getProductByIdAction(productId);
        return currentProduct;
=======
        return getProductByIdAction(productId);
>>>>>>> parent of 416606e (It should display the product page and Existing images and allow them to)
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
     if (!ObjectId.isValid(productId)) {
        console.warn(`Invalid Product ID format for stock update: ${productId}`);
        throw new Error(`Invalid Product ID format: ${productId}`);
    }
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
    if (!ObjectId.isValid(productId)) {
        console.warn(`Invalid Product ID format for delete: ${productId}`);
        throw new Error(`Invalid Product ID format: ${productId}`);
    }
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
    // Avoid re-throwing for BSON errors if ID was valid but findOne failed for other BSON reasons
    if (!(e instanceof TypeError && e.message.includes("Argument passed in must be a string of 12 bytes or a string of 24 hex characters"))) {
        // throw new Error(`Failed to get product by ID from database. Original error: ${e.message || String(e)}`);
        // Instead of throwing, log and return null as product not found due to error
        console.error(`Database error fetching product ID ${productId}: ${e.message || String(e)}`);
    }
    return null; 
  }
}

    