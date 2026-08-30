import { NextRequest, NextResponse } from 'next/server';
import { processPathaoWebhook, PathaoWebhookPayload } from '@/lib/courier/pathao/webhook';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-pathao-signature');
    const secret = process.env.PATHAO_WEBHOOK_SECRET;

    // Verify webhook signature if secret is configured
    if (secret && signature !== secret) {
      console.warn('[PathaoWebhook] Invalid signature received.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await request.json()) as PathaoWebhookPayload;

    // Build headers with secret - required by Pathao for integration verification
    const headers = new Headers();
    if (secret) {
      headers.set('X-Pathao-Merchant-Webhook-Integration-Secret', secret);
    }

    // Pathao sends { event: "webhook_integration" } as a test - respond immediately with 202
    if ((payload as any).event === 'webhook_integration') {
      return NextResponse.json({ success: true }, { status: 202, headers });
    }

    if (!payload.consignment_id && !payload.merchant_order_id) {
      return NextResponse.json({ error: 'Missing consignment_id or merchant_order_id' }, { status: 400 });
    }

    const result = await processPathaoWebhook(payload);
    return NextResponse.json(result, { status: 202, headers });
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error('[PathaoWebhook] Ingestion error:', err);
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
