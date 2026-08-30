import { createAdminClient } from '../../db/supabase-server';
import { CourierStatus } from '../../types/database';

export interface PathaoWebhookPayload {
  consignment_id: string;
  merchant_order_id: string;
  order_status: string;
  order_status_slug?: string;
  amount_to_collect?: number;
  collected_amount?: number;
  delivery_fee?: number;
  reason?: string;
  updated_at?: string;
}

export function mapPathaoStatusToCourierStatus(statusStr: string): CourierStatus {
  const s = statusStr.toLowerCase();
  if (s.includes('delivered')) return 'delivered';
  if (s.includes('return') || s.includes('rto')) return 'returned';
  if (s.includes('fail') || s.includes('cancel') || s.includes('reject')) return 'failed';
  if (s.includes('transit') || s.includes('picked') || s.includes('out for delivery') || s.includes('assigned'))
    return 'in_transit';
  if (s.includes('placed') || s.includes('created') || s.includes('accepted')) return 'dispatched';
  return 'in_transit';
}

export async function processPathaoWebhook(payload: PathaoWebhookPayload): Promise<{ success: boolean; message: string }> {
  const { consignment_id, merchant_order_id, order_status, reason, updated_at } = payload;

  const supabase = createAdminClient();
  if (!supabase) {
    console.error('[PathaoWebhook] Supabase client not initialized (missing env vars).');
    return { success: false, message: 'Database client error.' };
  }

  // Find order by consignment_id or merchant_order_id
  const { data: orders, error: searchError } = await supabase
    .from('orders')
    .select('id, shop_id, order_number, courier_consignment_id')
    .or(`courier_consignment_id.eq.${consignment_id},id.eq.${merchant_order_id}`)
    .limit(1);

  if (searchError || !orders || orders.length === 0) {
    console.warn(`[PathaoWebhook] No matching order found for consignment ${consignment_id} / ${merchant_order_id}`);
    return { success: false, message: `Order not found for consignment ${consignment_id}` };
  }

  const order = orders[0];
  const newCourierStatus = mapPathaoStatusToCourierStatus(order_status);

  const updates: Record<string, any> = {
    courier_status: newCourierStatus,
    updated_at: new Date().toISOString(),
  };

  if (newCourierStatus === 'delivered') {
    updates.payment_status = 'paid';
    updates.courier_delivered_at = updated_at || new Date().toISOString();
  }

  // Update Order
  const { error: updateError } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', order.id);

  if (updateError) {
    console.error(`[PathaoWebhook] Failed to update order ${order.id}:`, updateError);
    return { success: false, message: `Failed to update order ${order.id}` };
  }

  // Record Courier Event
  await supabase.from('courier_events').insert({
    order_id: order.id,
    event_name: 'PATHAO_STATUS_UPDATE',
    status: order_status,
    description: reason || `Courier status transitioned to ${order_status}`,
    raw_payload: payload,
  });

  // Record Order Event
  await supabase.from('order_events').insert({
    order_id: order.id,
    shop_id: order.shop_id,
    event_type: 'PATHAO_STATUS_UPDATED',
    source: 'PATHAO_WEBHOOK',
    actor: 'Pathao Rider Webhook',
    pathao_id: consignment_id,
    message: `Pathao status updated: ${order_status}${reason ? ` (${reason})` : ''}`,
  });

  return { success: true, message: `Order ${order.order_number} status updated to ${order_status}` };
}
