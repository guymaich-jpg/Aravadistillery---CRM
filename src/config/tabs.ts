// Tab registry — SINGLE FILE to edit when adding future tabs.
// Navigation.tsx and Index.tsx both read from this array.
// Adding a new tab = add one entry here, create the page component.

import type { ComponentType } from 'react';
import {
  Users,
  ShoppingCart,
  Plus,
  Package,
  BarChart2,
  Factory,
} from 'lucide-react';

export type TabId = 'clients' | 'orders' | 'new-order' | 'inventory' | 'analytics' | 'factory';

export interface TabDefinition {
  id: TabId;
  labelHe: string;          // Hebrew navigation label
  labelEn: string;          // English (for accessibility / debug)
  Icon: ComponentType<{ className?: string }>;
  // component is resolved lazily in Index.tsx to avoid circular imports
  showInNav: boolean;       // false = opened programmatically (e.g. new-order)
}

export const TAB_REGISTRY: TabDefinition[] = [
  {
    id: 'clients',
    labelHe: 'לקוחות',
    labelEn: 'Clients',
    Icon: Users,
    showInNav: true,
  },
  {
    id: 'orders',
    labelHe: 'הזמנות',
    labelEn: 'Orders',
    Icon: ShoppingCart,
    showInNav: true,
  },
  {
    id: 'new-order',
    labelHe: 'הזמנה חדשה',
    labelEn: 'New Order',
    Icon: Plus,
    showInNav: false,
  },
  {
    id: 'inventory',
    labelHe: 'מלאי',
    labelEn: 'Inventory',
    Icon: Package,
    showInNav: true,
  },
  {
    id: 'analytics',
    labelHe: 'ניתוח',
    labelEn: 'Analytics',
    Icon: BarChart2,
    showInNav: true,
  },
  {
    id: 'factory',
    labelHe: 'מפעל',
    labelEn: 'Factory',
    Icon: Factory,
    showInNav: true,
  },
];

export const DEFAULT_TAB: TabId = 'clients';

export function getTab(id: string): TabDefinition | undefined {
  return TAB_REGISTRY.find(t => t.id === id);
}

export const NAV_TABS = TAB_REGISTRY.filter(t => t.showInNav);
