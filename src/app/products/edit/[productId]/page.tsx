
"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useProducts } from '@/contexts/ProductContext';
import type { Product, ProductFormData } from '@/types'; // ProductFormData is fine for edit too
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams } from 'next/navigation';
import { Edit, Loader2, PackageOpen, DollarSign, Percent, AlertCircle, UploadCloud, X, Video } from 'lucide-react';
import NextImage from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';

const productSchema = z.object({
  name: z.string().min(2, { message: "Product name must be at least 2 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  price: z.coerce.number().min(0.01, { message: "Price must be greater than 0." }),
  discountPercentage: z.coerce.number().min(0, { message: "Discount cannot be negative." }).max(100, { message: "Discount cannot exceed 100%." }).optional().default(0),
  stockLevel: z.coerce.number().int().min(0, { message: "Stock level must be a non-negative integer." }),
  reorderPoint: z.coerce.number().int().min(0, { message: "Reorder point must be a non-negative integer." }),
  category: z.string().min(1, { message: "Please select a category." }),
  mediaUrls: z.string().optional(), // Stores comma-separated Data URIs or existing URLs
});

const categories = ["Electronics", "Clothing", "Books", "Home Goods", "Groceries", "Toys", "Sports", "Beauty", "Automotive", "Garden", "Other"];

export default function EditProductPage() {
  const { updateProduct, fetchProductByIdFromServer, getProductById } = useProducts();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const productId = params.productId as string;

  const [product, setProduct] = useState<Product | null | undefined>(undefined); 
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]); // Shows existing URLs or new Data URIs
  const [stagedFiles, setStagedFiles] = useState<File[]>([]); // For newly uploaded files

  const form = useForm<ProductFormData>({ // Reusing ProductFormData, which includes mediaUrls as string
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      discountPercentage: 0,
      stockLevel: 0,
      reorderPoint: 0,
      category: '',
      mediaUrls: '',
    },
  });

  const populateForm = (productData: Product) => {
    form.reset({
      ...productData,
      mediaUrls: productData.mediaUrls?.join(',') || '', // For form field, existing URLs as string
    });
    if (productData.mediaUrls && productData.mediaUrls.length > 0) {
      setMediaPreviews(productData.mediaUrls.filter(url => url.startsWith('data:') || url.startsWith('http')));
    } else {
      setMediaPreviews([]);
    }
    setStagedFiles([]); // Reset any staged files from previous interactions
  };
  
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
  }, [productId, fetchProductByIdFromServer, getProductById]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newStagedFiles = Array.from(files);
      setStagedFiles(newStagedFiles); // New files replace old staged files

      const newPreviews: string[] = [];
      if (newStagedFiles.length === 0) {
        // If user deselects all files, revert to original product media if available
        setMediaPreviews(product?.mediaUrls || []);
        return;
      }
      
      newStagedFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result as string);
          if (newPreviews.length === newStagedFiles.length) {
            setMediaPreviews(newPreviews); // Previews are now for newly uploaded files
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeMediaPreview = (index: number) => {
    const newMediaPreviews = [...mediaPreviews];
    newMediaPreviews.splice(index, 1);
    setMediaPreviews(newMediaPreviews);
    
    // Check if the removed preview corresponds to a staged file
    // This part is a bit tricky if mediaPreviews contains mixed (original URLs + new Data URIs)
    // A simpler approach: if a preview is removed, we must ensure it's not from stagedFiles
    // or ensure stagedFiles is also updated.
    // If the removed preview was a Data URI and was part of the *current* upload batch (stagedFiles), remove from stagedFiles.
    const removedSrc = mediaPreviews[index];
    const stagedFileIndex = stagedFiles.findIndex(file => {
        // This check is imperfect as multiple files could have same name/size, but good enough for UI
        // A more robust way would be to create {file: File, preview: string} objects in stagedFiles
        // For now, if it's a data URI, we assume it might be from the staged files.
        return removedSrc.startsWith('data:'); // simplistic check
    });

    if (removedSrc.startsWith('data:') && stagedFileIndex > -1 && index < stagedFiles.length) { // ensure index is valid for stagedFiles
      const newStagedFiles = [...stagedFiles];
      // This assumes the order of mediaPreviews (when showing staged files) matches stagedFiles.
      // This holds if handleFileChange sets mediaPreviews directly from stagedFiles.
      // If mediaPreviews was showing a mix (initial + new), this needs care.
      // Let's assume for now, if a data URI is removed, we try to remove a corresponding staged file.
      // A better way: when a preview is removed, if it's one of the *newly uploaded Data URIs*, remove the corresponding File object from `stagedFiles`.
      // The current `stagedFiles` reflects the *new* files selected for upload.
      // If `mediaPreviews[index]` was derived from `stagedFiles[index]`, then:
      if (stagedFiles.length === mediaPreviews.length && mediaPreviews.every(p => p.startsWith('data:'))) {
         // This implies all previews are from current staged files.
         newStagedFiles.splice(index, 1);
         setStagedFiles(newStagedFiles);
      } else {
        // If previews are mixed (original + new), or only original, just remove from preview.
        // The submit logic will handle using the remaining previews or staged files.
      }
    }
     // If all files are removed, clear the file input value
    const fileInput = document.getElementById('media-upload-edit') as HTMLInputElement;
    if (fileInput && newMediaPreviews.length === 0 && stagedFiles.length === 0) {
        fileInput.value = ""; 
    }
  };


  async function onSubmit(values: ProductFormData) {
    if (!productId || !product) return;
    try {
      let finalMediaUrlsString: string;

      if (stagedFiles.length > 0) { // New files were uploaded
        const dataUris = await Promise.all(
          stagedFiles.map(file => {
            return new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
          })
        );
        finalMediaUrlsString = dataUris.join(',');
      } else { // No new files uploaded, use the current state of mediaPreviews
        // Filter out any placeholders if they were not meant to be saved.
        // For edit, if mediaPreviews is empty, it means user cleared them.
        finalMediaUrlsString = mediaPreviews.filter(p => p.startsWith('data:') || p.startsWith('http')).join(',');
      }
      
      const submissionValues = {
        ...values, // Form values (name, desc, price etc.)
        mediaUrls: finalMediaUrlsString, // String of Data URIs or existing URLs
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
              <FormField
                control={form.control}
                name="mediaUrls"
                render={({ field }) => ( 
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
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Upload new images/videos to replace existing ones. If no new files are uploaded, current media will be kept unless cleared below.
                    </FormDescription>
                    <FormMessage />
                    {mediaPreviews.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {mediaPreviews.map((src, index) => {
                          const isVideo = src.startsWith('data:video') || (src.startsWith('http') && (src.includes('.mp4') || src.includes('.webm') || src.includes('.ogv'))); // Basic check for video
                          return (
                            <div key={index} className="relative group aspect-square">
                              {isVideo ? (
                                <video src={src} controls muted loop className="rounded-md object-cover w-full h-full border" data-ai-hint="product video" />
                              ) : (
                                <NextImage 
                                  src={src} 
                                  alt={`Preview ${index + 1}`} 
                                  layout="fill" 
                                  objectFit="cover" 
                                  className="rounded-md border" 
                                  data-ai-hint="product item"
                                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/100x100.png?text=Error'; }}
                                />
                              )}
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                onClick={() => removeMediaPreview(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full md:w-auto" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
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
