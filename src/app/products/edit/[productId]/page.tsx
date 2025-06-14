
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useProducts } from '@/contexts/ProductContext';
<<<<<<< HEAD
import type { Product, ProductUpdateData } from '@/types';
=======
import type { Product, ProductFormData } from '@/types';
>>>>>>> parent of 416606e (It should display the product page and Existing images and allow them to)
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams } from 'next/navigation';
<<<<<<< HEAD
import { Edit, Loader2, PackageOpen, DollarSign, Percent, AlertCircle, UploadCloud, X, Video, Image as ImageIcon } from 'lucide-react';
=======
import { Edit, Loader2, PackageOpen, DollarSign, Percent, AlertCircle, UploadCloud, X } from 'lucide-react';
>>>>>>> parent of 416606e (It should display the product page and Existing images and allow them to)
import NextImage from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from "@/components/ui/progress";
import { getB2UploadCredentialsAction, type B2UploadCredentials } from '@/actions/b2Actions';
import axios from 'axios';

const productSchema = z.object({
  name: z.string().min(2, { message: "Product name must be at least 2 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  price: z.coerce.number().min(0.01, { message: "Price must be greater than 0." }),
  discountPercentage: z.coerce.number().min(0, { message: "Discount cannot be negative." }).max(100, { message: "Discount cannot exceed 100%." }).optional().default(0),
  stockLevel: z.coerce.number().int().min(0, { message: "Stock level must be a non-negative integer." }),
  reorderPoint: z.coerce.number().int().min(0, { message: "Reorder point must be a non-negative integer." }),
  category: z.string().min(1, { message: "Please select a category." }),
<<<<<<< HEAD
  mediaUrls: z.array(z.string().url({message: "Each media URL must be a valid URL."})).optional().default([]),
=======
  imageUrls: z.string().optional(), // Will store comma-separated Data URIs or be empty
>>>>>>> parent of 416606e (It should display the product page and Existing images and allow them to)
});

const categories = ["Electronics", "Clothing", "Books", "Home Goods", "Groceries", "Toys", "Sports", "Beauty", "Automotive", "Garden", "Other"];

type DisplayMedia = { 
  url: string; 
  type: 'image' | 'video'; 
  isNew?: boolean; 
  file?: File; 
  id: string; 
  progress?: number;
  error?: string;
};


export default function EditProductPage() {
  const { updateProduct, fetchProductByIdFromServer, getProductById } = useProducts();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const productId = params.productId as string;

  const [product, setProduct] = useState<Product | null | undefined>(undefined); 
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
<<<<<<< HEAD
  
  const [displayMedia, setDisplayMedia] = useState<DisplayMedia[]>([]);
  const [isUploadingGlobal, setIsUploadingGlobal] = useState(false);
  const [removedB2Urls, setRemovedB2Urls] = useState<string[]>([]);


  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '', description: '', price: 0, discountPercentage: 0,
      stockLevel: 0, reorderPoint: 0, category: '', mediaUrls: [],
=======
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]); // For newly uploaded files

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      discountPercentage: 0,
      stockLevel: 0,
      reorderPoint: 0,
      category: '',
      imageUrls: '',
>>>>>>> parent of 416606e (It should display the product page and Existing images and allow them to)
    },
  });
  
  const populateForm = useCallback((productData: Product) => {
    form.reset({
      ...productData,
<<<<<<< HEAD
      mediaUrls: productData.mediaUrls || [],
    });
    if (productData.mediaUrls && productData.mediaUrls.length > 0) {
      setDisplayMedia(productData.mediaUrls.map(url => ({
        url,
        type: url.includes('.mp4') || url.includes('.webm') || url.includes('video') || url.startsWith('data:video') ? 'video' : 'image', 
        isNew: false,
        id: crypto.randomUUID(), 
      })));
    } else {
      setDisplayMedia([]);
    }
    setRemovedB2Urls([]);
  }, [form]);
=======
      imageUrls: productData.imageUrls?.join(', ') || '', // Keep this for initial load if needed
    });
    if (productData.imageUrls && productData.imageUrls.length > 0) {
      setImagePreviews(productData.imageUrls.filter(url => url.startsWith('data:image') || url.startsWith('https://placehold.co')));
    } else {
      setImagePreviews([]);
    }
    setImageFiles([]); // Reset any staged files
  };
>>>>>>> parent of 416606e (It should display the product page and Existing images and allow them to)
  
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
<<<<<<< HEAD
  }, [productId, fetchProductByIdFromServer, getProductById, populateForm]);
=======
  }, [productId, fetchProductByIdFromServer, getProductById]); // form removed from deps to avoid re-populating on every change
>>>>>>> parent of 416606e (It should display the product page and Existing images and allow them to)

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
<<<<<<< HEAD
      const newFilesArray: DisplayMedia[] = Array.from(files).map(file => ({
        file,
        url: URL.createObjectURL(file), 
        type: file.type.startsWith('video/') ? 'video' : 'image',
        isNew: true,
        id: crypto.randomUUID(),
        progress: 0,
      }));
      setDisplayMedia(prev => [...prev, ...newFilesArray]);
    }
  };

  const removeMedia = (id: string) => {
    const itemToRemove = displayMedia.find(dm => dm.id === id);
    if (itemToRemove && !itemToRemove.isNew) { 
      setRemovedB2Urls(prev => [...prev, itemToRemove.url]);
      // Note: Actual B2 file deletion is not implemented here.
      // This only removes it from the product's list of media.
    }
    setDisplayMedia(prev => prev.filter(dm => dm.id !== id));
    
    const fileInput = document.getElementById('media-upload-edit') as HTMLInputElement;
    if (fileInput && displayMedia.filter(dm => dm.id !== id).length === 0 ) {
        fileInput.value = ""; 
=======
      const newPreviews: string[] = [];
      const newImageFiles: File[] = Array.from(files);
      
      setImageFiles(newImageFiles); // New files replace old staged files

      newImageFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result as string);
          if (newPreviews.length === newImageFiles.length) {
            setImagePreviews([...newPreviews]); // Previews are for newly uploaded files
          }
        };
        reader.readAsDataURL(file);
      });
       if (newImageFiles.length === 0) {
        // If user deselects all files, decide if you want to revert to original product images or clear all
        // For now, let's clear previews if no new files are selected. User can choose not to save.
        setImagePreviews([]);
      }
    }
  };

  const removeImagePreview = (index: number) => {
    const newImagePreviews = [...imagePreviews];
    newImagePreviews.splice(index, 1);
    setImagePreviews(newImagePreviews);
    
    // If this preview was from a newly uploaded file, remove the file too
    if (imageFiles.length > index && imagePreviews[index]?.startsWith('data:image')) {
       const newImageFiles = [...imageFiles];
       // This logic is a bit tricky, mapping previews to files. 
       // Simpler: new uploads always replace. If a preview is removed, the corresponding file will not be submitted.
       // The current `imageFiles` state will be used on submit.
       // For this simple `removeImagePreview`, we'll assume it removes from the preview array.
       // The actual `imageFiles` state will be what's converted on submit.
       // To be very precise, one would map previews to File objects.
       // For now, removing preview. On submit, only current imageFiles are used.
>>>>>>> parent of 416606e (It should display the product page and Existing images and allow them to)
    }
  };

  const uploadFileToB2 = async (mediaItem: DisplayMedia): Promise<string> => {
    if (!mediaItem.file) throw new Error("File missing for B2 upload.");
    try {
<<<<<<< HEAD
      const b2Creds = await getB2UploadCredentialsAction(mediaItem.file.name);
      
      await axios.post(b2Creds.uploadUrl, mediaItem.file, {
        headers: {
          'Authorization': b2Creds.authToken,
          'X-Bz-File-Name': b2Creds.finalFileName,
          'Content-Type': mediaItem.file.type,
          'X-Bz-Content-Sha1': 'do_not_verify',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setDisplayMedia(prev => prev.map(dm => dm.id === mediaItem.id ? {...dm, progress: percentCompleted} : dm));
          }
        },
      });
      const publicUrl = `${b2Creds.publicFileUrlBase}/${b2Creds.finalFileName}`;
      setDisplayMedia(prev => prev.map(dm => dm.id === mediaItem.id ? {...dm, url: publicUrl, progress: 100, isNew: false} : dm)); 
      return publicUrl;
    } catch (error: any) {
        console.error("B2 Upload failed for file:", mediaItem.file.name, error);
        setDisplayMedia(prev => prev.map(dm => dm.id === mediaItem.id ? {...dm, error: `Upload failed: ${error.message || 'Unknown error'}`} : dm));
        throw new Error(`Failed to upload ${mediaItem.file.name} to B2.`);
    }
  };


  async function onSubmit(values: z.infer<typeof productSchema>) {
    if (!productId || !product) return;
    setIsUploadingGlobal(true);
    
    let finalMediaUrls: string[] = [];

    try {
      // Keep existing URLs that weren't explicitly removed
      const existingKeptUrls = displayMedia
        .filter(dm => !dm.isNew && !removedB2Urls.includes(dm.url))
        .map(dm => dm.url);
      finalMediaUrls.push(...existingKeptUrls);

      // Upload new files
      const newFilesToUpload = displayMedia.filter(dm => dm.isNew && dm.file);
      if (newFilesToUpload.length > 0) {
        const uploadPromises = newFilesToUpload.map(dm => uploadFileToB2(dm));
        const newlyUploadedUrls = await Promise.all(uploadPromises);
        finalMediaUrls.push(...newlyUploadedUrls);
      }
      
      const submissionValues: ProductUpdateData = {
        ...values, // Contains name, description, price, etc. from the form
        mediaUrls: finalMediaUrls, // The consolidated list of B2 URLs
=======
      let finalImageUrls = product.imageUrls || []; // Start with existing image URLs

      // If new files were uploaded, they replace existing images
      if (imageFiles.length > 0) {
        finalImageUrls = await Promise.all(
          imageFiles.map(file => {
            return new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
          })
        );
      } else if (imagePreviews.length > 0 && imagePreviews.every(p => p.startsWith('data:image') || p.startsWith('https://placehold.co'))) {
        // If no new files, but previews exist (from initial load or kept), use them
        // This assumes previews are the source of truth if no new files.
        // This might need refinement if users can delete existing previews without uploading new ones.
        // A safer approach: if imageFiles is empty, and imagePreviews is empty, then imageUrls = ""
        // if imageFiles is empty, but imagePreviews has original images, keep them.
        // The current `imagePreviews` state reflects what user sees. If they removed all, it's empty.
        finalImageUrls = imagePreviews.filter(p => p.startsWith('data:image')); // Only keep DataURIs, placeholders are handled by backend if empty
      } else {
         finalImageUrls = []; // Cleared all images
      }
      
      const submissionValues = {
        ...values,
        imageUrls: finalImageUrls.join(','),
>>>>>>> parent of 416606e (It should display the product page and Existing images and allow them to)
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
      setIsUploadingGlobal(false);
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
            <Skeleton className="h-10 w-full" /> <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-10 w-full" /> <Skeleton className="h-10 w-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-10 w-full" /> <Skeleton className="h-10 w-full" />
            </div>
<<<<<<< HEAD
            <Skeleton className="h-10 w-full" /> <Skeleton className="h-10 w-full" />
=======
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
>>>>>>> parent of 416606e (It should display the product page and Existing images and allow them to)
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
  
  if (!product && !isLoadingProduct && !fetchError) {
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
          <p className="text-muted-foreground">Modify the details for "{form.getValues('name') || product?.name}".</p>
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
                           <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} className="pl-8" />
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
                           <Input type="number" step="1" placeholder="0" {...field} value={field.value ?? ''} className="pl-8" />
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
                        <Input type="number" placeholder="0" {...field} value={field.value ?? ''} />
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
                        <Input type="number" placeholder="0" {...field} value={field.value ?? ''}/>
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
                    <Select
                      onValueChange={field.onChange}
                      value={typeof field.value === 'string' ? field.value : ''}
                    >
                      <FormControl>
                        <SelectTrigger ref={field.ref}>
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
<<<<<<< HEAD
              
              <FormItem>
                <FormLabel>Product Media (Images/Videos)</FormLabel>
                <FormControl>
                   <div className="flex items-center gap-2">
                    <UploadCloud className="h-5 w-5 text-muted-foreground" />
                    <Input 
                      id="media-upload-edit" type="file" multiple 
                      accept="image/*,video/*" onChange={handleFileChange}
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                      disabled={isUploadingGlobal}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Upload new images/videos or manage existing ones. New uploads are added and will be uploaded to Backblaze B2.
                </FormDescription>
                <FormMessage />
                
                {displayMedia.filter(dm => dm.isNew && dm.file).length > 0 && (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm font-medium">New files to upload:</p>
                    {displayMedia.filter(dm => dm.isNew && dm.file).map((dm) => (
                      <div key={dm.id} className="text-xs text-muted-foreground border p-2 rounded-md">
                        <div className="flex justify-between items-center">
                            <span>{dm.file?.name} ({(dm.file?.size || 0 / 1024).toFixed(2)} KB)</span>
                             {!isUploadingGlobal && (
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeMedia(dm.id)} className="h-6 w-6 text-destructive">
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                        {dm.progress !== undefined && dm.progress > 0 && dm.progress < 100 && (
                          <Progress value={dm.progress} className="h-2 mt-1" />
                        )}
                        {dm.progress === 100 && !dm.error && <p className="text-green-600 text-xs mt-1">Uploaded to B2</p>}
                        {dm.error && <p className="text-red-600 text-xs mt-1">{dm.error}</p>}
                      </div>
                    ))}
                  </div>
=======
              <FormField
                control={form.control}
                name="imageUrls"
                render={({ field }) => ( // field is not directly used for file input value
                  <FormItem>
                    <FormLabel>Product Images (Optional)</FormLabel>
                    <FormControl>
                       <div className="flex items-center gap-2">
                        <UploadCloud className="h-5 w-5 text-muted-foreground" />
                        <Input 
                          type="file" 
                          multiple 
                          accept="image/*"
                          onChange={handleImageChange}
                          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Upload new images to replace existing ones. If no new images are uploaded, current images will be kept unless cleared.
                    </FormDescription>
                    <FormMessage />
                    {imagePreviews.length > 0 && (
                      <div className="mt-4 grid grid-cols-3 gap-4">
                        {imagePreviews.map((src, index) => (
                          <div key={index} className="relative group">
                            <NextImage 
                              src={src} 
                              alt={`Preview ${index + 1}`} 
                              width={100} 
                              height={100} 
                              className="rounded-md object-cover aspect-square border" 
                              data-ai-hint="product item"
                              onError={(e) => { e.currentTarget.src = 'https://placehold.co/100x100.png?text=Error'; }}
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeImagePreview(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </FormItem>
>>>>>>> parent of 416606e (It should display the product page and Existing images and allow them to)
                )}

                {displayMedia.length > 0 && (
                  <div className="mt-4">
                     <p className="text-sm font-medium mb-2">Current & New Media Previews:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {displayMedia.map((dm) => (
                        <div key={dm.id} className="relative group aspect-square">
                          {dm.type === 'video' ? (
                            <video src={dm.url} controls muted loop className="rounded-md object-cover w-full h-full border" data-ai-hint="product video" />
                          ) : (
                            <NextImage 
                              src={dm.url} alt={`Preview for ${dm.id}`} layout="fill" objectFit="cover" 
                              className="rounded-md border" data-ai-hint="product item"
                              unoptimized={dm.isNew || dm.url.startsWith('blob:')} // unoptimize blob URLs and new file previews
                              onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/100x100.png?text=Error'; }}
                            />
                          )}
                          {!isUploadingGlobal && (
                            <Button
                              type="button" variant="destructive" size="icon"
                              className="absolute top-1 right-1 h-6 w-6 opacity-70 group-hover:opacity-100 transition-opacity z-10"
                              onClick={() => removeMedia(dm.id)}
                            > <X className="h-4 w-4" /> </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </FormItem>
              <Button type="submit" className="w-full md:w-auto" disabled={form.formState.isSubmitting || isUploadingGlobal}>
                {isUploadingGlobal ? (<> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading & Saving... </>) 
                : form.formState.isSubmitting ? (<> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Changes... </>) 
                : "Save Changes"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
