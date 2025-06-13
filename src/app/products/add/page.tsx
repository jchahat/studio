
"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useProducts } from '@/contexts/ProductContext';
import type { ProductFormData } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { PackagePlus, Loader2, DollarSign, Percent, UploadCloud, X, Video, Image as ImageIcon } from 'lucide-react';
import NextImage from 'next/image';
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
  mediaUrls: z.array(z.string()).optional().default([]), // Will store B2 public URLs
});

const categories = ["Electronics", "Clothing", "Books", "Home Goods", "Groceries", "Toys", "Sports", "Beauty", "Automotive", "Garden", "Other"];

type StagedFile = {
  file: File;
  id: string; // For tracking progress
  previewUrl: string;
  type: 'image' | 'video';
  progress: number;
  b2Url?: string; // Store the final B2 URL here
  error?: string;
};

export default function AddProductPage() {
  const { addProduct } = useProducts();
  const { toast } = useToast();
  const router = useRouter();
  
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isUploadingGlobal, setIsUploadingGlobal] = useState(false); // For overall form submission state

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newStagedFiles: StagedFile[] = Array.from(files).map(file => ({
        file,
        id: crypto.randomUUID(),
        previewUrl: URL.createObjectURL(file),
        type: file.type.startsWith('video/') ? 'video' : 'image',
        progress: 0,
      }));
      setStagedFiles(prev => [...prev, ...newStagedFiles]);
    }
  };

  const removeMedia = (id: string) => {
    setStagedFiles(prev => prev.filter(sf => sf.id !== id));
    // If all files are removed, clear the file input value
    const fileInput = document.getElementById('media-upload') as HTMLInputElement;
    if (fileInput && stagedFiles.filter(sf => sf.id !== id).length === 0 ) {
        fileInput.value = ""; 
    }
  };

  const uploadFileToB2 = async (stagedFile: StagedFile): Promise<string> => {
    try {
      const b2Creds = await getB2UploadCredentialsAction(stagedFile.file.name);
      
      const response = await axios.post(b2Creds.uploadUrl, stagedFile.file, {
        headers: {
          'Authorization': b2Creds.authToken,
          'X-Bz-File-Name': b2Creds.finalFileName,
          'Content-Type': stagedFile.file.type,
          'X-Bz-Content-Sha1': 'do_not_verify', // For simplicity in this example
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setStagedFiles(prev => prev.map(sf => sf.id === stagedFile.id ? {...sf, progress: percentCompleted} : sf));
          }
        },
      });
      // Construct public URL
      const publicUrl = `${b2Creds.publicFileUrlBase}/${b2Creds.finalFileName}`;
      setStagedFiles(prev => prev.map(sf => sf.id === stagedFile.id ? {...sf, b2Url: publicUrl, progress: 100} : sf));
      return publicUrl;
    } catch (error: any) {
        console.error("B2 Upload failed for file:", stagedFile.file.name, error);
        setStagedFiles(prev => prev.map(sf => sf.id === stagedFile.id ? {...sf, error: `Upload failed: ${error.message || 'Unknown error'}`} : sf));
        throw new Error(`Failed to upload ${stagedFile.file.name} to B2.`);
    }
  };


  async function onSubmit(values: z.infer<typeof productSchema>) {
    setIsUploadingGlobal(true);
    let uploadedUrls: string[] = [];

    try {
      if (stagedFiles.length > 0) {
        const uploadPromises = stagedFiles.map(sf => uploadFileToB2(sf));
        uploadedUrls = await Promise.all(uploadPromises);
      }
      
      const submissionValues: ProductFormData = { 
        ...values,
        mediaUrls: uploadedUrls,
      };

      await addProduct(submissionValues);
      toast({
        title: "Product Added!",
        description: `${values.name} has been successfully added to the inventory.`,
      });
      form.reset();
      setStagedFiles([]);
      const fileInput = document.getElementById('media-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      router.push('/products');

    } catch (error: any) {
      toast({
        title: "Error Adding Product",
        description: error.message || "Could not add the product. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingGlobal(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <PackagePlus className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold font-headline">Add New Product</h1>
          <p className="text-muted-foreground">Fill in the details to add a new item to your inventory.</p>
        </div>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
          <CardDescription>Enter information for the new product.</CardDescription>
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
                      <FormLabel>Initial Stock Level</FormLabel>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      id="media-upload"
                      type="file" 
                      multiple 
                      accept="image/*,video/*"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                      disabled={isUploadingGlobal}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Upload one or more images or videos for the product. These will be uploaded to Backblaze B2.
                </FormDescription>
                <FormMessage />
                {stagedFiles.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {stagedFiles.map((sf) => (
                      <div key={sf.id} className="text-xs text-muted-foreground border p-2 rounded-md">
                        <div className="flex justify-between items-center">
                            <span>{sf.file.name} ({(sf.file.size / 1024).toFixed(2)} KB)</span>
                            {!isUploadingGlobal && !sf.b2Url && (
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeMedia(sf.id)} className="h-6 w-6 text-destructive">
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                        {sf.progress > 0 && sf.progress < 100 && (
                          <Progress value={sf.progress} className="h-2 mt-1" />
                        )}
                        {sf.b2Url && <p className="text-green-600 text-xs mt-1">Uploaded!</p>}
                        {sf.error && <p className="text-red-600 text-xs mt-1">{sf.error}</p>}
                      </div>
                    ))}
                  </div>
                )}
                {stagedFiles.filter(sf => sf.previewUrl).length > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {stagedFiles.map((sf) => (
                      <div key={sf.id} className="relative group aspect-square">
                        {sf.type === 'video' ? (
                          <video src={sf.previewUrl} controls muted loop className="rounded-md object-cover w-full h-full border" data-ai-hint="product video" />
                        ) : (
                          <NextImage src={sf.previewUrl} alt={`Preview ${sf.file.name}`} layout="fill" objectFit="cover" className="rounded-md border" data-ai-hint="product item" unoptimized={true} onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/100x100.png?text=Error'; }}/>
                        )}
                        {!isUploadingGlobal && !sf.b2Url && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 opacity-70 group-hover:opacity-100 transition-opacity z-10"
                            onClick={() => removeMedia(sf.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </FormItem>
              <Button type="submit" className="w-full md:w-auto" disabled={form.formState.isSubmitting || isUploadingGlobal}>
                {isUploadingGlobal ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading & Adding...
                  </>
                ) : form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding Product...
                  </>
                ) : "Add Product"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
