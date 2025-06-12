"use client";

import React, { useState } from 'react';
import { useProducts } from '@/contexts/ProductContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RefreshCw, Package, PackagePlus } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';

export default function RestockPage() {
  const { products, updateProductStock, getProductById } = useProducts();
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState<number>(1);
  const { toast } = useToast();

  const selectedProduct = selectedProductId ? getProductById(selectedProductId) : undefined;

  const handleRestock = () => {
    if (!selectedProductId || !selectedProduct) {
      toast({
        title: "Error",
        description: "Please select a product.",
        variant: "destructive",
      });
      return;
    }
    if (quantity <= 0) {
      toast({
        title: "Error",
        description: "Quantity must be greater than zero.",
        variant: "destructive",
      });
      return;
    }

    const newStockLevel = selectedProduct.stockLevel + quantity;
    updateProductStock(selectedProductId, newStockLevel);
    toast({
      title: "Restock Successful!",
      description: `${quantity} units of ${selectedProduct.name} added. New stock: ${newStockLevel}.`,
    });
    setQuantity(1); // Reset quantity
  };
  
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center">
        <Package className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No Products to Restock</h2>
        <p className="text-muted-foreground mb-6">
          You need to add some products to your inventory before you can restock them.
        </p>
        <Link href="/products/add">
          <Button>
            <PackagePlus className="mr-2 h-4 w-4" /> Add Product First
          </Button>
        </Link>
      </div>
    );
  }


  return (
    <div className="max-w-md mx-auto">
       <div className="flex items-center gap-4 mb-8">
        <RefreshCw className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold font-headline">Restock Simulator</h1>
          <p className="text-muted-foreground">Simulate adding new stock to your products.</p>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Restock Product</CardTitle>
          <CardDescription>Select a product and enter the quantity to add.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label htmlFor="product-select" className="block text-sm font-medium mb-1">Product</label>
            <Select onValueChange={setSelectedProductId} value={selectedProductId}>
              <SelectTrigger id="product-select">
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} (Current Stock: {product.stockLevel})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProduct && (
            <div className="p-4 border rounded-md bg-muted/50">
                <h4 className="font-semibold">{selectedProduct.name}</h4>
                <p className="text-sm text-muted-foreground">Current Stock: {selectedProduct.stockLevel}</p>
                <p className="text-sm text-muted-foreground">Reorder Point: {selectedProduct.reorderPoint}</p>
            </div>
          )}

          <div>
            <label htmlFor="quantity" className="block text-sm font-medium mb-1">Quantity to Add</label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
              min="1"
            />
          </div>
          
          <Button onClick={handleRestock} className="w-full" disabled={!selectedProductId}>
            <RefreshCw className="mr-2 h-4 w-4" /> Restock
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
