import { ShopifyGraphQLResponse } from './types';

export interface ShopifyClientConfig {
  shopDomain: string;
  accessToken: string;
  apiVersion?: string;
}

export class ShopifyGraphQLClient {
  private shopDomain: string;
  private accessToken: string;
  private apiVersion: string;

  constructor(config: ShopifyClientConfig) {
    // Strip protocol if user passed https://...
    this.shopDomain = config.shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    this.accessToken = config.accessToken;
    this.apiVersion = config.apiVersion || process.env.SHOPIFY_API_VERSION || '2026-07';
  }

  /**
   * Execute GraphQL Query with automatic exponential backoff for rate limits (429 or throttle extension)
   */
  public async request<T = unknown>(query: string, variables: Record<string, unknown> = {}, retries = 3): Promise<T> {
    const url = `https://${this.shopDomain}/admin/api/${this.apiVersion}/graphql.json`;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': this.accessToken,
          },
          body: JSON.stringify({ query, variables }),
        });

        if (res.status === 429) {
          const retryAfter = Number(res.headers.get('Retry-After')) || Math.pow(2, attempt);
          console.warn(`[ShopifyGraphQLClient] Rate limit hit (429). Retrying in ${retryAfter}s (attempt ${attempt}/${retries})...`);
          await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
          continue;
        }

        if (!res.ok) {
          const errorBody = await res.text();
          throw new Error(`Shopify GraphQL HTTP error: ${res.status} ${res.statusText} - ${errorBody}`);
        }

        const json: ShopifyGraphQLResponse<T> = await res.json();

        if (json.errors && json.errors.length > 0) {
          const isThrottled = json.errors.some((e) => e.extensions?.code === 'THROTTLED');
          if (isThrottled && attempt < retries) {
            const backoffMs = 1500 * Math.pow(2, attempt);
            console.warn(`[ShopifyGraphQLClient] GraphQL Throttled. Backing off ${backoffMs}ms...`);
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            continue;
          }
          throw new Error(`Shopify GraphQL error: ${json.errors.map((e) => e.message).join('; ')}`);
        }

        // Check throttle status in extensions to proactively handle low restore buckets
        if (json.extensions?.cost?.throttleStatus) {
          const { currentlyAvailable, restoreRate } = json.extensions.cost.throttleStatus;
          if (currentlyAvailable < 50) {
            const waitMs = Math.ceil(((50 - currentlyAvailable) / restoreRate) * 1000);
            console.log(`[ShopifyGraphQLClient] Low API credits remaining (${currentlyAvailable}). Pacing ${waitMs}ms...`);
            await new Promise((resolve) => setTimeout(resolve, waitMs));
          }
        }

        if (!json.data) {
          throw new Error('Shopify GraphQL returned no data');
        }

        return json.data;
      } catch (err: unknown) {
        if (attempt === retries) throw err;
        const errMessage = err instanceof Error ? err.message : String(err);
        console.warn(`[ShopifyGraphQLClient] Request failed: ${errMessage}. Retrying ${attempt}/${retries}...`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }

    throw new Error('Shopify GraphQL request failed after max retries');
  }

  /**
   * Fetch paginated orders from Shopify Admin GraphQL API
   */
  public async fetchOrders(params: { first?: number; after?: string; query?: string } = {}) {
    const { first = 25, after = null, query = '' } = params;

    const gql = `
      query getOrders($first: Int!, $after: String, $query: String) {
        orders(first: $first, after: $after, query: $query, sortKey: CREATED_AT, reverse: true) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            cursor
            node {
              id
              name
              phone
              createdAt
              updatedAt
              cancelledAt
              displayFinancialStatus
              displayFulfillmentStatus
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              subtotalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              totalDiscountsSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              totalTaxSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              note
              tags
              customer {
                id
                firstName
                lastName
                email
                phone
                numberOfOrders
              }
              shippingAddress {
                name
                phone
                address1
                address2
                city
                province
                country
                zip
              }
              lineItems(first: 50) {
                edges {
                  node {
                    id
                    title
                    variantTitle
                    sku
                    quantity
                    originalUnitPriceSet {
                      shopMoney {
                        amount
                        currencyCode
                      }
                    }
                    requiresShipping
                    image {
                      url
                    }
                  }
                }
              }
              fulfillments(first: 10) {
                id
                status
                trackingInfo {
                  company
                  number
                  url
                }
              }
            }
          }
        }
      }
    `;

    return this.request<{
      orders: {
        pageInfo: { hasNextPage: boolean; endCursor: string };
        edges: Array<{
          cursor: string;
          node: Record<string, unknown>;
        }>;
      };
    }>(gql, { first, after, query });
  }

  /**
   * Create Fulfillment with Tracking Company & Tracking Number in Shopify
   */
  public async createFulfillment(params: {
    orderGid: string; // e.g. "gid://shopify/Order/12345"
    trackingCompany: string; // e.g. "Pathao Courier"
    trackingNumber: string; // e.g. "DHK-109283-X"
    trackingUrl: string; // e.g. "https://pathao.com/courier/tracking/?consignment_id=DHK-109283-X"
    notifyCustomer?: boolean;
  }) {
    const { orderGid, trackingCompany, trackingNumber, trackingUrl, notifyCustomer = true } = params;

    // Step 1: Query fulfillment orders for this order
    const fulfillmentOrdersQuery = `
      query getFulfillmentOrders($orderId: ID!) {
        order(id: $orderId) {
          fulfillmentOrders(first: 5) {
            edges {
              node {
                id
                status
                supportedActions {
                  action
                }
                lineItems(first: 50) {
                  edges {
                    node {
                      id
                      totalQuantity
                      remainingQuantity
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const foResult = await this.request<{
      order?: {
        fulfillmentOrders: {
          edges: Array<{
            node: {
              id: string;
              status: string;
              lineItems: {
                edges: Array<{
                  node: { id: string; remainingQuantity: number };
                }>;
              };
            };
          }>;
        };
      };
    }>(fulfillmentOrdersQuery, { orderId: orderGid });

    const foEdges = foResult.order?.fulfillmentOrders?.edges || [];
    const openFo = foEdges.find((e) => e.node.status === 'OPEN' || e.node.status === 'IN_PROGRESS');

    if (!openFo) {
      console.warn(`[ShopifyGraphQLClient] No open fulfillment order found for order ${orderGid}. It may already be fulfilled.`);
      return { success: false, reason: 'NO_OPEN_FULFILLMENT_ORDER' };
    }

    // Step 2: Create fulfillment mutation
    const createFulfillmentMutation = `
      mutation fulfillmentCreateV2($fulfillment: FulfillmentV2Input!) {
        fulfillmentCreateV2(fulfillment: $fulfillment) {
          fulfillment {
            id
            status
            trackingInfo {
              company
              number
              url
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const fulfillmentInput = {
      notifyCustomer,
      trackingInfo: {
        company: trackingCompany,
        number: trackingNumber,
        url: trackingUrl,
      },
      lineItemsByFulfillmentOrder: [
        {
          fulfillmentOrderId: openFo.node.id,
        },
      ],
    };

    const res = await this.request<{
      fulfillmentCreateV2: {
        fulfillment?: { id: string; status: string };
        userErrors?: Array<{ field: string[]; message: string }>;
      };
    }>(createFulfillmentMutation, { fulfillment: fulfillmentInput });

    if (res.fulfillmentCreateV2.userErrors && res.fulfillmentCreateV2.userErrors.length > 0) {
      throw new Error(
        `Shopify fulfillment creation error: ${res.fulfillmentCreateV2.userErrors.map((u) => u.message).join(', ')}`
      );
    }

    return {
      success: true,
      fulfillment: res.fulfillmentCreateV2.fulfillment,
    };
  }

  /**
   * Cancel Fulfillment in Shopify
   */
  public async cancelFulfillment(fulfillmentGid: string) {
    const cancelMutation = `
      mutation fulfillmentCancel($id: ID!) {
        fulfillmentCancel(id: $id) {
          fulfillment {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const res = await this.request<{
      fulfillmentCancel: {
        fulfillment?: { id: string; status: string };
        userErrors?: Array<{ field: string[]; message: string }>;
      };
    }>(cancelMutation, { id: fulfillmentGid });

    if (res.fulfillmentCancel.userErrors && res.fulfillmentCancel.userErrors.length > 0) {
      throw new Error(
        `Shopify fulfillment cancel error: ${res.fulfillmentCancel.userErrors.map((u) => u.message).join(', ')}`
      );
    }

    return {
      success: true,
      fulfillment: res.fulfillmentCancel.fulfillment,
    };
  }

  /**
   * Add Tags and Update Note on Shopify Order
   */
  public async updateOrderTagsAndNote(orderGid: string, tagsToAdd: string[], note?: string) {
    const mutation = `
      mutation tagsAdd($id: ID!, $tags: [String!]!) {
        tagsAdd(id: $id, tags: $tags) {
          node {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    await this.request(mutation, { id: orderGid, tags: tagsToAdd });

    if (note !== undefined) {
      const updateNoteMutation = `
        mutation orderUpdate($input: OrderInput!) {
          orderUpdate(input: $input) {
            order {
              id
              note
            }
            userErrors {
              field
              message
            }
          }
        }
      `;
      await this.request(updateNoteMutation, {
        input: {
          id: orderGid,
          note,
        },
      });
    }

    return { success: true };
  }
}
