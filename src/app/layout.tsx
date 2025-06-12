import type { Metadata } from 'next';
import './globals.css';
import { ProductProvider } from '@/contexts/ProductContext';
import AppLayout from '@/components/AppLayout';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'StockPilot',
  description: 'Inventory Management System by Firebase Studio',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <ProductProvider>
          <AppLayout>{children}</AppLayout>
        </ProductProvider>
        <Toaster />
      </body>
    </html>
  );
}
