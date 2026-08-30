export interface ShopifyAddress {
  first_name?: string;
  last_name?: string;
  name?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  country?: string;
  zip?: string;
}

export interface ShopifyLineItem {
  id: number | string;
  title: string;
  variant_title?: string;
  sku?: string;
  quantity: number;
  price: string;
  total_discount?: string;
  requires_shipping: boolean;
  product_id?: number | string;
  image?: {
    src?: string;
  };
}

export interface ShopifyCustomer {
  id?: number | string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  orders_count?: number;
  default_address?: ShopifyAddress;
}

export interface ShopifyOrderREST {
  id: number | string;
  order_number: number | string;
  name: string;
  email?: string;
  phone?: string;
  currency: string;
  total_price: string;
  subtotal_price: string;
  total_discounts: string;
  total_tax: string;
  financial_status: 'pending' | 'authorized' | 'partially_paid' | 'paid' | 'partially_refunded' | 'refunded' | 'voided';
  fulfillment_status: 'fulfilled' | 'null' | 'partial' | 'restocked' | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  shipping_address?: ShopifyAddress;
  billing_address?: ShopifyAddress;
  customer?: ShopifyCustomer;
  line_items: ShopifyLineItem[];
  note?: string;
  tags?: string;
  created_at: string;
  updated_at: string;
}

export interface ShopifyGraphQLOrderEdge {
  cursor: string;
  node: {
    id: string; // e.g. "gid://shopify/Order/123456"
    name: string; // e.g. "#1001"
    createdAt: string;
    updatedAt: string;
    cancelledAt?: string;
    displayFinancialStatus: string;
    displayFulfillmentStatus: string;
    totalPriceSet: {
      shopMoney: {
        amount: string;
        currencyCode: string;
      };
    };
    subtotalPriceSet?: {
      shopMoney: {
        amount: string;
        currencyCode: string;
      };
    };
    totalDiscountsSet?: {
      shopMoney: {
        amount: string;
        currencyCode: string;
      };
    };
    totalTaxSet?: {
      shopMoney: {
        amount: string;
        currencyCode: string;
      };
    };
    note?: string;
    tags: string[];
    customer?: {
      id: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      numberOfOrders: string;
    };
    shippingAddress?: {
      name?: string;
      phone?: string;
      address1?: string;
      address2?: string;
      city?: string;
      province?: string;
      country?: string;
      zip?: string;
    };
    lineItems: {
      edges: Array<{
        node: {
          id: string;
          title: string;
          variantTitle?: string;
          sku?: string;
          quantity: number;
          originalUnitPriceSet: {
            shopMoney: {
              amount: string;
              currencyCode: string;
            };
          };
          requiresShipping: boolean;
          image?: {
            url: string;
          };
        };
      }>;
    };
    fulfillments?: Array<{
      id: string;
      status: string;
      trackingInfo?: Array<{
        company?: string;
        number?: string;
        url?: string;
      }>;
    }>;
  };
}

export interface ShopifyGraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
    extensions?: {
      code?: string;
    };
  }>;
  extensions?: {
    cost?: {
      requestedQueryCost: number;
      actualQueryCost: number;
      throttleStatus: {
        maximumAvailable: number;
        currentlyAvailable: number;
        restoreRate: number;
      };
    };
  };
}
