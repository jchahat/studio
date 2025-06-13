
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useProducts } from '@/contexts/ProductContext';
import type { Product, ProductUpdateData } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams } from 'next/navigation';
import { Edit, Loader2, PackageOpen, DollarSign, Percent, AlertCircle, UploadCloud, X, Video, Image as ImageIcon } from 'lucide-react';
import NextImage from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { storage } from '@/lib/firebase'; // Import Firebase storage instance
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid'; // For generating unique file names
import { Progress } from "@/components/ui/progress";

const productSchema = z.object({
  name: z.string().min(2, { message: "Product name must be at least 2 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  price: z.coerce.number().min(0.01, { message: "Price must be greater than 0." }),
  discountPercentage: z.coerce.number().min(0, { message: "Discount cannot be negative." }).max(100, { message: "Discount cannot exceed 100%." }).optional().default(0),
  stockLevel: z.coerce.number().int().min(0, { message: "Stock level must be a non-negative integer." }),
  reorderPoint: z.coerce.number().int().min(0, { message: "Reorder point must be a non-negative integer." }),
  category: z.string().min(1, { message: "Please select a category." }),
  mediaUrls: z.array(z.string().url({message: "Each media URL must be a valid URL."})).optional().default([]),
});

const categories = ["Electronics", "Clothing", "Books", "Home Goods", "Groceries", "Toys", "Sports", "Beauty", "Automotive", "Garden", "Other"];

type PreviewMedia = { url: string; type: 'image' | 'video'; isNew?: boolean; file?: File };

export default function EditProductPage() {
  const { updateProduct, fetchProductByIdFromServer, getProductById } = useProducts();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const productId = params.productId as string;

  const [product, setProduct] = useState<Product | null | undefined>(undefined); 
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const [mediaPreviews, setMediaPreviews] = useState<PreviewMedia[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isUploading, setIsUploading] = useState(false);
  // Store URLs of files marked for deletion from Firebase Storage
  const [urlsToDelete, setUrlsToDelete] = useState<string[]>([]);


  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      discountPercentage: 0,
      stockLevel: 0,
      reorderPoint: 0,
      category: '',
      mediaUrls: [],
    },
  });
  
  const populateForm = useCallback((productData: Product) => {
    form.reset({
      ...productData,
      mediaUrls: productData.mediaUrls || [],
    });
    if (productData.mediaUrls && productData.mediaUrls.length > 0) {
      setMediaPreviews(productData.mediaUrls.map(url => ({
        url,
        type: url.includes('.mp4') || url.includes('.webm') || url.includes('video') ? 'video' : 'image', // Basic type detection
        isNew: false
      })));
    } else {
      setMediaPreviews([]);
    }
    setUrlsToDelete([]);
  }, [form]);
  
  useEffect(() => {
    if (productId) {
      const cachedProduct = getProductById(productId);
      if (cachedProduct) {
        setProduct(cachedProduct);
        populateForm(cachedProduct);
        setIsLoadingProduct(false);
      } else {
        setIsLoadingProduct(true);
        setFetchError(null);
        fetchProductByIdFromServer(productId)
          .then(data => {
            if (data) {
              setProduct(data);
              populateForm(data);
            } else {
              setProduct(null);
              setFetchError(`Product with ID ${productId} not found.`);
            }
          })
          .catch(err => {
            console.error("Error fetching product:", err);
            setProduct(null);
            setFetchError(err.message || "Failed to load product details.");
          })
          .finally(() => setIsLoadingProduct(false));
      }
    }
  }, [productId, fetchProductByIdFromServer, getProductById, populateForm]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFilesArray = Array.from(files);
      const newPreviews = newFilesArray.map(file => ({
        url: URL.createObjectURL(file),
        type: file.type.startsWith('video/') ? 'video' : 'image' as 'image' | 'video',
        isNew: true,
        file: file
      }));
      setMediaPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeMedia = (index: number) => {
    const itemToRemove = mediaPreviews[index];
    if (itemToRemove && !itemToRemove.isNew && itemToRemove.url.startsWith('https://firebasestorage.googleapis.com')) {
      // If it's an existing Firebase URL, mark it for deletion
      setUrlsToDelete(prev => [...prev, itemToRemove.url]);
    }
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
    
    const fileInput = document.getElementById('media-upload-edit') as HTMLInputElement;
    if (fileInput && mediaPreviews.length -1 === 0 ) {
        fileInput.value = ""; 
    }
  };

  const deleteFromFirebase = async (url: string) => {
    try {
      const storageRef = ref(storage, url);
      await deleteObject(storageRef);
      console.log("Successfully deleted from Firebase:", url);
    } catch (error) {
      // If deletion fails (e.g. file not found, permissions), log it but don't block submission
      console.error("Failed to delete from Firebase, or file already deleted:", url, error);
    }
  };

  async function onSubmit(values: z.infer<typeof productSchema>) {
    if (!productId || !product) return;
    setIsUploading(true);
    setUploadProgress({});
    
    let finalMediaUrls: string[] = [];

    try {
      // Delete files marked for removal
      if (urlsToDelete.length > 0) {
        await Promise.all(urlsToDelete.map(url => deleteFromFirebase(url)));
      }

      const newFilesToUpload = mediaPreviews.filter(p => p.isNew && p.file).map(p => p.file!);
      const existingUrls = mediaPreviews.filter(p => !p.isNew).map(p => p.url);
      finalMediaUrls.push(...existingUrls); // Keep existing URLs not marked for deletion

      if (newFilesToUpload.length > 0) {
        const uploadPromises = newFilesToUpload.map(file => {
          const fileId = uuidv4();
          const storageRef = ref(storage, `products/${productId}/${fileId}-${file.name}`);
          const uploadTask = uploadBytesResumable(storageRef, file);

          return new Promise<string>((resolve, reject) => {
            uploadTask.on('state_changed',
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
              },
              (error) => reject(error),
              async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadURL);
              }
            );
          });
        });
        const newlyUploadedUrls = await Promise.all(uploadPromises);
        finalMediaUrls.push(...newlyUploadedUrls);
      }
      
      const submissionValues: ProductUpdateData = {
        ...values,
        mediaUrls: finalMediaUrls,
      };

      await updateProduct(productId, submissionValues);
      toast({
        title: "Product Updated!",
        description: `${values.name} has been successfully updated.`,
      });
      router.push('/products');
    } catch (error: any) {
      toast({
        title: "Error Updating Product",
        description: error.message || "Could not update the product. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  }

  if (isLoadingProduct) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <PackageOpen className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold font-headline">Edit Product</h1>
             <Skeleton className="h-4 w-48 mt-1" />
          </div>
        </div>
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-6 w-1/3 mb-1" />
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" /> {/* For media */}
            <Skeleton className="h-10 w-24" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-2xl mx-auto text-center py-10">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive mb-2">Error Loading Product</h1>
        <p className="text-muted-foreground mb-6">{fetchError}</p>
        <Button onClick={() => router.push('/products')}>Back to Products</Button>
      </div>
    );
  }
  
  if (!product) {
     return (
      <div className="max-w-2xl mx-auto text-center py-10">
        <PackageOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Product Not Found</h1>
        <p className="text-muted-foreground mb-6">The product you are trying to edit could not be found.</p>
        <Button onClick={() => router.push('/products')}>Back to Products</Button>
      </div>
    );
  }


  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Edit className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold font-headline">Edit Product</h1>
          <p className="text-muted-foreground">Modify the details for "{form.getValues('name') || product.name}".</p>
        </div>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
          <CardDescription>Update the information for this product.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Wireless Keyboard" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe the product..." {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                       <FormControl>
                        <div className="relative">
                           <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                           <Input type="number" step="0.01" placeholder="0.00" {...field} className="pl-8" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="discountPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount (%)</FormLabel>
                      <FormControl>
                        <div className="relative">
                           <Percent className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                           <Input type="number" step="1" placeholder="0" {...field} className="pl-8" />
                        </div>
                      </FormControl>
                      <FormDescription>Enter a value between 0 and 100.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="stockLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Level</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reorderPoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reorder Point</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>Product Media (Images/Videos)</FormLabel>
                <FormControl>
                   <div className="flex items-center gap-2">
                    <UploadCloud className="h-5 w-5 text-muted-foreground" />
                    <Input 
                      id="media-upload-edit"
                      type="file" 
                      multiple 
                      accept="image/*,video/*"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                      disabled={isUploading}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Upload new images/videos or manage existing ones. New uploads are added to the list.
                </FormDescription>
                <FormMessage />
                 {/* Display upload progress for new files */}
                {mediaPreviews.filter(p => p.isNew && p.file).length > 0 && (
                  <div className="mt-4 space-y-2">
                    {mediaPreviews.filter(p => p.isNew && p.file).map((preview, index) => (
                      <div key={`upload-${index}`} className="text-xs text-muted-foreground">
                        {preview.file && (
                          <>
                          <span>{preview.file.name} ({(preview.file.size / 1024).toFixed(2)} KB)</span>
                          {uploadProgress[preview.file.name] !== undefined && (
                            <Progress value={uploadProgress[preview.file.name]} className="h-2 mt-1" />
                          )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {mediaPreviews.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {mediaPreviews.map((preview, index) => (
                      <div key={index} className="relative group aspect-square">
                        {preview.type === 'video' ? (
                          <video src={preview.url} controls muted loop className="rounded-md object-cover w-full h-full border" data-ai-hint="product video" />
                        ) : (
                          <NextImage 
                            src={preview.url} 
                            alt={`Preview ${index + 1}`} 
                            layout="fill" 
                            objectFit="cover" 
                            className="rounded-md border" 
                            data-ai-hint="product item"
                            unoptimized={preview.url.startsWith('blob:')} // Prevent optimization for local blob URLs
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/100x100.png?text=Error'; }}
                          />
                        )}
                        {!isUploading && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 opacity-100 group-hover:opacity-100 transition-opacity z-10" // Always visible for edit
                            onClick={() => removeMedia(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </FormItem>
              <Button type="submit" className="w-full md:w-auto" disabled={form.formState.isSubmitting || isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading & Saving...
                  </>
                ) : form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : "Save Changes"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
