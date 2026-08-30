export type OrderStatus = 'open' | 'closed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'partially_paid' | 'refunded';
export type FulfillmentStatus = 'unfulfilled' | 'partial' | 'fulfilled' | 'restocked';
export type CourierStatus = 
  | 'unassigned'
  | 'ready_to_dispatch'
  | 'dispatched'
  | 'in_transit'
  | 'delivered'
  | 'failed'
  | 'returned'
  | 'cancelled';
export type SyncStatus = 'synced' | 'pending' | 'failed' | 'reconciling';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  created_at: string;
  updated_at: string;
}

export interface Shop {
  id: string;
  org_id: string;
  shopify_domain: string;
  store_name: string;
  email?: string;
  currency: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShopifyConnection {
  id: string;
  shop_id: string;
  access_token: string;
  scopes: string;
  installed_at: string;
  webhook_secret?: string;
  is_valid: boolean;
  last_synced_at?: string;
  updated_at: string;
}

export interface CourierConfig {
  id: string;
  shop_id: string;
  courier_provider: 'pathao' | 'steadfast' | 'redx';
  client_id?: string;
  client_secret?: string;
  username?: string;
  password?: string;
  base_url: string;
  access_token?: string;
  token_expires_at?: string;
  default_store_id?: number;
  default_delivery_type: number;
  default_item_type: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  shopify_line_item_id: string;
  product_id?: string;
  title: string;
  variant_title?: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  image_url?: string;
  requires_shipping: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  shop_id: string;
  shopify_customer_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  default_city?: string;
  default_zone?: string;
  default_address?: string;
  total_orders: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  shop_id: string;
  shopify_product_id: string;
  title: string;
  handle?: string;
  vendor?: string;
  product_type?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  shop_id: string;
  shopify_order_id: string;
  order_number: string;
  customer_id?: string;
  
  // Financials
  currency: string;
  total_price: number;
  subtotal_price: number;
  total_discounts: number;
  total_tax: number;
  cod_amount: number;
  delivery_charge: number;
  
  // Separated Statuses
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  courier_status: CourierStatus;
  sync_status: SyncStatus;
  
  // Shipping & Recipient
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  city?: string;
  zone?: string;
  area?: string;
  postal_code?: string;
  
  // Pathao Routing
  pathao_store_id?: number;
  pathao_city_id?: number;
  pathao_zone_id?: number;
  pathao_area_id?: number;
  
  // Courier Consignment
  courier_provider: 'pathao' | 'steadfast' | 'redx';
  courier_consignment_id?: string;
  courier_tracking_url?: string;
  courier_dispatched_at?: string;
  courier_delivered_at?: string;
  
  // Metadata & Notes
  weight_in_kg: number;
  item_type: number; // 1 = doc, 2 = parcel
  special_instructions?: string;
  customer_notes?: string;
  internal_notes?: string;
  tags: string[];
  
  // Timestamps
  shopify_created_at: string;
  shopify_updated_at: string;
  created_at: string;
  updated_at: string;
  
  // Joins / Embedded
  items?: OrderItem[];
  customer?: Customer;
  events?: OrderEvent[];
  notes_list?: Note[];
  fulfillment?: Fulfillment;
  shipment?: CourierShipment;
}

export interface Fulfillment {
  id: string;
  order_id: string;
  shopify_fulfillment_id?: string;
  status: 'pending' | 'open' | 'success' | 'cancelled' | 'error';
  tracking_company: string;
  tracking_number?: string;
  tracking_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CourierShipment {
  id: string;
  order_id: string;
  shop_id: string;
  courier_provider: string;
  consignment_id: string;
  tracking_code?: string;
  delivery_fee: number;
  cod_amount: number;
  status: string;
  recipient_name?: string;
  recipient_phone?: string;
  recipient_address?: string;
  raw_response?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CourierEvent {
  id: string;
  shipment_id?: string;
  order_id: string;
  event_name: string;
  status: string;
  description?: string;
  raw_payload?: Record<string, unknown>;
  created_at: string;
}

export interface OrderEvent {
  id: string;
  order_id: string;
  shop_id: string;
  event_type: string;
  source: 'SHOPIFY_WEBHOOK' | 'PATHAO_WEBHOOK' | 'MIBX_USER' | 'SYNC_JOB';
  actor: string;
  previous_value?: unknown;
  new_value?: unknown;
  shopify_id?: string;
  pathao_id?: string;
  message?: string;
  created_at: string;
}

export interface OrderRevision {
  id: string;
  order_id: string;
  field_name: string;
  old_value?: string;
  new_value?: string;
  actor: string;
  created_at: string;
}

export interface Note {
  id: string;
  order_id: string;
  author_name: string;
  content: string;
  is_internal: boolean;
  created_at: string;
}

export interface SyncEvent {
  id: string;
  shop_id?: string;
  event_type: string;
  source: 'shopify' | 'pathao' | 'manual';
  event_id: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'processing' | 'processed' | 'failed';
  error_message?: string;
  processed_at?: string;
  created_at: string;
}

export interface SyncJob {
  id: string;
  shop_id: string;
  job_type: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'partial';
  total_count: number;
  processed_count: number;
  failed_count: number;
  payload?: Record<string, unknown>;
  errors?: Array<{ order_id?: string; order_number?: string; error: string }>;
  started_at: string;
  completed_at?: string;
}

export interface SyncError {
  id: string;
  shop_id: string;
  entity_type: 'order' | 'fulfillment' | 'shipment' | 'webhook';
  entity_id: string;
  error_code?: string;
  error_message: string;
  stack_trace?: string;
  retry_count: number;
  resolved: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  org_id: string;
  actor_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}
