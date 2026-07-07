// Default seed data for first-run initialization (fresh / localStorage installs).
// The catalog is the single source of truth shared with Factory Control.

import type { Product } from '@/types/crm';
import { CATALOG } from './catalog';

export const DEFAULT_PRODUCTS: Product[] = CATALOG;
