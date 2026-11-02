export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface ProductCard {
  id: string;
  slug: string;
  sku: string;
  name: string;
  shortDescription: string;
  pricePaise: number;
  compareAtPaise: number | null;
  discountPercent: number;
  stock: number;
  stockStatus: StockStatus;
  isFeatured: boolean;
  period: string | null;
  origin: string | null;
  provenanceType: 'ILLUSTRATIVE' | 'DOCUMENTED';
  category: { id: string; slug: string; name: string };
  image: { url: string; alt: string } | null;
  hoverImage: { url: string; alt: string } | null;
  createdAt: string;
}

export interface ProductDetail extends ProductCard {
  description: string;
  materials: string | null;
  dimensions: string | null;
  provenance: string | null;
  condition: string | null;
  imageCredit: string | null;
  images: { id: string; url: string; alt: string }[];
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  productCount: number;
}

export interface Totals {
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  taxPaise: number;
  totalPaise: number;
  freeShippingApplied: boolean;
  couponCode: string | null;
  couponError: string | null;
}

export interface CartItem {
  id: string;
  quantity: number;
  lineTotalPaise: number;
  maxQuantity: number;
  product: ProductCard;
}

export interface Cart {
  items: CartItem[];
  itemCount: number;
  couponCode?: string | null;
  warnings: string[];
  totals: Totals;
}

export interface Wishlist {
  items: { id: string; addedAt: string; product: ProductCard }[];
  productIds: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: 'CUSTOMER' | 'ADMIN';
  createdAt: string;
}

export interface Address {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface StoreInfo {
  store: { storeName: string; supportEmail: string; supportPhone: string; address: string; announcement: string };
  shipping: {
    standardPaise: number;
    expressPaise: number;
    freeShippingThresholdPaise: number;
    standardDays: string;
    expressDays: string;
    taxRatePercent: number;
  };
  paymentProvider: 'demo' | 'razorpay';
}

export type OrderStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'PAYMENT_FAILED';

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalPaise: number;
  createdAt: string;
  isDemo: boolean;
  itemCount: number;
  items: { productName: string; imageUrl: string | null; quantity: number }[];
}

export interface OrderItem {
  id: string;
  productId: string | null;
  productName: string;
  productSku: string;
  productSlug: string;
  imageUrl: string | null;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
}

export interface OrderDetail {
  id: string;
  orderNumber: string;
  email: string;
  customerName: string;
  phone: string;
  status: OrderStatus;
  deliveryMethod: string;
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  taxPaise: number;
  totalPaise: number;
  couponCode: string | null;
  shipName: string;
  shipPhone: string;
  shipLine1: string;
  shipLine2: string | null;
  shipCity: string;
  shipState: string;
  shipPostalCode: string;
  shipCountry: string;
  notes: string | null;
  isDemo: boolean;
  cancelReason: string | null;
  createdAt: string;
  items: OrderItem[];
  payments: { id: string; provider: string; status: string; amountPaise: number; isDemo: boolean; failureReason: string | null; createdAt: string }[];
  events: { id: string; status: OrderStatus; note: string | null; actor: string | null; createdAt: string }[];
  canCancel: boolean;
}

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];
