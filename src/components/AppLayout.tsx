
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Box, LayoutDashboard, Package, RefreshCw, Lightbulb, FileText, Menu, X, PackagePlus, List, Edit } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { 
    href: '/products', 
    label: 'Products', 
    icon: Package, 
    subItems: [
      { href: '/products', label: 'Product List', icon: List },
      { href: '/products/add', label: 'Add Product', icon: PackagePlus },
    ]
  },
  { href: '/restock', label: 'Restock Simulator', icon: RefreshCw },
  { href: '/recommendations', label: 'Item Pairing', icon: Lightbulb },
  { href: '/reports', label: 'Reports', icon: FileText },
];

function AppSidebar() {
  const pathname = usePathname();
  const { open, state, isMobile, setOpenMobile } = useSidebar();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  
  return (
    <Sidebar
      collapsible={isMobile ? "offcanvas" : "icon"}
      className="border-r"
    >
      <SidebarHeader className="p-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2" onClick={handleLinkClick}>
          <Box className="w-7 h-7 text-primary" />
          { (state === 'expanded' || isMobile) && <h1 className="text-xl font-semibold font-headline">StockPilot</h1> }
        </Link>
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={() => setOpenMobile(false)}>
            <X className="h-6 w-6" />
          </Button>
        )}
      </SidebarHeader>
      <SidebarContent className="flex-1 overflow-y-auto">
        <SidebarMenu>
          {navItems.map((item) => {
            // Determine if the main item or any sub-item is active
            // Special handling for /products/edit/[productId] to keep "Products" active
            let isActiveParent = pathname === item.href || 
                                (item.href === '/products' && pathname.startsWith('/products'));

            if (item.subItems && !isActiveParent) {
               isActiveParent = item.subItems.some(sub => pathname.startsWith(sub.href)) && item.href === '/products';
            }


            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActiveParent && !(item.subItems && item.subItems.some(sub => sub.href === pathname && sub.href !== item.href))}
                  tooltip={item.label}
                >
                  <Link href={item.href} onClick={handleLinkClick}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
                {item.subItems && (state === 'expanded' || isMobile) && isActiveParent && (
                  <ul className="pl-6 pt-1 space-y-1">
                    {item.subItems.map(subItem => (
                    <SidebarMenuItem key={subItem.href}>
                       <SidebarMenuButton
                          asChild
                          isActive={pathname === subItem.href}
                          variant="ghost"
                          size="sm"
                        >
                        <Link href={subItem.href} onClick={handleLinkClick} className="flex items-center gap-2">
                          <subItem.icon className="w-3.5 h-3.5" />
                          <span>{subItem.label}</span>
                        </Link>
                      </SidebarMenuButton>
                     </SidebarMenuItem>
                    ))}
                  </ul>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4">
        { (state === 'expanded' || isMobile) && <p className="text-xs text-sidebar-foreground/70">&copy; 2024 StockPilot</p> }
      </SidebarFooter>
    </Sidebar>
  );
}

function AppHeader() {
  const { isMobile, setOpenMobile } = useSidebar();
  return (
     <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
      {isMobile && (
        <Button variant="ghost" size="icon" onClick={() => setOpenMobile(true)} className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
      )}
      {!isMobile && <SidebarTrigger className="hidden md:flex"/>}
      <div className="flex-1">
        {/* Placeholder for breadcrumbs or page title if needed */}
      </div>
      {/* Add User Profile / Settings Dropdown here if needed */}
    </header>
  )
}


export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 w-full">
          <AppHeader />
          <SidebarInset className="p-4 md:p-6 lg:p-8">
            {children}
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
