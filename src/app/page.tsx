"use client";

import { useProducts } from '@/contexts/ProductContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Package, AlertTriangle, DollarSign, ListChecks, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { products } = useProducts();

  const totalProducts = products.length;
  const totalStockValue = products.reduce((sum, p) => sum + p.stockLevel, 0); 
  const lowStockProducts = products.filter(p => p.stockLevel <= p.reorderPoint);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-headline">Inventory Dashboard</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">Unique items in inventory</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Units</CardTitle>
            <ListChecks className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalStockValue}</div>
            <p className="text-xs text-muted-foreground">Sum of all items in stock</p>
          </CardContent>
        </Card>

        <Card className={`shadow-lg hover:shadow-xl transition-shadow duration-300 ${lowStockProducts.length > 0 ? 'border-destructive' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className={`h-5 w-5 ${lowStockProducts.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${lowStockProducts.length > 0 ? 'text-destructive' : ''}`}>{lowStockProducts.length}</div>
            <p className="text-xs text-muted-foreground">Items needing reorder</p>
          </CardContent>
        </Card>
      </div>

      {lowStockProducts.length > 0 && (
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle>Low Stock Items</CardTitle>
            <CardDescription>These items are at or below their reorder point.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {lowStockProducts.slice(0, 5).map(product => (
                <li key={product.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted">
                  <span>{product.name} (Stock: {product.stockLevel}, Reorder at: {product.reorderPoint})</span>
                  <Link href="/restock">
                    <Button variant="outline" size="sm">Restock</Button>
                  </Link>
                </li>
              ))}
              {lowStockProducts.length > 5 && (
                 <li className="text-center pt-2">
                  <Link href="/products">
                    <Button variant="link">View all low stock items...</Button>
                  </Link>
                 </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
            <Link href="/products/add">
                <Button variant="default"><Package className="mr-2 h-4 w-4" /> Add New Product</Button>
            </Link>
            <Link href="/products">
                <Button variant="outline"><ListChecks className="mr-2 h-4 w-4" /> View All Products</Button>
            </Link>
             <Link href="/restock">
                <Button variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> Simulate Restock</Button>
            </Link>
        </CardContent>
      </Card>

    </div>
  );
}
