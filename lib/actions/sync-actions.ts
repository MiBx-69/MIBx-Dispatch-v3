'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '../db/supabase-server';
import { ShopifyGraphQLClient } from '../shopify/client';

function normalizeShopifyOrder(node: Record<string, any>) {
  const money = (value?: { shopMoney?: { amount?: string } }) => value?.shopMoney?.amount || '0';
  const address = node.shippingAddress || node.billingAddress || {};

  return {
    id: node.id,
    name: node.name,
    order_number: String(node.name || '').replace(/^#/, ''),
    created_at: node.createdAt,
    updated_at: node.updatedAt,
    cancelled_at: node.cancelledAt,
    financial_status: String(node.displayFinancialStatus || '').toLowerCase(),
    fulfillment_status: String(node.displayFulfillmentStatus || '').toLowerCase().replace('_fulfilled', ''),
    total_price: money(node.totalPriceSet),
    subtotal_price: money(node.subtotalPriceSet),
    total_discounts: money(node.totalDiscountsSet),
    total_tax: money(node.totalTaxSet),
    currency: node.totalPriceSet?.shopMoney?.currencyCode || 'BDT',
    phone: node.phone,
    tags: Array.isArray(node.tags) ? node.tags.join(',') : '',
    customer: node.customer
      ? {
          id: node.customer.id,
          first_name: node.customer.firstName,
          last_name: node.customer.lastName,
          email: node.customer.email,
          phone: node.customer.phone,
        }
      : undefined,
    shipping_address: {
      name: address.name,
      first_name: address.firstName,
      last_name: address.lastName,
      phone: address.phone,
      address1: address.address1,
      address2: address.address2,
      city: address.city,
      province: address.province,
      zip: address.zip,
    },
    line_items: (node.lineItems?.edges || []).map(({ node: item }: { node: Record<string, any> }) => ({
      id: item.id,
      title: item.title,
      variant_title: item.variantTitle,
      sku: item.sku,
      quantity: item.quantity,
      price: money(item.originalUnitPriceSet),
      requires_shipping: item.requiresShipping,
      image: item.image ? { src: item.image.url } : undefined,
    })),
  };
}

export async function getSyncStatsAction() {
  try {
    const supabase = createAdminClient();
    if (!supabase) throw new Error('Database client error');

    const { count: unresolvedErrors } = await supabase.from('sync_errors').select('*', { count: 'exact', head: true }).eq('resolved', false);
    const { count: totalOrders } = await supabase.from('orders').select('*', { count: 'exact', head: true });
    const { count: readyOrders } = await supabase.from('orders').select('*', { count: 'exact', head: true }).in('courier_status', ['ready_to_dispatch', 'unassigned']);
    const { count: dispatchedOrders } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('courier_status', 'dispatched');
    const { count: deliveredOrders } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('courier_status', 'delivered');
    
    const { data: lastEvent } = await supabase.from('sync_events').select('created_at').order('created_at', { ascending: false }).limit(1).single();

    // Check real connection status from DB
    const { count: shopifyConnCount } = await supabase.from('shopify_connections').select('*', { count: 'exact', head: true }).eq('is_valid', true);
    const shopifyConnected = (shopifyConnCount || 0) > 0;
    const pathaoConnected = !!(process.env.PATHAO_CLIENT_ID && process.env.PATHAO_CLIENT_SECRET);

    return { 
      success: true, 
      data: {
        totalOrders: totalOrders || 0,
        readyOrders: readyOrders || 0,
        dispatchedOrders: dispatchedOrders || 0,
        deliveredOrders: deliveredOrders || 0,
        unresolvedErrors: unresolvedErrors || 0,
        lastSync: lastEvent ? lastEvent.created_at : new Date().toISOString(),
        shopifyConnected,
        pathaoConnected,
        webhookHealth: shopifyConnected ? 'Active' : 'Not Connected',
      } 
    };
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    return { success: false, error: errMessage };
  }
}

export async function getSyncEventsAction() {
  try {
    const supabase = createAdminClient();
    if (!supabase) throw new Error('Database client error');

    const { data, error } = await supabase.from('sync_events').select('*').order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    
    return { success: true, data };
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    return { success: false, error: errMessage, data: [] };
  }
}

export async function getSyncErrorsAction() {
  try {
    const supabase = createAdminClient();
    if (!supabase) throw new Error('Database client error');

    const { data, error } = await supabase.from('sync_errors').select('*').eq('resolved', false).order('created_at', { ascending: false });
    if (error) throw error;
    
    return { success: true, data };
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    return { success: false, error: errMessage, data: [] };
  }
}

export async function retrySyncErrorAction(errorId: string) {
  try {
    const supabase = createAdminClient();
    if (!supabase) throw new Error('Database client error');

    await supabase.from('sync_errors').update({ resolved: true, updated_at: new Date().toISOString() }).eq('id', errorId);

    revalidatePath('/sync');
    revalidatePath('/orders');
    revalidatePath('/dashboard');
    return { success: true, message: 'Error marked as resolved / retry initiated.' };
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    return { success: false, message: errMessage };
  }
}

export async function syncHistoricalOrdersAction() {
  try {
    const supabase = createAdminClient();
    if (!supabase) throw new Error('Database client error');

    // 1. Get the shop and its access token
    const { data: connection, error: connectionError } = await supabase
      .from('shopify_connections')
      .select('access_token, shop_id, shops!inner(shopify_domain)')
      .eq('is_valid', true)
      .limit(1)
      .single();

    if (connectionError || !connection || !connection.access_token) {
      throw new Error('No valid Shopify connection found. Please connect your store in Settings.');
    }

    // 2. Fetch every order through the current GraphQL Admin API. REST Admin API
    // versions are retired on a rolling schedule and were causing imports to fail.
    const shop = connection.shops as unknown as { shopify_domain: string };
    const cleanShop = shop.shopify_domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const client = new ShopifyGraphQLClient({
      shopDomain: cleanShop,
      accessToken: connection.access_token,
      apiVersion: process.env.SHOPIFY_API_VERSION || '2026-07',
    });
    const { reconcileOrderFromShopify } = await import('../shopify/reconcile');
    
    let successCount = 0;
    let failCount = 0;

    let after: string | null = null;
    let hasNextPage = true;
    while (hasNextPage) {
      const result = await client.fetchOrders({ first: 250, after: after || undefined, query: 'status:any' });

      for (const edge of result.orders.edges) {
        try {
          const order = normalizeShopifyOrder(edge.node);
          const reconciliation = await reconcileOrderFromShopify(order, cleanShop, connection.shop_id, 'manual/sync');
          if (reconciliation.success) successCount++;
          else failCount++;
        } catch (err) {
          failCount++;
          console.error('Error reconciling Shopify order:', err);
        }
      }

      hasNextPage = result.orders.pageInfo.hasNextPage;
      after = result.orders.pageInfo.endCursor;
    }

    await supabase.from('sync_events').insert({
      shop_id: connection.shop_id,
      event_type: 'manual/full_reconciliation',
      source: 'manual',
      event_id: `manual_rec_${Date.now()}`,
      payload: { mode: 'full_sync', triggered_by: 'Operator', total_synced: successCount, total_failed: failCount },
      status: 'processed',
      processed_at: new Date().toISOString(),
    });

    await supabase
      .from('shopify_connections')
      .update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('shop_id', connection.shop_id);

    revalidatePath('/sync');
    revalidatePath('/orders');
    revalidatePath('/dashboard');

    return { success: true, message: `Successfully synced ${successCount} orders. ${failCount > 0 ? `Failed: ${failCount}` : ''}` };
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    return { success: false, error: errMessage };
  }
}
