import React from 'react';
import Link from 'next/link';
import { MetricCards } from '@/components/dashboard/metric-cards';
import { SyncHealthCard } from '@/components/dashboard/sync-health-card';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { Button } from '@/components/ui/button';
import { getSyncStatsAction, getSyncEventsAction } from '@/lib/actions/sync-actions';
import { getOrdersAction } from '@/lib/actions/order-actions';
import { createAdminClient } from '@/lib/db/supabase-server';
import {
  Send,
  Package,
  Radio,
  ArrowRight,
  TrendingUp,
  Store,
  Layers,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [statsRes, ordersRes, eventsRes] = await Promise.all([
    getSyncStatsAction(),
    getOrdersAction(),
    getSyncEventsAction()
  ]);

  const stats = statsRes.data || {
    totalOrders: 0,
    readyOrders: 0,
    dispatchedOrders: 0,
    deliveredOrders: 0,
    unresolvedErrors: 0,
    lastSync: new Date().toISOString(),
    shopifyConnected: false,
    pathaoConnected: false,
    webhookHealth: 'Unavailable',
  };
  const orders = ordersRes.data || [];
  const events = eventsRes.data || [];

  const supabase = createAdminClient();
  let auditEvents: any[] = [];
  if (supabase) {
    const { data } = await supabase.from('order_events').select('*').order('created_at', { ascending: false }).limit(20);
    if (data) auditEvents = data;
  }

  // Calculate display metrics from the same order data shown on this page.
  const totalOrders = orders.length;
  const readyOrders = orders.filter((o: any) => o.courier_status === 'ready_to_dispatch' || o.courier_status === 'unassigned').length;
  const dispatched = orders.filter((o: any) => o.courier_status === 'dispatched').length;
  const inTransit = orders.filter((o: any) => o.courier_status === 'in_transit').length;
  const delivered = orders.filter((o: any) => o.courier_status === 'delivered').length;
  const failed = orders.filter((o: any) => o.courier_status === 'failed' || o.courier_status === 'returned').length;
  const today = new Date();
  const todayCod = orders.reduce((total: number, order: any) => {
    const deliveredAt = order.courier_delivered_at ? new Date(order.courier_delivered_at) : null;
    const wasDeliveredToday = deliveredAt
      && !Number.isNaN(deliveredAt.getTime())
      && deliveredAt.toDateString() === today.toDateString();
    const codAmount = Number(order.cod_amount);

    return wasDeliveredToday && Number.isFinite(codAmount) ? total + codAmount : total;
  }, 0);
  
  const enrichedStats = {
    ...stats,
    totalOrders,
    readyOrders,
    dispatched,
    inTransit,
    delivered,
    failed,
    todayCod,
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Logistics & Dispatch Control Tower
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Connected to <span className="text-foreground font-semibold">Artisan Lifestyle BD</span> • Real-time Pathao Aladdin Courier Engine
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/orders">
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 rounded-xl border-border/80">
              <Package className="h-4 w-4 text-primary" />
              <span>Manage Orders ({enrichedStats.totalOrders})</span>
            </Button>
          </Link>

          <Link href="/dispatch">
            <Button variant="pathao" size="sm" className="h-9 text-xs gap-1.5 rounded-xl font-semibold shadow-md">
              <Send className="h-4 w-4" />
              <span>Fast Dispatch</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <MetricCards stats={enrichedStats} />

      {/* Two Column Section: Sync Health & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Sync Health & Connection Diagnostics */}
          <SyncHealthCard stats={enrichedStats as any} />

          {/* Quick Ready-To-Dispatch Orders Preview */}
          <div className="border border-border/80 rounded-2xl p-4 sm:p-5 bg-card/80 backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Package className="h-4 w-4 text-amber-400" />
                  Ready For Dispatch ({enrichedStats.readyOrders})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Orders ready for immediate Pathao consignment generation
                </p>
              </div>

              <Link href="/orders?status=ready_to_dispatch">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-primary gap-1">
                  View All <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>

            <div className="divide-y divide-border/60">
              {orders
                .filter((o: any) => o.courier_status === 'ready_to_dispatch' || o.courier_status === 'unassigned')
                .slice(0, 3)
                .map((order: any) => (
                  <div key={order.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-foreground text-sm">{order.order_number}</span>
                      <span className="text-muted-foreground ml-2">{order.recipient_name} ({order.city})</span>
                    </div>
                    <Link href={`/orders`}>
                      <Button variant="pathao" size="sm" className="h-7 text-xs px-3 rounded-lg">
                        Dispatch
                      </Button>
                    </Link>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Live Operations & Audit Timeline */}
        <div className="lg:col-span-1">
          <RecentActivity events={auditEvents} />
        </div>
      </div>
    </div>
  );
}
