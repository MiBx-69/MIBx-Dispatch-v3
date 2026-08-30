'use client';

import React, { useState } from 'react';
import { Order } from '@/lib/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Send,
  ExternalLink,
  ChevronRight,
  MapPin,
  Phone,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { formatBDT, formatDate, timeAgo } from '@/lib/utils';

interface OrdersTableProps {
  orders: Order[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onOpenOrder: (order: Order) => void;
}

export function OrdersTable({
  orders,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onOpenOrder,
}: OrdersTableProps) {
  const allSelected = orders.length > 0 && selectedIds.length === orders.length;

  if (orders.length === 0) {
    return (
      <div className="p-12 text-center border border-border/70 rounded-2xl bg-card/60 backdrop-blur-md space-y-3">
        <div className="h-12 w-12 rounded-full bg-secondary/80 flex items-center justify-center mx-auto text-muted-foreground">
          <Clock className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-foreground">No Orders Found</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          No orders match the selected filters or search query. Try clearing filters or trigger Shopify reconcile.
        </p>
      </div>
    );
  }

  const getCourierBadge = (status: string) => {
    switch (status) {
      case 'ready_to_dispatch':
      case 'unassigned':
        return <Badge variant="ready">Ready to Dispatch</Badge>;
      case 'dispatched':
        return <Badge variant="dispatched">Dispatched</Badge>;
      case 'in_transit':
        return <Badge variant="transit">In Transit</Badge>;
      case 'delivered':
        return <Badge variant="delivered">Delivered</Badge>;
      case 'failed':
        return <Badge variant="failed">Delivery Failed</Badge>;
      case 'returned':
        return <Badge variant="returned">Returned</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="border border-border/80 rounded-2xl overflow-hidden bg-card/80 backdrop-blur-xl shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border/70 bg-secondary/40 text-muted-foreground font-semibold">
              <th className="p-3.5 pl-4 w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={onSelectAll}
                  aria-label="Select all orders"
                />
              </th>
              <th className="p-3.5 font-medium">Order</th>
              <th className="p-3.5 font-medium">Customer & Destination</th>
              <th className="p-3.5 font-medium">COD & Total</th>
              <th className="p-3.5 font-medium">Payment</th>
              <th className="p-3.5 font-medium">Courier Status</th>
              <th className="p-3.5 font-medium">Consignment</th>
              <th className="p-3.5 text-right pr-4 font-medium">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border/60 text-foreground">
            {orders.map((order) => {
              const isSelected = selectedIds.includes(order.id);
              const canQuickDispatch =
                order.courier_status === 'ready_to_dispatch' ||
                order.courier_status === 'unassigned' ||
                order.courier_status === 'failed';

              return (
                <tr
                  key={order.id}
                  className={`hover:bg-secondary/40 transition-colors group cursor-pointer ${
                    isSelected ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => onOpenOrder(order)}
                >
                  {/* Select Checkbox */}
                  <td
                    className="p-3.5 pl-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelect(order.id);
                    }}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelect(order.id)}
                      aria-label={`Select order ${order.order_number}`}
                    />
                  </td>

                  {/* Order # and Time */}
                  <td className="p-3.5 font-medium">
                    <span className="font-bold text-foreground group-hover:text-primary transition-colors text-sm">
                      {order.order_number}
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      {timeAgo(order.shopify_created_at)}
                    </p>
                  </td>

                  {/* Customer, Phone, Destination */}
                  <td className="p-3.5 max-w-[200px]">
                    <p className="font-semibold text-foreground truncate">
                      {order.recipient_name}
                    </p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {order.recipient_phone}
                    </p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate mt-0.5">
                      <MapPin className="h-3 w-3 text-primary/70 shrink-0" />
                      <span>{order.city} - {order.zone || 'Central'}</span>
                    </p>
                  </td>

                  {/* COD & Total Price */}
                  <td className="p-3.5 whitespace-nowrap">
                    <p className="font-bold text-foreground">
                      {formatBDT(order.total_price)}
                    </p>
                    <p className="text-[11px] text-emerald-400 font-medium">
                      COD: {formatBDT(order.cod_amount)}
                    </p>
                  </td>

                  {/* Payment Status */}
                  <td className="p-3.5 whitespace-nowrap">
                    <Badge variant={order.payment_status === 'paid' ? 'paid' : 'pending'}>
                      {order.payment_status.toUpperCase()}
                    </Badge>
                  </td>

                  {/* Courier Status */}
                  <td className="p-3.5 whitespace-nowrap">
                    {getCourierBadge(order.courier_status)}
                  </td>

                  {/* Pathao Consignment Tracking */}
                  <td className="p-3.5 whitespace-nowrap font-mono text-[11px]">
                    {order.courier_consignment_id ? (
                      <a
                        href={order.courier_tracking_url || `https://pathao.com/courier/tracking/?consignment_id=${order.courier_consignment_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span>{order.courier_consignment_id}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>

                  {/* Quick Action Button */}
                  <td className="p-3.5 pr-4 text-right whitespace-nowrap">
                    {canQuickDispatch ? (
                      <Button
                        variant="pathao"
                        size="sm"
                        className="h-7 text-xs font-semibold gap-1 px-2.5 rounded-lg shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenOrder(order);
                        }}
                      >
                        <Send className="h-3 w-3" /> Dispatch
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2.5 rounded-lg"
                      >
                        <Eye className="h-3 w-3" /> Details
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
