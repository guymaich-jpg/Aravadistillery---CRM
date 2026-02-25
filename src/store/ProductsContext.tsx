// ProductsContext — isolated state + CRUD for the products collection.

/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Product } from '@/types/crm';
import type { StorageResult } from '@/lib/storage/adapter';
import { storageAdapter } from '@/lib/storage';
import { generateId } from '@/lib/id';

// ── Context shape ────────────────────────────────────────────────────────────

export interface ProductsCtxValue {
  products: Product[];
  isLoading: boolean;
  storageError: string | null;
  addProduct(data: Omit<Product, 'id'>): Promise<void>;
  updateProduct(id: string, partial: Partial<Product>): Promise<void>;
  deactivateProduct(id: string): Promise<void>;
  getActiveProducts(): Product[];
}

const ProductsCtx = createContext<ProductsCtxValue | null>(null);

export function useProductsCtx(): ProductsCtxValue {
  const ctx = useContext(ProductsCtx);
  if (!ctx) throw new Error('useProductsCtx must be used inside ProductsProvider');
  return ctx;
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);

  function unwrap<T>(result: StorageResult<T>): T | undefined {
    if (result.ok) return result.data;
    setStorageError(result.error);
    return undefined;
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await storageAdapter.getProducts();
        if (cancelled) return;
        if (result.ok) setProducts(result.data);
        else setStorageError(result.error);
      } catch (e) {
        if (!cancelled) setStorageError(e instanceof Error ? e.message : 'שגיאה בטעינת מוצרים');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const addProduct = useCallback(
    async (data: Omit<Product, 'id'>) => {
      const product: Product = { ...data, id: generateId() };
      if (!unwrap(await storageAdapter.saveProduct(product))) return;
      setProducts(prev => [...prev, product]);
    },
    [],
  );

  const updateProduct = useCallback(
    async (id: string, partial: Partial<Product>) => {
      let found: Product | undefined;
      setProducts(prev => { found = prev.find(p => p.id === id); return prev; });
      if (!found) return;
      const updated: Product = { ...found, ...partial };
      if (!unwrap(await storageAdapter.saveProduct(updated))) return;
      setProducts(prev => prev.map(p => (p.id === id ? updated : p)));
    },
    [],
  );

  const deactivateProduct = useCallback(
    async (id: string) => {
      let found: Product | undefined;
      setProducts(prev => { found = prev.find(p => p.id === id); return prev; });
      if (!found) return;
      const updated: Product = { ...found, isActive: false };
      if (!unwrap(await storageAdapter.saveProduct(updated))) return;
      setProducts(prev => prev.map(p => (p.id === id ? updated : p)));
    },
    [],
  );

  const getActiveProducts = useCallback(
    (): Product[] => products.filter(p => p.isActive),
    [products],
  );

  const value: ProductsCtxValue = {
    products, isLoading, storageError,
    addProduct, updateProduct, deactivateProduct, getActiveProducts,
  };

  return <ProductsCtx.Provider value={value}>{children}</ProductsCtx.Provider>;
}
