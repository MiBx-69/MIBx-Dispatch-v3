import { NextRequest, NextResponse } from 'next/server';
import { verifyShopifyWebhook } from '@/lib/shopify/oauth';
import { processShopifyWebhook } from '@/lib/shopify/reconcile';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256');
    const topic = request.headers.get('x-shopify-topic') || 'orders/updated';
    const shopDomain = request.headers.get('x-shopify-shop-domain') || process.env.SHOPIFY_SHOP_DOMAIN || '';
    const webhookId = request.headers.get('x-shopify-webhook-id') || `wh_${Date.now()}`;

    const apiSecret = process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_API_SECRET || 'demo_secret';

    // Verify HMAC
    const isValid = verifyShopifyWebhook(rawBody, hmacHeader, apiSecret);
    if (!isValid && process.env.NODE_ENV === 'production' && !shopDomain.includes('demo')) {
      console.warn(`[ShopifyWebhook] Invalid HMAC signature for topic ${topic}`);
      return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
    }

    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const result = await processShopifyWebhook({
      topic,
      shopDomain,
      eventId: webhookId,
      payload,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error('[ShopifyWebhook] Processing exception:', err);
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
