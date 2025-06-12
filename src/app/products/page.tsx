
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useProducts } from '@/contexts/ProductContext';
import type { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowUpDown, Search, PackagePlus, Edit, Trash2, Package, Loader2, AlertCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';

export default function ProductListPage() {
  const { products, deleteProduct, loading, error: contextError, refreshProducts } = useProducts();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product | null; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // Track deleting product ID

  useEffect(() => {
    // If there was an error, provide a way to retry
    if (contextError) {
        toast({
            title: "Error Loading Products",
            description: "Could not load products from the database. Please try refreshing.",
            variant: "destructive",
        });
    }
  }, [contextError, toast]);

  const sortedProducts = useMemo(() => {
    let sortableProducts = [...products];
    if (sortConfig.key) {
      sortableProducts.sort((a, b) => {
        const valA = a[sortConfig.key!];
        const valB = b[sortConfig.key!];

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortConfig.direction === 'ascending' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
           return sortConfig.direction === 'ascending' ? valA - valB : valB - valA;
        }
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableProducts.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm, sortConfig]);

  const requestSort = (key: keyof Product) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    setIsDeleting(productId);
    try {
      await deleteProduct(productId);
      toast({
        title: "Product Deleted",
        description: `Product "${productName}" has been successfully deleted.`,
      });
    } catch (err) {
      toast({
        title: "Error Deleting Product",
        description: `Could not delete "${productName}". Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const renderLoadingSkeletons = () => (
    Array.from({ length: 5 }).map((_, index) => (
      <TableRow key={`skeleton-${index}`}>
        <TableCell className="hidden sm:table-cell"><Skeleton className="h-[64px] w-[64px] rounded-md" /></TableCell>
        <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-full" /></TableCell>
        <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-1/2" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-4 w-1/4 ml-auto" /></TableCell>
        <TableCell className="text-right hidden sm:table-cell"><Skeleton className="h-4 w-1/4 ml-auto" /></TableCell>
        <TableCell className="text-right"><div className="flex gap-1 justify-end"><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-8 w-8 rounded" /></div></TableCell>
      </TableRow>
    ))
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Product Inventory</h1>
          <p className="text-muted-foreground">Manage your product stock and details.</p>
        </div>
        <Link href="/products/add">
          <Button>
            <PackagePlus className="mr-2 h-4 w-4" /> Add New Product
          </Button>
        </Link>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>All Products</CardTitle>
              <CardDescription>View, search, and sort your products.</CardDescription>
            </div>
            <div className="relative w-full sm:w-auto sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products..."
                className="pl-8 w-full sm:w-auto"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {contextError && (
            <div className="text-center py-12 text-destructive">
                <AlertCircle className="mx-auto h-12 w-12" />
                <h3 className="mt-2 text-sm font-semibold">Error Loading Products</h3>
                <p className="mt-1 text-sm">{contextError}</p>
                <Button onClick={refreshProducts} className="mt-4">
                    <Loader2 className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Try Again
                </Button>
            </div>
          )}
          {!contextError && loading && products.length === 0 && (
             <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px] hidden sm:table-cell"></TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="hidden md:table-cell">Description</TableHead>
                            <TableHead className="hidden lg:table-cell">Category</TableHead>
                            <TableHead className="text-right">Stock</TableHead>
                            <TableHead className="text-right hidden sm:table-cell">Reorder At</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {renderLoadingSkeletons()}
                    </TableBody>
                </Table>
             </div>
          )}
          {!contextError && !loading && products.length === 0 && (
             <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold text-foreground">No products yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">Get started by adding a new product.</p>
                <div className="mt-6">
                  <Link href="/products/add">
                    <Button type="button">
                      <PackagePlus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                      New Product
                    </Button>
                  </Link>
                </div>
              </div>
          )}
          {!contextError && sortedProducts.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] hidden sm:table-cell"></TableHead>
                  <TableHead onClick={() => requestSort('name')} className="cursor-pointer hover:bg-muted">
                    Name <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead onClick={() => requestSort('category')} className="cursor-pointer hover:bg-muted hidden lg:table-cell">
                    Category <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                  </TableHead>
                  <TableHead onClick={() => requestSort('stockLevel')} className="cursor-pointer hover:bg-muted text-right">
                    Stock <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                  </TableHead>
                  <TableHead onClick={() => requestSort('reorderPoint')} className="cursor-pointer hover:bg-muted text-right hidden sm:table-cell">
                    Reorder At <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProducts.map((product) => (
                  <TableRow key={product.id} className={product.stockLevel <= product.reorderPoint ? 'bg-destructive/10 hover:bg-destructive/20' : 'hover:bg-muted/50'}>
                    <TableCell className="hidden sm:table-cell">
                      <Image
                        src={product.imageUrl || `https://placehold.co/64x64.png?text=${product.name.charAt(0)}`}
                        alt={product.name}
                        width={64}
                        height={64}
                        className="rounded-md object-cover aspect-square"
                        data-ai-hint="product item"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="hidden md:table-cell max-w-xs truncate">{product.description}</TableCell>
                    <TableCell className="hidden lg:table-cell">{product.category}</TableCell>
                    <TableCell className="text-right">{product.stockLevel}</TableCell>
                    <TableCell className="text-right hidden sm:table-cell">{product.reorderPoint}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" disabled className="opacity-50 cursor-not-allowed">
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={isDeleting === product.id}>
                              {isDeleting === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              <span className="sr-only">Delete</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the product "{product.name}" from the database.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteProduct(product.id, product.name)}
                                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                disabled={isDeleting === product.id}
                              >
                                {isDeleting === product.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
