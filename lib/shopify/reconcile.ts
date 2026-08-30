import { createAdminClient } from '../db/supabase-server';
import { ShopifyOrderREST, ShopifyAddress, ShopifyCustomer } from './types';
import { OrderStatus, PaymentStatus, FulfillmentStatus } from '../types/database';

/**
 * Process Shopify webhook payload idempotently
 */
export async function processShopifyWebhook(params: {
  topic: string;
  shopDomain: string;
  eventId: string;
  payload: Record<string, unknown>;
}): Promise<{ success: boolean; message: string }> {
  const { topic, shopDomain, eventId, payload } = params;

  const supabase = createAdminClient();
  if (!supabase) {
    console.error('[ShopifyReconcile] Supabase client not initialized.');
    return { success: false, message: 'Database client error' };
  }

  // Get Shop ID
  const { data: shops } = await supabase.from('shops').select('id').eq('shopify_domain', shopDomain).limit(1);
  const shopId = shops?.[0]?.id;
  
  if (!shopId) {
    console.error(`[ShopifyReconcile] Shop not found for domain ${shopDomain}`);
    return { success: false, message: 'Shop not found' };
  }

  // Check deduplication
  const { data: existingEvents } = await supabase
    .from('sync_events')
    .select('id')
    .eq('source', 'shopify')
    .eq('event_id', eventId)
    .limit(1);

  if (existingEvents && existingEvents.length > 0) {
    console.log(`[ShopifyReconcile] Duplicate webhook ${eventId} for topic ${topic} skipped.`);
    return { success: true, message: 'Duplicate event skipped' };
  }

  // Record sync event
  await supabase.from('sync_events').insert({
    shop_id: shopId,
    event_type: topic,
    source: 'shopify',
    event_id: eventId,
    payload,
    status: 'processed',
    processed_at: new Date().toISOString(),
  });

  // Handle specific topic
  if (topic.startsWith('orders/')) {
    const orderData = payload as unknown as ShopifyOrderREST;
    return reconcileOrderFromShopify(orderData, shopDomain, shopId, topic);
  }

  return { success: true, message: `Webhook ${topic} recorded.` };
}

/**
 * Map Shopify REST/Webhook Order format into MIBx clean separated schema
 */
export async function reconcileOrderFromShopify(
  shopifyOrder: ShopifyOrderREST,
  shopDomain: string,
  shopId: string,
  triggerTopic = 'orders/updated'
): Promise<{ success: boolean; message: string }> {
  const supabase = createAdminClient();
  if (!supabase) return { success: false, message: 'DB Error' };

  const shopifyId = String(shopifyOrder.id).startsWith('gid://')
    ? String(shopifyOrder.id)
    : `gid://shopify/Order/${shopifyOrder.id}`;
  const orderNumber = shopifyOrder.name || `#${shopifyOrder.order_number}`;

  // Normalize statuses
  let payment_status: PaymentStatus = 'pending';
  if (shopifyOrder.financial_status === 'paid') payment_status = 'paid';
  else if (shopifyOrder.financial_status === 'partially_paid') payment_status = 'partially_paid';
  else if (shopifyOrder.financial_status === 'refunded' || shopifyOrder.financial_status === 'partially_refunded')
    payment_status = 'refunded';

  let fulfillment_status: FulfillmentStatus = 'unfulfilled';
  if (shopifyOrder.fulfillment_status === 'fulfilled') fulfillment_status = 'fulfilled';
  else if (shopifyOrder.fulfillment_status === 'partial') fulfillment_status = 'partial';
  else if (shopifyOrder.fulfillment_status === 'restocked') fulfillment_status = 'restocked';

  let order_status: OrderStatus = 'open';
  if (shopifyOrder.cancelled_at) order_status = 'cancelled';

  // Customer & Shipping Address extraction
  const shipping: ShopifyAddress = shopifyOrder.shipping_address || shopifyOrder.billing_address || {};
  const customer: ShopifyCustomer = shopifyOrder.customer || {};

  const recipient_name =
    shipping.name ||
    [shipping.first_name, shipping.last_name].filter(Boolean).join(' ') ||
    [customer.first_name, customer.last_name].filter(Boolean).join(' ') ||
    'Valued Customer';

  const rawPhone = shipping.phone || customer.phone || shopifyOrder.phone || '';
  const recipient_phone = rawPhone.replace(/[^0-9+]/g, '') || '01700000000';

  const recipient_address =
    [shipping.address1, shipping.address2, shipping.city, shipping.zip].filter(Boolean).join(', ') ||
    'Address not provided';

  const totalPrice = parseFloat(shopifyOrder.total_price || '0');
  const isPrepaid = payment_status === 'paid';
  const codAmount = isPrepaid ? 0 : totalPrice;

  // City & Zone inference for Bangladesh
  const cityName = shipping.city || 'Dhaka';
  const zoneName = shipping.province || shipping.address2 || 'Central';

  // Check if order exists
  const { data: existingOrder } = await supabase
    .from('orders')
    .select('id, tags, order_number')
    .or(`shopify_order_id.eq.${shopifyId},order_number.eq.${orderNumber}`)
    .eq('shop_id', shopId)
    .limit(1)
    .maybeSingle();

  if (existingOrder) {
    const existingTags = existingOrder.tags || [];
    const newTags = shopifyOrder.tags ? shopifyOrder.tags.split(',').map((t) => t.trim()) : existingTags;

    // Update
    await supabase.from('orders').update({
      total_price: totalPrice,
      subtotal_price: parseFloat(shopifyOrder.subtotal_price || '0'),
      payment_status,
      fulfillment_status,
      order_status,
      recipient_name,
      recipient_phone,
      recipient_address,
      shopify_updated_at: shopifyOrder.updated_at || new Date().toISOString(),
      tags: newTags,
      updated_at: new Date().toISOString()
    }).eq('id', existingOrder.id);

    return { success: true, message: `Order ${existingOrder.order_number} reconciled.` };
  } else {
    // Insert new order
    const orderInsert = {
      shop_id: shopId,
      shopify_order_id: shopifyId,
      order_number: orderNumber,
      currency: shopifyOrder.currency || 'BDT',
      total_price: totalPrice,
      subtotal_price: parseFloat(shopifyOrder.subtotal_price || '0'),
      total_discounts: parseFloat(shopifyOrder.total_discounts || '0'),
      total_tax: parseFloat(shopifyOrder.total_tax || '0'),
      cod_amount: codAmount,
      delivery_charge: 60.0,
      order_status,
      payment_status,
      fulfillment_status,
      courier_status: 'ready_to_dispatch',
      sync_status: 'synced',
      recipient_name,
      recipient_phone,
      recipient_address,
      city: cityName,
      zone: zoneName,
      pathao_store_id: 101,
      pathao_city_id: cityName.toLowerCase().includes('chittagong') ? 2 : 1,
      pathao_zone_id: 14,
      courier_provider: 'pathao',
      weight_in_kg: 0.5,
      item_type: 2,
      tags: shopifyOrder.tags ? shopifyOrder.tags.split(',').map((t) => t.trim()) : ['New Order', 'Shopify'],
      shopify_created_at: shopifyOrder.created_at || new Date().toISOString(),
      shopify_updated_at: shopifyOrder.updated_at || new Date().toISOString(),
    };

    const { data: insertedOrder, error: insertError } = await supabase.from('orders').insert(orderInsert).select('id').single();

    if (insertError || !insertedOrder) {
      console.error('[ShopifyReconcile] Failed to insert order:', insertError);
      return { success: false, message: 'Failed to insert order' };
    }

    const newOrderId = insertedOrder.id;

    // Add items
    const lineItems = (shopifyOrder.line_items || []).map((li, idx) => ({
      order_id: newOrderId,
      shopify_line_item_id: String(li.id),
      title: li.title,
      variant_title: li.variant_title,
      sku: li.sku || `SKU-${idx + 1}`,
      quantity: li.quantity || 1,
      unit_price: parseFloat(li.price || '0'),
      total_price: parseFloat(li.price || '0') * (li.quantity || 1),
      image_url: li.image?.src || 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&auto=format&fit=crop&q=80',
      requires_shipping: li.requires_shipping !== false,
    }));

    if (lineItems.length > 0) {
      await supabase.from('order_items').insert(lineItems);
    }

    // Add event
    await supabase.from('order_events').insert({
      order_id: newOrderId,
      shop_id: shopId,
      event_type: 'ORDER_CREATED',
      source: 'SHOPIFY_WEBHOOK',
      actor: 'Shopify Webhook Engine',
      shopify_id: shopifyId,
      message: `Order ${orderNumber} created via ${triggerTopic} webhook.`,
    });

    return { success: true, message: `New order ${orderNumber} imported.` };
  }
}
