"use client";

import React, { useMemo } from 'react';
import { useProducts } from '@/contexts/ProductContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, Layers, Package, BarChart3 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82Ca9D', '#FF5733', '#C70039'];

export default function ReportsPage() {
  const { products } = useProducts();

  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + p.stockLevel, 0);

  const productsByCategory = useMemo(() => {
    const categoryMap: { [key: string]: { count: number; stock: number } } = {};
    products.forEach(product => {
      if (!categoryMap[product.category]) {
        categoryMap[product.category] = { count: 0, stock: 0 };
      }
      categoryMap[product.category].count++;
      categoryMap[product.category].stock += product.stockLevel;
    });
    return Object.entries(categoryMap).map(([name, data]) => ({ name, ...data }));
  }, [products]);

  const chartData = productsByCategory.map(cat => ({ name: cat.name, value: cat.count }));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold font-headline">Inventory Reports</h1>
          <p className="text-muted-foreground">Snapshots of your current inventory status.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Unique Products</CardTitle>
            <Package className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalProducts}</div>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Units</CardTitle>
            <Layers className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalStock}</div>
          </CardContent>
        </Card>
         <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Number of Categories</CardTitle>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{productsByCategory.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Products by Category</CardTitle>
            <CardDescription>Count of unique products in each category.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {productsByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent, value }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value} products`, name]}/>
                  <Legend wrapperStyle={{fontSize: '0.875rem'}}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
               <p className="text-muted-foreground text-center pt-10">No category data to display. Add products with categories.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Stock Levels by Category</CardTitle>
            <CardDescription>Total stock units for each product category.</CardDescription>
          </CardHeader>
          <CardContent>
            {productsByCategory.length > 0 ? (
                <ul className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                {productsByCategory.sort((a,b) => b.stock - a.stock).map((category, index) => (
                    <li key={category.name} className="p-3 rounded-md border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-card-foreground">{category.name}</span>
                        <span className="font-semibold text-primary">{category.stock} units</span>
                    </div>
                    <div className="text-sm text-muted-foreground">{category.count} product(s) in this category</div>
                    </li>
                ))}
                </ul>
            ) : (
                 <p className="text-muted-foreground text-center pt-10">No stock data to display by category.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
