import crypto from 'crypto';

export interface ShopifyOAuthOptions {
  apiKey: string;
  apiSecret: string;
  scopes: string;
  redirectUri: string;
}

/**
 * Verify HMAC signature on Shopify OAuth requests or callbacks
 */
export function verifyShopifyHmac(query: Record<string, string | string[] | undefined>, apiSecret: string): boolean {
  const { hmac, signature, ...rest } = query;
  const targetHmac = (hmac || signature) as string;

  if (!targetHmac) return false;

  // Build sorted parameter string
  const sortedKeys = Object.keys(rest).sort();
  const message = sortedKeys
    .map((key) => {
      const val = rest[key];
      const stringVal = Array.isArray(val) ? val.join(',') : val;
      return `${key}=${stringVal}`;
    })
    .join('&');

  const calculatedHmac = crypto.createHmac('sha256', apiSecret).update(message).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(calculatedHmac, 'utf-8'), Buffer.from(targetHmac, 'utf-8'));
  } catch {
    return false;
  }
}

/**
 * Verify HMAC signature for incoming Shopify Webhooks
 */
export function verifyShopifyWebhook(rawBody: string | Buffer, hmacHeader: string | null, apiSecret: string): boolean {
  if (!hmacHeader) return false;

  const calculatedHmac = crypto.createHmac('sha256', apiSecret).update(rawBody).digest('base64');

  try {
    return crypto.timingSafeEqual(Buffer.from(calculatedHmac, 'utf-8'), Buffer.from(hmacHeader, 'utf-8'));
  } catch {
    return false;
  }
}

/**
 * Generate Shopify OAuth Install URL
 */
export function getShopifyAuthUrl(params: {
  shop: string;
  apiKey: string;
  scopes: string;
  redirectUri: string;
  state: string;
}): string {
  const cleanShop = params.shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const url = new URL(`https://${cleanShop}/admin/oauth/authorize`);
  url.searchParams.set('client_id', params.apiKey);
  url.searchParams.set('scope', params.scopes);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('state', params.state);
  return url.toString();
}

/**
 * Exchange temporary authorization code for permanent access token
 */
export async function exchangeCodeForToken(params: {
  shop: string;
  code: string;
  apiKey: string;
  apiSecret: string;
}): Promise<{ access_token: string; scope: string }> {
  const cleanShop = params.shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const res = await fetch(`https://${cleanShop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: params.apiKey,
      client_secret: params.apiSecret,
      code: params.code,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to exchange code for token: ${res.status} - ${errorText}`);
  }

  return res.json();
}

/**
 * Register Mandatory and Operational Webhooks on Shopify Store
 */
export async function registerShopifyWebhooks(params: {
  shopDomain: string;
  accessToken: string;
  webhookCallbackUrl: string;
  apiVersion?: string;
}) {
  const { shopDomain, accessToken, webhookCallbackUrl, apiVersion = process.env.SHOPIFY_API_VERSION || '2026-07' } = params;
  const cleanShop = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const topics = [
    'orders/create',
    'orders/updated',
    'orders/cancelled',
    'orders/fulfilled',
    'orders/paid',
    'fulfillments/create',
    'fulfillments/update',
    'app/uninstalled',
  ];

  const results = [];

  for (const topic of topics) {
    try {
      const query = `
        mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $subscription: WebhookSubscriptionInput!) {
          webhookSubscriptionCreate(topic: $topic, webhookSubscription: $subscription) {
            userErrors {
              field
              message
            }
            webhookSubscription {
              id
            }
          }
        }
      `;

      // Convert topic string format e.g. "orders/create" -> "ORDERS_CREATE"
      const formattedTopic = topic.replace('/', '_').toUpperCase();

      const res = await fetch(`https://${cleanShop}/admin/api/${apiVersion}/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({
          query,
          variables: {
            topic: formattedTopic,
            subscription: {
              uri: webhookCallbackUrl,
              format: 'JSON',
            },
          },
        }),
      });

      const data = await res.json();
      results.push({ topic, data });
    } catch (err: unknown) {
      console.error(`[registerShopifyWebhooks] Failed to register webhook for ${topic}:`, err);
      results.push({ topic, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return results;
}
