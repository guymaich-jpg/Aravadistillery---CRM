// useProducts — product-domain hook built on top of CRMContext.
// Exposes the full product list, the active-only subset, and all mutators.

import { useCRM } from '@/store/CRMContext';
import type { Product } from '@/types/crm';

export interface UseProductsReturn {
  /** All products including deactivated ones */
  products: Product[];
  /** Only products where isActive === true */
  activeProducts: Product[];
  /** Add a new product */
  addProduct: (data: Omit<Product, 'id'>) => Promise<void>;
  /** Update an existing product's fields */
  updateProduct: (id: string, partial: Partial<Product>) => Promise<void>;
  /** Soft-deactivate a product (sets isActive: false) */
  deactivateProduct: (id: string) => Promise<void>;
}

export function useProducts(): UseProductsReturn {
  const {
    products,
    addProduct,
    updateProduct,
    deactivateProduct,
    getActiveProducts,
  } = useCRM();

  return {
    products,
    activeProducts: getActiveProducts(),
    addProduct,
    updateProduct,
    deactivateProduct,
  };
}
