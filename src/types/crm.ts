// Core CRM types — extended from Lovable v3, additions marked NEW

export type ClientStatus = 'active' | 'inactive' | 'prospect';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;           // NEW: physical address
  status: ClientStatus;
  tags: string[];            // NEW: free-form tags for categorisation
  notes: string;
  createdAt: string;         // ISO date string
  deletedAt?: string;        // NEW: soft delete timestamp
}

export type ProductCategory = 'whiskey' | 'gin' | 'vodka' | 'rum' | 'liqueur' | 'other';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  basePrice: number;         // ILS
  unit: string;              // e.g. 'בקבוק'
  isActive: boolean;         // NEW: false = soft-deleted (still appears on old orders)
  sku?: string;              // NEW: optional, for future inventory system linkage
}

export interface OrderItem {
  productId: string;
  productName: string;       // snapshot at order time
  quantity: number;
  unitPrice: number;         // ILS, snapshot at order time
  discount: number;          // percentage 0–100
  total: number;             // computed: qty * unitPrice * (1 - discount/100)
}

export type PaymentStatus = 'paid' | 'pending' | 'partial';

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'check' | 'bit';

export interface Order {
  id: string;
  clientId: string;
  clientName: string;        // snapshot at order time
  items: OrderItem[];
  subtotal: number;          // sum of items before discounts
  totalDiscount: number;     // monetary value of total discount
  total: number;             // final ILS amount
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  amountPaid: number;        // NEW: tracks partial payments (= total for 'paid', 0 for 'pending')
  notes: string;
  createdAt: string;         // ISO date string
  updatedAt?: string;        // NEW: last modification timestamp
  deletedAt?: string;        // NEW: soft delete — financial records must never be hard-deleted
}

export interface ClientAnalytics {
  clientId: string;
  clientName: string;
  totalSales: number;        // sum of all order totals (including soft-deleted orders)
  orderCount: number;
  outstandingBalance: number; // sum of (order.total - order.amountPaid) for non-paid orders
  lastOrderDate: string | null;
  averageOrderValue: number;
}
