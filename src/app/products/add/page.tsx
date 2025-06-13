
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
import { PackagePlus, Loader2, DollarSign, Percent, UploadCloud, X } from 'lucide-react';
import Image from 'next/image';

const productSchema = z.object({
  name: z.string().min(2, { message: "Product name must be at least 2 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  price: z.coerce.number().min(0.01, { message: "Price must be greater than 0." }),
  discountPercentage: z.coerce.number().min(0, { message: "Discount cannot be negative." }).max(100, { message: "Discount cannot exceed 100%." }).optional().default(0),
  stockLevel: z.coerce.number().int().min(0, { message: "Stock level must be a non-negative integer." }),
  reorderPoint: z.coerce.number().int().min(0, { message: "Reorder point must be a non-negative integer." }),
  category: z.string().min(1, { message: "Please select a category." }),
  imageUrls: z.string().optional(), // Will store comma-separated Data URIs or be empty
});

const categories = ["Electronics", "Clothing", "Books", "Home Goods", "Groceries", "Toys", "Sports", "Beauty", "Automotive", "Garden", "Other"];

export default function AddProductPage() {
  const { addProduct } = useProducts();
  const { toast } = useToast();
  const router = useRouter();
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

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
    },
  });

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newPreviews: string[] = [];
      const newImageFiles: File[] = Array.from(files);
      
      setImageFiles(newImageFiles);

      newImageFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result as string);
          if (newPreviews.length === newImageFiles.length) {
            setImagePreviews([...newPreviews]);
          }
        };
        reader.readAsDataURL(file);
      });
      if (newImageFiles.length === 0) { // Handle case where all files are deselected
        setImagePreviews([]);
      }
    }
  };

  const removeImage = (index: number) => {
    const newImageFiles = [...imageFiles];
    const newImagePreviews = [...imagePreviews];
    newImageFiles.splice(index, 1);
    newImagePreviews.splice(index, 1);
    setImageFiles(newImageFiles);
    setImagePreviews(newImagePreviews);

    // Update the underlying file input if possible (this is tricky and often not fully supported)
    // For simplicity, we manage file list in state and construct imageUrls on submit.
  };

  async function onSubmit(values: ProductFormData) {
    try {
      // Convert imageFiles to Data URIs and join them
      const dataUris = await Promise.all(
        imageFiles.map(file => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        })
      );
      
      const submissionValues = {
        ...values,
        imageUrls: dataUris.join(','),
      };

      await addProduct(submissionValues);
      toast({
        title: "Product Added!",
        description: `${values.name} has been successfully added to the inventory.`,
      });
      form.reset();
      setImagePreviews([]);
      setImageFiles([]);
      router.push('/products');
    } catch (error: any) {
      toast({
        title: "Error Adding Product",
        description: error.message || "Could not add the product. Please try again.",
        variant: "destructive",
      });
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
              <FormField
                control={form.control}
                name="imageUrls" 
                render={({ field }) => ( 
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
                      Upload one or more images for the product. Re-uploading will replace existing selections.
                    </FormDescription>
                    <FormMessage />
                    {imagePreviews.length > 0 && (
                      <div className="mt-4 grid grid-cols-3 gap-4">
                        {imagePreviews.map((src, index) => (
                          <div key={index} className="relative group">
                            <Image src={src} alt={`Preview ${index + 1}`} width={100} height={100} className="rounded-md object-cover aspect-square border" data-ai-hint="product item"/>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeImage(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full md:w-auto" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
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
