import { createAdminClient } from '../db/supabase-server';
import { PathaoClient } from '../courier/pathao/api';

export interface BulkDispatchItemResult {
  orderId: string;
  orderNumber: string;
  recipientName: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  consignmentId?: string;
  trackingUrl?: string;
  error?: string;
}

export interface BulkDispatchSummary {
  batchId: string;
  total: number;
  successCount: number;
  failedCount: number;
  results: BulkDispatchItemResult[];
  startedAt: string;
  completedAt: string;
}

export async function processBulkDispatch(params: {
  orderIds: string[];
  storeId?: number;
  deliveryType?: number;
  itemType?: number;
  concurrency?: number;
}): Promise<BulkDispatchSummary> {
  const { orderIds, storeId = 101, deliveryType = 48, itemType = 2, concurrency = 2 } = params;
  const batchId = `batch-${Date.now()}`;
  const startedAt = new Date().toISOString();

  const supabase = createAdminClient();
  if (!supabase) throw new Error('Database client error');

  const pathaoClient = new PathaoClient({
    baseUrl: process.env.PATHAO_BASE_URL || 'https://api-hermes.pathao.com',
    clientId: process.env.PATHAO_CLIENT_ID || 'demo_client_id',
    clientSecret: process.env.PATHAO_CLIENT_SECRET || 'demo_client_secret',
    username: process.env.PATHAO_USERNAME || 'demo@artisanbd.com',
    password: process.env.PATHAO_PASSWORD || 'demo_password',
  });

  const { data: ordersData } = await supabase.from('orders').select('*, items:order_items(quantity)').in('id', orderIds);
  const ordersMap = new Map(ordersData?.map((o) => [o.id, o]) || []);

  const results: BulkDispatchItemResult[] = orderIds.map((id) => {
    const ord = ordersMap.get(id);
    return {
      orderId: id,
      orderNumber: ord?.order_number || id,
      recipientName: ord?.recipient_name || 'Customer',
      status: 'pending',
    };
  });

  const queue = [...orderIds];
  const workers: Promise<void>[] = [];

  for (let i = 0; i < Math.min(concurrency, queue.length); i++) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const currentId = queue.shift();
          if (!currentId) break;

          const itemResult = results.find((r) => r.orderId === currentId);
          if (itemResult) itemResult.status = 'processing';

          const order = ordersMap.get(currentId);
          if (!order) {
            if (itemResult) {
              itemResult.status = 'failed';
              itemResult.error = 'Order not found in database';
            }
            continue;
          }

          if (order.courier_consignment_id && order.courier_status !== 'failed') {
            if (itemResult) {
              itemResult.status = 'failed';
              itemResult.error = `Already dispatched with consignment ${order.courier_consignment_id}`;
            }
            continue;
          }

          try {
            const quantity = order.items?.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0) || 1;
            
            const shipmentRes = await pathaoClient.createShipment({
              store_id: storeId,
              merchant_order_id: order.order_number,
              recipient_name: order.recipient_name,
              recipient_phone: order.recipient_phone,
              recipient_address: order.recipient_address,
              recipient_city: order.pathao_city_id || (order.city?.toLowerCase().includes('chittagong') ? 2 : 1),
              recipient_zone: order.pathao_zone_id || 14,
              recipient_area: order.pathao_area_id || undefined,
              delivery_type: deliveryType,
              item_type: itemType,
              item_quantity: quantity,
              item_weight: order.weight_in_kg || 0.5,
              amount_to_collect: order.payment_status === 'paid' ? 0 : order.cod_amount,
              special_instruction: order.special_instructions || '',
            });

            const trackingUrl = shipmentRes.tracking_url || `https://pathao.com/courier/tracking/?consignment_id=${shipmentRes.consignment_id}`;

            await supabase.from('orders').update({
              courier_status: 'dispatched',
              fulfillment_status: 'fulfilled',
              courier_consignment_id: shipmentRes.consignment_id,
              courier_tracking_url: trackingUrl,
              courier_dispatched_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }).eq('id', order.id);

            await supabase.from('courier_shipments').insert({
              order_id: order.id,
              shop_id: order.shop_id,
              courier_provider: 'pathao',
              consignment_id: shipmentRes.consignment_id,
              tracking_code: shipmentRes.consignment_id,
              delivery_fee: order.delivery_charge,
              cod_amount: order.cod_amount,
              status: 'Order Placed',
              recipient_name: order.recipient_name,
              recipient_phone: order.recipient_phone,
              recipient_address: order.recipient_address,
            });

            await supabase.from('order_events').insert({
              order_id: order.id,
              shop_id: order.shop_id,
              event_type: 'PATHAO_SHIPMENT_CREATED',
              source: 'MIBX_USER',
              actor: 'Bulk Dispatch Engine',
              pathao_id: shipmentRes.consignment_id,
              message: `Bulk dispatched to Pathao with Consignment #${shipmentRes.consignment_id}`,
            });

            if (itemResult) {
              itemResult.status = 'success';
              itemResult.consignmentId = shipmentRes.consignment_id;
              itemResult.trackingUrl = trackingUrl;
            }
          } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            if (itemResult) {
              itemResult.status = 'failed';
              itemResult.error = errorMsg;
            }

            await supabase.from('sync_errors').insert({
              shop_id: order.shop_id,
              entity_type: 'order',
              entity_id: order.id,
              error_code: 'BULK_DISPATCH_FAILED',
              error_message: `Bulk dispatch failed for ${order.order_number}: ${errorMsg}`,
              stack_trace: errorMsg,
            });
          }
        }
      })()
    );
  }

  await Promise.all(workers);

  const successCount = results.filter((r) => r.status === 'success').length;
  const failedCount = results.filter((r) => r.status === 'failed').length;

  return {
    batchId,
    total: orderIds.length,
    successCount,
    failedCount,
    results,
    startedAt,
    completedAt: new Date().toISOString(),
  };
}
