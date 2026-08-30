import { NextRequest, NextResponse } from 'next/server';
import { verifyShopifyHmac, exchangeCodeForToken, registerShopifyWebhooks } from '@/lib/shopify/oauth';
import { createAdminClient } from '@/lib/db/supabase-server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get('shop');
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const savedState = request.cookies.get('shopify_oauth_state')?.value;

  if (!shop || !code) {
    return NextResponse.json({ error: 'Missing shop or code parameter' }, { status: 400 });
  }

  // Verify state nonce against CSRF
  if (savedState && state && savedState !== state) {
    return NextResponse.json({ error: 'Invalid OAuth state nonce' }, { status: 403 });
  }

  const queryObj: Record<string, string> = {};
  searchParams.forEach((val, key) => {
    queryObj[key] = val;
  });

  const apiSecret = process.env.SHOPIFY_API_SECRET || '';

  if (!apiSecret) {
    return NextResponse.json({ error: 'SHOPIFY_API_SECRET is not configured' }, { status: 500 });
  }

  // Verify HMAC signature
  const isValidHmac = verifyShopifyHmac(queryObj, apiSecret);
  if (!isValidHmac) {
    console.warn(`[ShopifyCallback] HMAC verification failed for shop ${shop}`);
    return NextResponse.json({ error: 'Invalid Shopify OAuth signature' }, { status: 401 });
  }

  try {
    const apiKey = process.env.SHOPIFY_API_KEY || '';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (!apiKey) {
      throw new Error('SHOPIFY_API_KEY is not configured.');
    }

    const tokenData = await exchangeCodeForToken({
      shop,
      code,
      apiKey,
      apiSecret,
    });

    // Persist the store and permanent access token before syncing or registering webhooks.
    const supabase = createAdminClient();
    if (!supabase) {
      throw new Error('Supabase server credentials are not configured.');
    }

    const shopDomain = shop.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
    const now = new Date().toISOString();
    const { data: organization, error: organizationError } = await supabase
      .from('organizations')
      .upsert(
        {
          name: process.env.MIBX_ORG_NAME || 'MIBx Dispatch',
          slug: process.env.MIBX_ORG_SLUG || 'mibx-dispatch',
          updated_at: now,
        },
        { onConflict: 'slug' }
      )
      .select('id')
      .single();

    if (organizationError || !organization) {
      throw new Error(`Could not save organization: ${organizationError?.message || 'unknown error'}`);
    }

    const { data: shopRecord, error: shopError } = await supabase
      .from('shops')
      .upsert(
        {
          org_id: organization.id,
          shopify_domain: shopDomain,
          store_name: shopDomain.replace(/\.myshopify\.com$/, ''),
          is_active: true,
          updated_at: now,
        },
        { onConflict: 'shopify_domain' }
      )
      .select('id')
      .single();

    if (shopError || !shopRecord) {
      throw new Error(`Could not save Shopify store: ${shopError?.message || 'unknown error'}`);
    }

    const { data: existingConn } = await supabase
      .from('shopify_connections')
      .select('id')
      .eq('shop_id', shopRecord.id)
      .limit(1)
      .maybeSingle();

    if (existingConn?.id) {
      const { error: connectionError } = await supabase
        .from('shopify_connections')
        .update({
          access_token: tokenData.access_token,
          scopes: tokenData.scope || process.env.SHOPIFY_SCOPES || '',
          is_valid: true,
          updated_at: now,
        })
        .eq('id', existingConn.id);

      if (connectionError) {
        throw new Error(`Could not update Shopify connection: ${connectionError.message}`);
      }
    } else {
      const { error: connectionError } = await supabase
        .from('shopify_connections')
        .insert({
          shop_id: shopRecord.id,
          access_token: tokenData.access_token,
          scopes: tokenData.scope || process.env.SHOPIFY_SCOPES || '',
          is_valid: true,
          installed_at: now,
          updated_at: now,
        });

      if (connectionError) {
        throw new Error(`Could not save Shopify connection: ${connectionError.message}`);
      }
    }

    // Register webhooks automatically
    const webhookUrl = `${appUrl}/api/shopify/webhooks`;
    await registerShopifyWebhooks({
      shopDomain: shop,
      accessToken: tokenData.access_token,
      webhookCallbackUrl: webhookUrl,
    });

    console.log(`[ShopifyCallback] Successfully connected ${shop} and registered webhooks.`);

    // Automatically trigger historical order sync so orders populate right away
    try {
      const { syncHistoricalOrdersAction } = await import('@/lib/actions/sync-actions');
      await syncHistoricalOrdersAction();
      console.log(`[ShopifyCallback] Initial orders synced successfully for ${shop}`);
    } catch (syncErr) {
      console.error('[ShopifyCallback] Initial sync error (non-fatal):', syncErr);
    }

    return NextResponse.redirect(`${appUrl}/orders?shopify_connected=true&shop=${encodeURIComponent(shop)}`);
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error('[ShopifyCallback] Token exchange error:', err);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?error=${encodeURIComponent(errMessage)}`);
  }
}
