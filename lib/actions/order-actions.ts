'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '../db/supabase-server';
import { PathaoClient } from '../courier/pathao/api';
import { processBulkDispatch } from '../dispatch/bulk-engine';
import { Order, OrderEvent, CourierShipment } from '../types/database';

export async function getOrdersAction(filters: {
  search?: string;
  courierStatus?: string;
  fulfillmentStatus?: string;
  paymentStatus?: string;
  city?: string;
} = {}) {
  try {
    const supabase = createAdminClient();
    if (!supabase) throw new Error('Database client error');

    let query = supabase.from('orders').select(`
      *,
      items:order_items(*),
      customer:customers(*),
      events:order_events(*),
      notes_list:notes(*),
      shipment:courier_shipments(*)
    `).order('created_at', { ascending: false });

    if (filters.search) {
      const q = filters.search.toLowerCase();
      query = query.or(`order_number.ilike.%${q}%,recipient_name.ilike.%${q}%,recipient_phone.ilike.%${q}%,courier_consignment_id.ilike.%${q}%`);
    }

    if (filters.courierStatus && filters.courierStatus !== 'all') {
      query = query.eq('courier_status', filters.courierStatus);
    }

    if (filters.fulfillmentStatus && filters.fulfillmentStatus !== 'all') {
      query = query.eq('fulfillment_status', filters.fulfillmentStatus);
    }

    if (filters.paymentStatus && filters.paymentStatus !== 'all') {
      query = query.eq('payment_status', filters.paymentStatus);
    }

    if (filters.city && filters.city !== 'all') {
      query = query.eq('city', filters.city);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data: data as any[] };
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    return { success: false, error: errMessage, data: [] };
  }
}

export async function getOrderByIdAction(id: string) {
  try {
    const supabase = createAdminClient();
    if (!supabase) throw new Error('Database client error');

    const { data, error } = await supabase.from('orders').select(`
      *,
      items:order_items(*),
      customer:customers(*),
      events:order_events(*),
      notes_list:notes(*),
      shipment:courier_shipments(*)
    `).or(`id.eq.${id},order_number.eq.${id}`).single();

    if (error || !data) return { success: false, error: 'Order not found', data: null };
    
    // Sort events
    if (data.events) {
      data.events.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return { success: true, data: data as any };
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    return { success: false, error: errMessage, data: null };
  }
}

export async function updateOrderDetailsAction(
  orderId: string,
  updates: {
    recipient_name?: string;
    recipient_phone?: string;
    recipient_address?: string;
    city?: string;
    zone?: string;
    area?: string;
    cod_amount?: number;
    weight_in_kg?: number;
    special_instructions?: string;
    pathao_store_id?: number;
    pathao_city_id?: number;
    pathao_zone_id?: number;
    pathao_area_id?: number;
    tags?: string[];
  }
) {
  try {
    const supabase = createAdminClient();
    if (!supabase) throw new Error('Database client error');

    const { data: existing, error: getErr } = await supabase.from('orders').select('shop_id').eq('id', orderId).single();
    if (getErr || !existing) throw new Error('Order not found');

    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    // Log revision
    await supabase.from('order_events').insert({
      order_id: orderId,
      shop_id: existing.shop_id,
      event_type: 'ORDER_UPDATED',
      source: 'MIBX_USER',
      actor: 'Warehouse Operator',
      message: 'Order updated manually via UI',
    });

    revalidatePath('/orders');
    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/dashboard');
    return { success: true, data: updatedOrder };
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    return { success: false, error: errMessage };
  }
}

export async function dispatchSingleOrderAction(params: {
  orderId: string;
  storeId: number;
  deliveryType?: number;
  itemType?: number;
  weight?: number;
  codAmount?: number;
  specialInstructions?: string;
  cityId?: number;
  zoneId?: number;
  areaId?: number;
}) {
  try {
    const supabase = createAdminClient();
    if (!supabase) throw new Error('Database client error');

    const { data: order, error: getErr } = await supabase.from('orders').select('*, items:order_items(quantity)').eq('id', params.orderId).single();
    if (getErr || !order) throw new Error('Order not found');

    const pathaoClient = new PathaoClient({
      baseUrl: process.env.PATHAO_BASE_URL || 'https://api-hermes.pathao.com',
      clientId: process.env.PATHAO_CLIENT_ID || '',
      clientSecret: process.env.PATHAO_CLIENT_SECRET || '',
      username: process.env.PATHAO_USERNAME || '',
      password: process.env.PATHAO_PASSWORD || '',
    });

    const cityId = params.cityId || order.pathao_city_id || (order.city?.toLowerCase().includes('chittagong') ? 2 : 1);
    const zoneId = params.zoneId || order.pathao_zone_id || 14;
    const quantity = order.items?.reduce((s: number, i: any) => s + (i.quantity || 1), 0) || 1;

    const shipment = await pathaoClient.createShipment({
      store_id: params.storeId || 101,
      merchant_order_id: order.order_number,
      recipient_name: order.recipient_name,
      recipient_phone: order.recipient_phone,
      recipient_address: order.recipient_address,
      recipient_city: cityId,
      recipient_zone: zoneId,
      recipient_area: params.areaId || order.pathao_area_id || undefined,
      delivery_type: params.deliveryType || 48,
      item_type: params.itemType || 2,
      item_quantity: quantity,
      item_weight: params.weight || order.weight_in_kg || 0.5,
      amount_to_collect: params.codAmount !== undefined ? params.codAmount : (order.payment_status === 'paid' ? 0 : order.cod_amount),
      special_instruction: params.specialInstructions || order.special_instructions || '',
    });

    // Update order
    const trackingUrl = shipment.tracking_url || `https://pathao.com/courier/tracking/?consignment_id=${shipment.consignment_id}`;
    
    await supabase.from('orders').update({
      courier_status: 'dispatched',
      fulfillment_status: 'fulfilled',
      courier_consignment_id: shipment.consignment_id,
      courier_tracking_url: trackingUrl,
      courier_dispatched_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', order.id);

    // Record shipment
    await supabase.from('courier_shipments').insert({
      order_id: order.id,
      shop_id: order.shop_id,
      courier_provider: 'pathao',
      consignment_id: shipment.consignment_id,
      tracking_code: shipment.consignment_id,
      delivery_fee: order.delivery_charge,
      cod_amount: order.cod_amount,
      status: 'Order Placed',
      recipient_name: order.recipient_name,
      recipient_phone: order.recipient_phone,
      recipient_address: order.recipient_address,
    });

    // Add audit events
    await supabase.from('order_events').insert([
      {
        order_id: order.id,
        shop_id: order.shop_id,
        event_type: 'PATHAO_SHIPMENT_CREATED',
        source: 'MIBX_USER',
        actor: 'Dispatcher (Single)',
        pathao_id: shipment.consignment_id,
        message: `Dispatched to Pathao with Consignment #${shipment.consignment_id}`,
      },
      {
        order_id: order.id,
        shop_id: order.shop_id,
        event_type: 'FULFILLMENT_CREATED',
        source: 'SYNC_JOB',
        actor: 'Shopify Sync',
        shopify_id: order.shopify_order_id,
        message: `Created Shopify Fulfillment with tracking URL: ${trackingUrl}`,
      }
    ]);

    revalidatePath('/orders');
    revalidatePath(`/orders/${params.orderId}`);
    revalidatePath('/dashboard');
    revalidatePath('/dispatch');

    return {
      success: true,
      data: order,
      consignmentId: shipment.consignment_id,
      trackingUrl,
    };
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    return { success: false, error: errMessage };
  }
}

export async function bulkDispatchOrdersAction(orderIds: string[], options: { storeId?: number; deliveryType?: number; itemType?: number } = {}) {
  try {
    const summary = await processBulkDispatch({
      orderIds,
      storeId: options.storeId || 101,
      deliveryType: options.deliveryType || 48,
      itemType: options.itemType || 2,
    });

    revalidatePath('/orders');
    revalidatePath('/dashboard');
    revalidatePath('/dispatch');
    revalidatePath('/sync');

    return { success: true, data: summary };
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    return { success: false, error: errMessage };
  }
}

export async function redispatchOrderAction(orderId: string) {
  try {
    const supabase = createAdminClient();
    if (!supabase) throw new Error('Database client error');

    const { data: order, error: getErr } = await supabase.from('orders').select('shop_id').eq('id', orderId).single();
    if (getErr || !order) throw new Error('Order not found');

    await supabase.from('orders').update({
      courier_status: 'ready_to_dispatch',
      courier_consignment_id: null,
      courier_tracking_url: null,
      updated_at: new Date().toISOString()
    }).eq('id', orderId);

    await supabase.from('order_events').insert({
      order_id: orderId,
      shop_id: order.shop_id,
      event_type: 'ORDER_REDISPATCH_REQUESTED',
      source: 'MIBX_USER',
      actor: 'Operator',
      message: 'Order cleared for redispatching with Pathao.',
    });

    revalidatePath('/orders');
    revalidatePath(`/orders/${orderId}`);
    return { success: true };
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    return { success: false, error: errMessage };
  }
}

export async function cancelFulfillmentAction(orderId: string) {
  try {
    const supabase = createAdminClient();
    if (!supabase) throw new Error('Database client error');

    const { data: order, error: getErr } = await supabase.from('orders').select('shop_id, courier_consignment_id').eq('id', orderId).single();
    if (getErr || !order) throw new Error('Order not found');

    if (order.courier_consignment_id) {
      const pathaoClient = new PathaoClient({
        baseUrl: process.env.PATHAO_BASE_URL || 'https://api-hermes.pathao.com',
        clientId: process.env.PATHAO_CLIENT_ID || '',
        clientSecret: process.env.PATHAO_CLIENT_SECRET || '',
        username: process.env.PATHAO_USERNAME || '',
        password: process.env.PATHAO_PASSWORD || '',
      });
      await pathaoClient.cancelShipment(order.courier_consignment_id);
    }

    await supabase.from('orders').update({
      courier_status: 'cancelled',
      fulfillment_status: 'unfulfilled',
      updated_at: new Date().toISOString()
    }).eq('id', orderId);

    await supabase.from('order_events').insert({
      order_id: orderId,
      shop_id: order.shop_id,
      event_type: 'FULFILLMENT_CANCELLED',
      source: 'MIBX_USER',
      actor: 'Operator',
      message: `Fulfillment and consignment ${order.courier_consignment_id || ''} cancelled.`,
    });

    revalidatePath('/orders');
    revalidatePath(`/orders/${orderId}`);
    return { success: true };
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    return { success: false, error: errMessage };
  }
}

export async function addOrderNoteAction(orderId: string, content: string, authorName = 'Operator') {
  try {
    const supabase = createAdminClient();
    if (!supabase) throw new Error('Database client error');

    const { data, error } = await supabase.from('notes').insert({
      order_id: orderId,
      content,
      author_name: authorName,
      is_internal: true
    }).select().single();

    if (error) throw error;

    revalidatePath(`/orders/${orderId}`);
    return { success: true, data };
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    return { success: false, error: errMessage };
  }
}
