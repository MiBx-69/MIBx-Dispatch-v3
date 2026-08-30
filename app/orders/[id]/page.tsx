import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getOrderByIdAction } from '@/lib/actions/order-actions';
import { OrderDispatchPanel } from '@/components/orders/detail/order-dispatch-panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  Phone,
  CreditCard,
  History,
  FileText,
  Send,
  ExternalLink,
} from 'lucide-react';
import { formatBDT, formatDate, timeAgo } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await getOrderByIdAction(id);
  const order = res.data;

  if (!res.success || !order) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back button and title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/orders">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl border border-border/80">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {order.order_number}
              </h1>
              <Badge variant={order.payment_status === 'paid' ? 'paid' : 'pending'}>
                {order.payment_status.toUpperCase()}
              </Badge>
              <Badge
                variant={
                  order.courier_status === 'delivered'
                    ? 'delivered'
                    : order.courier_status === 'in_transit'
                    ? 'transit'
                    : order.courier_status === 'ready_to_dispatch'
                    ? 'ready'
                    : 'default'
                }
              >
                {order.courier_status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Placed {formatDate(order.shopify_created_at)} • Source: Shopify
            </p>
          </div>
        </div>

        {order.courier_tracking_url && (
          <a href={order.courier_tracking_url} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 rounded-xl border-border/80">
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Track on Pathao</span>
            </Button>
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Line Items, Customer & Financials */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Address Card */}
          <Card className="border-border/80 bg-card/80 backdrop-blur-xl">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Customer & Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-xs">
              <p className="font-bold text-foreground text-sm">{order.recipient_name}</p>
              <p className="text-muted-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {order.recipient_phone}
              </p>
              <p className="text-muted-foreground flex items-start gap-1.5 pt-1">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <span>{order.recipient_address} ({order.city} - {order.zone})</span>
              </p>
            </CardContent>
          </Card>

          {/* Ordered Line Items Card */}
          <Card className="border-border/80 bg-card/80 backdrop-blur-xl">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Line Items ({order.items?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 divide-y divide-border/60">
              {order.items?.map((item: any) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-secondary overflow-hidden shrink-0 border border-border/60 relative">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-[10px] text-muted-foreground">
                          No Pic
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground leading-tight text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.variant_title || 'Default'} • SKU: {item.sku || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right whitespace-nowrap">
                    <p className="font-bold text-foreground text-sm">
                      {formatBDT(item.total_price)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Qty: {item.quantity} × {formatBDT(item.unit_price)}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Timeline / Audit Trail */}
          <Card className="border-border/80 bg-card/80 backdrop-blur-xl">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Order Audit History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
                {order.events?.map((evt: any) => (
                  <div key={evt.id} className="relative text-xs">
                    <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full bg-primary border-2 border-card" />
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{evt.event_type}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {formatDate(evt.created_at)}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-0.5">{evt.message}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Dispatch Panel & Financials */}
        <div className="space-y-6">
          {/* Dispatch Panel */}
          {/* Client Dispatch Action Wrapper */}
          <OrderDispatchPanel order={order} onOrderUpdated={() => {}} />

          {/* Financial Summary Card */}
          <Card className="border-border/80 bg-card/80 backdrop-blur-xl">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatBDT(order.subtotal_price)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery Charge</span>
                <span>{formatBDT(order.delivery_charge)}</span>
              </div>
              <div className="flex justify-between font-bold text-foreground text-sm pt-2 border-t border-border/60">
                <span>Total Value</span>
                <span>{formatBDT(order.total_price)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-400 text-xs pt-1">
                <span>COD Amount</span>
                <span>{formatBDT(order.cod_amount)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
