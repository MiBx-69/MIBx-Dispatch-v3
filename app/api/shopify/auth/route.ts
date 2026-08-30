import { NextRequest, NextResponse } from 'next/server';
import { getShopifyAuthUrl } from '@/lib/shopify/oauth';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get('shop');

  if (!shop) {
    return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
  }

  const apiKey = process.env.SHOPIFY_API_KEY || 'demo_shopify_key';
  const scopes =
    process.env.SHOPIFY_SCOPES ||
    'read_orders,write_orders,read_fulfillments,write_fulfillments,read_products,read_customers';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${appUrl}/api/shopify/callback`;

  const state = crypto.randomBytes(16).toString('hex');

  const authUrl = getShopifyAuthUrl({
    shop,
    apiKey,
    scopes,
    redirectUri,
    state,
  });

  const response = NextResponse.redirect(authUrl);
  // Store state nonce in cookie for verification
  response.cookies.set('shopify_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
  });

  return response;
}
