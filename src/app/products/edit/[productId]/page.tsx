
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
  mediaUrls: z.array(z.string().url({message: "Each media URL must be a valid URL."})).optional().default([]),
});

const categories = ["Electronics", "Clothing", "Books", "Home Goods", "Groceries", "Toys", "Sports", "Beauty", "Automotive", "Garden", "Other"];

type DisplayMedia = { 
  url: string; 
  type: 'image' | 'video'; 
  isNew?: boolean; // True if it's a local file preview, false if it's an existing B2 URL
  file?: File; // The actual file object for new uploads
  id: string; // Unique ID for keying and tracking
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
  
  const [displayMedia, setDisplayMedia] = useState<DisplayMedia[]>([]);
  const [isUploadingGlobal, setIsUploadingGlobal] = useState(false);
  // URLs of existing B2 files that were removed by the user (actual deletion from B2 is not implemented here)
  const [removedB2Urls, setRemovedB2Urls] = useState<string[]>([]);


  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '', description: '', price: 0, discountPercentage: 0,
      stockLevel: 0, reorderPoint: 0, category: '', mediaUrls: [],
    },
  });
  
  const populateForm = useCallback((productData: Product) => {
    form.reset({
      ...productData,
      mediaUrls: productData.mediaUrls || [],
    });
    if (productData.mediaUrls && productData.mediaUrls.length > 0) {
      setDisplayMedia(productData.mediaUrls.map(url => ({
        url,
        type: url.includes('.mp4') || url.includes('.webm') || url.includes('video') ? 'video' : 'image', // Basic type detection
        isNew: false,
        id: crypto.randomUUID(), // Assign a new ID for React key purposes
      })));
    } else {
      setDisplayMedia([]);
    }
    setRemovedB2Urls([]);
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
      const newFilesArray: DisplayMedia[] = Array.from(files).map(file => ({
        file,
        url: URL.createObjectURL(file), // This is the local preview URL
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
    if (itemToRemove && !itemToRemove.isNew) { // If it's an existing B2 URL
      setRemovedB2Urls(prev => [...prev, itemToRemove.url]);
      // Note: Actual deletion from B2 is not handled here. That would require another server action.
    }
    setDisplayMedia(prev => prev.filter(dm => dm.id !== id));
    
    const fileInput = document.getElementById('media-upload-edit') as HTMLInputElement;
    if (fileInput && displayMedia.filter(dm => dm.id !== id).length === 0 ) {
        fileInput.value = ""; 
    }
  };

  const uploadFileToB2 = async (mediaItem: DisplayMedia): Promise<string> => {
    if (!mediaItem.file) throw new Error("File missing for B2 upload.");
    try {
      const b2Creds = await getB2UploadCredentialsAction(mediaItem.file.name);
      
      const response = await axios.post(b2Creds.uploadUrl, mediaItem.file, {
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
      setDisplayMedia(prev => prev.map(dm => dm.id === mediaItem.id ? {...dm, url: publicUrl, progress: 100, isNew: false} : dm)); // Update URL to B2 URL
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
      // Get URLs of existing files that were NOT removed
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
            <Skeleton className="h-10 w-full" /> <Skeleton className="h-10 w-full" />
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
              {/* Other FormFields remain the same */}
              <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Product Name</FormLabel> <FormControl> <Input placeholder="e.g., Wireless Keyboard" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
              <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl> <Textarea placeholder="Describe the product..." {...field} rows={3} /> </FormControl> <FormMessage /> </FormItem> )} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="price" render={({ field }) => ( <FormItem> <FormLabel>Price</FormLabel> <FormControl> <div className="relative"> <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /> <Input type="number" step="0.01" placeholder="0.00" {...field} className="pl-8" /> </div> </FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="discountPercentage" render={({ field }) => ( <FormItem> <FormLabel>Discount (%)</FormLabel> <FormControl> <div className="relative"> <Percent className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /> <Input type="number" step="1" placeholder="0" {...field} className="pl-8" /> </div> </FormControl> <FormDescription>Enter a value between 0 and 100.</FormDescription> <FormMessage /> </FormItem> )} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="stockLevel" render={({ field }) => ( <FormItem> <FormLabel>Stock Level</FormLabel> <FormControl> <Input type="number" placeholder="0" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="reorderPoint" render={({ field }) => ( <FormItem> <FormLabel>Reorder Point</FormLabel> <FormControl> <Input type="number" placeholder="0" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
              </div>
              <FormField control={form.control} name="category" render={({ field }) => ( <FormItem> <FormLabel>Category</FormLabel> <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}> <FormControl> <SelectTrigger> <SelectValue placeholder="Select a category" /> </SelectTrigger> </FormControl> <SelectContent> {categories.map(category => ( <SelectItem key={category} value={category}>{category}</SelectItem> ))} </SelectContent> </Select> <FormMessage /> </FormItem> )} />
              
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
                        {dm.progress === 100 && !dm.error && <p className="text-green-600 text-xs mt-1">Ready for B2 upload</p>}
                        {dm.error && <p className="text-red-600 text-xs mt-1">{dm.error}</p>}
                      </div>
                    ))}
                  </div>
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
                              unoptimized={dm.isNew} // Only unoptimize local blob previews
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
