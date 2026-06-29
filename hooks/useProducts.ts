/**
 * useProducts Hook
 * Fetch and manage products with caching
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Product } from '@/lib/types';

interface UseProductsOptions {
  categoryId?: string;
  autoFetch?: boolean;
  cacheTime?: number;
}

interface UseProductsReturn {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addProduct: (product: Partial<Product>) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  getLowStockProducts: () => Product[];
}

export function useProducts(options: UseProductsOptions = {}): UseProductsReturn {
  const { categoryId, autoFetch = true, cacheTime = 5 * 60 * 1000 } = options;

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const fetchProducts = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetch < cacheTime) {
      return; // Use cache
    }

    try {
      setIsLoading(true);

      const queryParams = new URLSearchParams();
      if (categoryId) queryParams.append('categoryId', categoryId);

      const response = await fetch(`/api/products?${queryParams.toString()}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      setProducts(data);
      setLastFetch(now);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [categoryId, lastFetch, cacheTime]);

  useEffect(() => {
    if (autoFetch) {
      fetchProducts();
    }
  }, [autoFetch, fetchProducts]);

  const addProduct = useCallback(async (product: Partial<Product>): Promise<Product> => {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });

    if (!response.ok) {
      throw new Error('Failed to create product');
    }

    const newProduct = await response.json();
    setProducts((prev) => [...prev, newProduct]);
    return newProduct;
  }, []);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>): Promise<Product> => {
    const response = await fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update product');
    }

    const updatedProduct = await response.json();
    setProducts((prev) => prev.map((p) => (p.id === id ? updatedProduct : p)));
    return updatedProduct;
  }, []);

  const deleteProduct = useCallback(async (id: string): Promise<void> => {
    const response = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete product');
    }

    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const getLowStockProducts = useCallback((): Product[] => {
    return products.filter((p) => p.stock <= p.minStock);
  }, [products]);

  return {
    products,
    isLoading,
    error,
    refetch: fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    getLowStockProducts,
  };
}
