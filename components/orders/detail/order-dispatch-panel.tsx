'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Send,
  Truck,
  ExternalLink,
  RefreshCw,
  Calculator,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Order } from '@/lib/types/database';
import {
  dispatchSingleOrderAction,
  redispatchOrderAction,
  cancelFulfillmentAction,
} from '@/lib/actions/order-actions';
import { formatBDT } from '@/lib/utils';
import { toast } from 'sonner';

interface DispatchPanelProps {
  order: Order;
  onOrderUpdated: () => void;
}

export function OrderDispatchPanel({ order, onOrderUpdated }: DispatchPanelProps) {
  const [storeId, setStoreId] = useState<number>(order.pathao_store_id || 101);
  const [cityId, setCityId] = useState<number>(
    order.pathao_city_id || (order.city?.toLowerCase().includes('chittagong') ? 2 : 1)
  );
  const [zoneId, setZoneId] = useState<number>(order.pathao_zone_id || 14);
  const [weight, setWeight] = useState<number>(order.weight_in_kg || 0.5);
  const [codAmount, setCodAmount] = useState<number>(
    order.payment_status === 'paid' ? 0 : order.cod_amount
  );
  const [deliveryType, setDeliveryType] = useState<number>(48);
  const [instructions, setInstructions] = useState<string>(order.special_instructions || '');

  // Estimated delivery fee
  const [estPrice, setEstPrice] = useState<number | null>(order.delivery_charge || 60);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);

  // Available zones based on cityId
  const getZonesForCity = (cId: number) => {
    if (cId === 1) {
      return [
        { id: 14, name: 'Dhanmondi' },
        { id: 3, name: 'Uttara' },
        { id: 4, name: 'Banani' },
        { id: 5, name: 'Gulshan 1' },
        { id: 6, name: 'Gulshan 2' },
        { id: 8, name: 'Mirpur 10' },
        { id: 9, name: 'Mohammadpur' },
        { id: 10, name: 'Motijheel' },
        { id: 13, name: 'Bashundhara R/A' },
      ];
    }
    if (cId === 2) {
      return [
        { id: 45, name: 'Agrabad' },
        { id: 46, name: 'GEC Circle' },
        { id: 47, name: 'Nasirabad' },
        { id: 48, name: 'Halishahar' },
        { id: 49, name: 'Khulshi' },
      ];
    }
    return [
      { id: 31, name: 'Zindabazar' },
      { id: 32, name: 'Amberkhana' },
      { id: 33, name: 'Subidbazar' },
    ];
  };

  const currentZones = getZonesForCity(cityId);

  // Recalculate price when city, zone or weight changes
  const handleCalculatePrice = async () => {
    setIsCalculating(true);
    try {
      const res = await fetch('/api/courier/pathao/geo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          item_type: 2,
          delivery_type: deliveryType,
          item_weight: weight,
          recipient_city: cityId,
          recipient_zone: zoneId,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setEstPrice(json.data.final_price);
        toast.info('Price Estimated', {
          description: `Pathao Delivery Fee: ${formatBDT(json.data.final_price)}`,
        });
      }
    } catch {
      // fallback
    } finally {
      setIsCalculating(false);
    }
  };

  const handleDispatch = async () => {
    setIsDispatching(true);
    try {
      const res = await dispatchSingleOrderAction({
        orderId: order.id,
        storeId,
        cityId,
        zoneId,
        weight,
        codAmount,
        deliveryType,
        specialInstructions: instructions,
      });

      if (res.success) {
        toast.success('Order Dispatched Successfully', {
          description: `Pathao Consignment: ${res.consignmentId}`,
        });
        onOrderUpdated();
      } else {
        toast.error('Dispatch Failed', { description: res.error });
      }
    } catch {
      toast.error('Dispatch failed due to network error');
    } finally {
      setIsDispatching(false);
    }
  };

  const handleRedispatch = async () => {
    setIsDispatching(true);
    try {
      const res = await redispatchOrderAction(order.id);
      if (res.success) {
        toast.info('Redispatch Initiated', {
          description: 'Order state reset. You can now dispatch with new parameters.',
        });
        onOrderUpdated();
      }
    } finally {
      setIsDispatching(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this courier shipment and fulfillment?')) return;
    setIsDispatching(true);
    try {
      const res = await cancelFulfillmentAction(order.id);
      if (res.success) {
        toast.warning('Shipment Cancelled');
        onOrderUpdated();
      }
    } finally {
      setIsDispatching(false);
    }
  };

  const isDispatched = Boolean(order.courier_consignment_id && order.courier_status !== 'failed');

  return (
    <Card className="border-border/80 bg-card/90 backdrop-blur-xl">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-[#E22026]/15 text-[#E22026] flex items-center justify-center font-bold">
            <Send className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">
              Pathao Courier Dispatch
            </CardTitle>
          </div>
        </div>

        {isDispatched && (
          <Badge variant="dispatched" className="text-xs">
            Dispatched
          </Badge>
        )}
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* If already dispatched, show Consignment Details Card */}
        {isDispatched ? (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl border border-border/80 bg-background/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Consignment ID</span>
                <span className="font-mono text-xs font-bold text-primary">
                  {order.courier_consignment_id}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Courier Status</span>
                <Badge variant={order.courier_status === 'delivered' ? 'delivered' : 'transit'}>
                  {order.courier_status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">COD to Collect</span>
                <span className="font-semibold text-xs text-emerald-400">
                  {formatBDT(order.cod_amount)}
                </span>
              </div>
            </div>

            {order.courier_tracking_url && (
              <a
                href={order.courier_tracking_url}
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5 border-border/80">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open Pathao Live Tracking</span>
                </Button>
              </a>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRedispatch}
                disabled={isDispatching}
                className="flex-1 h-8 text-xs gap-1"
              >
                <RefreshCw className="h-3 w-3" /> Redispatch
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleCancel}
                disabled={isDispatching}
                className="flex-1 h-8 text-xs gap-1"
              >
                <XCircle className="h-3 w-3" /> Cancel Shipment
              </Button>
            </div>
          </div>
        ) : (
          /* Dispatch Configuration Form */
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground">
                Pickup Store Hub
              </label>
              <Select value={String(storeId)} onValueChange={(v) => setStoreId(Number(v))}>
                <SelectTrigger className="mt-1 h-8 text-xs bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="101">Main Hub - Dhanmondi (Dhaka 1209)</SelectItem>
                  <SelectItem value="102">Uttara Warehouse (Dhaka 1230)</SelectItem>
                  <SelectItem value="103">Agrabad C/A (Chittagong)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* City & Zone Selectors */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Destination City
                </label>
                <Select
                  value={String(cityId)}
                  onValueChange={(v) => {
                    const newCity = Number(v);
                    setCityId(newCity);
                    const newZones = getZonesForCity(newCity);
                    if (newZones.length > 0) setZoneId(newZones[0].id);
                  }}
                >
                  <SelectTrigger className="mt-1 h-8 text-xs bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Dhaka</SelectItem>
                    <SelectItem value="2">Chittagong</SelectItem>
                    <SelectItem value="3">Sylhet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Zone
                </label>
                <Select value={String(zoneId)} onValueChange={(v) => setZoneId(Number(v))}>
                  <SelectTrigger className="mt-1 h-8 text-xs bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currentZones.map((z) => (
                      <SelectItem key={z.id} value={String(z.id)}>
                        {z.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Weight & COD */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Parcel Weight (KG)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.5"
                  value={weight}
                  onChange={(e) => setWeight(parseFloat(e.target.value) || 0.5)}
                  className="mt-1 h-8 text-xs bg-background/50"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">
                  COD Amount (৳)
                </label>
                <Input
                  type="number"
                  value={codAmount}
                  onChange={(e) => setCodAmount(parseFloat(e.target.value) || 0)}
                  className="mt-1 h-8 text-xs bg-background/50"
                />
              </div>
            </div>

            {/* Special Instructions */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground">
                Delivery Instructions
              </label>
              <Input
                placeholder="e.g. Call before arrival, deliver after 3 PM"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="mt-1 h-8 text-xs bg-background/50"
              />
            </div>

            {/* Pricing estimate & dispatch CTA */}
            <div className="p-2.5 rounded-xl border border-border/70 bg-secondary/30 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Estimated Delivery Fee:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-foreground font-mono">
                  {formatBDT(estPrice || 60)}
                </span>
                <button
                  onClick={handleCalculatePrice}
                  disabled={isCalculating}
                  className="text-primary hover:text-primary/80"
                  title="Recalculate rate"
                >
                  <Calculator className={`h-3.5 w-3.5 ${isCalculating ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <Button
              variant="pathao"
              size="sm"
              onClick={handleDispatch}
              disabled={isDispatching}
              className="w-full h-9 gap-2 text-xs font-semibold rounded-xl shadow-md"
            >
              <Send className="h-4 w-4" />
              <span>{isDispatching ? 'Generating Consignment...' : 'Dispatch to Pathao Now'}</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
