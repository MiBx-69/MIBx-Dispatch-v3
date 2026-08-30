'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Barcode,
  Package,
  Printer,
  CheckCircle2,
  AlertCircle,
  Truck,
  ExternalLink,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { Order } from '@/lib/types/database';
import { getOrdersAction, dispatchSingleOrderAction } from '@/lib/actions/order-actions';
import { formatBDT, timeAgo } from '@/lib/utils';
import { toast } from 'sonner';

export default function DispatchTowerPage() {
  const [scanInput, setScanInput] = useState('');
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [recentDispatched, setRecentDispatched] = useState<
    Array<{ orderNumber: string; consignmentId: string; customer: string; cod: number; time: string }>
  >([]);

  const [storeId, setStoreId] = useState<number>(101);
  const [weight, setWeight] = useState<number>(0.5);
  const [codAmount, setCodAmount] = useState<number>(0);
  const [instructions, setInstructions] = useState<string>('');
  const [isDispatching, setIsDispatching] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input automatically on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearchOrScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = scanInput.trim();
    if (!query) return;

    try {
      const res = await getOrdersAction({ search: query });
      if (res.success && res.data && res.data.length > 0) {
        const found = res.data[0];
        setActiveOrder(found);
        setWeight(found.weight_in_kg || 0.5);
        setCodAmount(found.payment_status === 'paid' ? 0 : found.cod_amount);
        setInstructions(found.special_instructions || '');
        toast.info(`Found Order ${found.order_number}`);
      } else {
        toast.error(`Order "${query}" not found`);
      }
    } catch {
      toast.error('Search failed');
    }
  };

  const handleExecuteDispatch = async () => {
    if (!activeOrder) return;
    setIsDispatching(true);

    try {
      const res = await dispatchSingleOrderAction({
        orderId: activeOrder.id,
        storeId,
        weight,
        codAmount,
        specialInstructions: instructions,
      });

      if (res.success && res.consignmentId) {
        toast.success(`Dispatched ${activeOrder.order_number}!`, {
          description: `Pathao Consignment: ${res.consignmentId}`,
        });

        // Add to session dispatched list
        setRecentDispatched((prev) => [
          {
            orderNumber: activeOrder.order_number,
            consignmentId: res.consignmentId || 'PTH-OK',
            customer: activeOrder.recipient_name,
            cod: codAmount,
            time: new Date().toLocaleTimeString(),
          },
          ...prev,
        ]);

        // Reset for next scan
        setActiveOrder(null);
        setScanInput('');
        inputRef.current?.focus();
      } else {
        toast.error('Dispatch failed', { description: res.error });
      }
    } catch {
      toast.error('Dispatch exception occurred');
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Zap className="h-6 w-6 text-[#E22026]" />
            Warehouse Dispatch Tower
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            High-speed scanning and 1-click Pathao consignment generation for pack stations.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Scanner Ready (Barcode / Order #)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Scanner & Dispatch Execution */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scanner Input Card */}
          <Card className="border-border/80 bg-card/80 backdrop-blur-xl glow-hover">
            <CardContent className="p-5">
              <form onSubmit={handleSearchOrScan} className="space-y-2">
                <label className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Barcode className="h-4 w-4 text-primary" />
                  Scan Barcode or Type Order Number
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      ref={inputRef}
                      placeholder="e.g. 10482, #10483, or 01711223344..."
                      value={scanInput}
                      onChange={(e) => setScanInput(e.target.value)}
                      className="h-11 text-sm bg-background/60 font-mono tracking-wide px-4 border-primary/40 focus-visible:ring-primary"
                    />
                  </div>
                  <Button type="submit" variant="default" className="h-11 px-6 font-semibold">
                    Find Order
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Active Scanned Order Card */}
          {activeOrder ? (
            <Card className="border-primary/40 bg-card/90 backdrop-blur-xl shadow-xl space-y-4">
              <CardHeader className="p-5 pb-0 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                      <Package className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg font-bold">
                          {activeOrder.order_number}
                        </CardTitle>
                        <Badge variant={activeOrder.payment_status === 'paid' ? 'paid' : 'pending'}>
                          {activeOrder.payment_status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {activeOrder.recipient_name} • {activeOrder.recipient_phone}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">Total COD</span>
                    <p className="text-lg font-bold text-emerald-400">
                      {formatBDT(codAmount)}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                {/* Destination & items */}
                <div className="p-3.5 rounded-xl border border-border/60 bg-background/50 text-xs space-y-1.5">
                  <p className="font-semibold text-foreground">Delivery Destination:</p>
                  <p className="text-muted-foreground">{activeOrder.recipient_address}</p>
                  <p className="text-primary font-medium">{activeOrder.city} • Zone: {activeOrder.zone || 'Central'}</p>
                </div>

                {/* Items preview */}
                <div className="border border-border/60 rounded-xl p-3 bg-secondary/20 text-xs space-y-1.5">
                  <p className="font-semibold text-muted-foreground">Items ({activeOrder.items?.length || 0}):</p>
                  {activeOrder.items?.map((item) => (
                    <div key={item.id} className="flex justify-between text-foreground">
                      <span>• {item.title} ({item.variant_title || 'Default'})</span>
                      <span className="font-mono">Qty: {item.quantity}</span>
                    </div>
                  ))}
                </div>

                {/* Dispatch parameters */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">Pickup Hub</label>
                    <Select value={String(storeId)} onValueChange={(v) => setStoreId(Number(v))}>
                      <SelectTrigger className="mt-1 h-8 text-xs bg-background/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="101">Dhanmondi Hub</SelectItem>
                        <SelectItem value="102">Uttara Warehouse</SelectItem>
                        <SelectItem value="103">Agrabad CTG</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">Weight (KG)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={weight}
                      onChange={(e) => setWeight(parseFloat(e.target.value) || 0.5)}
                      className="mt-1 h-8 text-xs bg-background/60"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">COD Amount (৳)</label>
                    <Input
                      type="number"
                      value={codAmount}
                      onChange={(e) => setCodAmount(parseFloat(e.target.value) || 0)}
                      className="mt-1 h-8 text-xs bg-background/60 font-bold text-emerald-400"
                    />
                  </div>
                </div>

                {/* Dispatch Trigger CTA */}
                <div className="pt-2 flex gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveOrder(null)}
                    className="h-11 px-4 text-xs text-muted-foreground"
                  >
                    Cancel
                  </Button>

                  <Button
                    variant="pathao"
                    size="lg"
                    onClick={handleExecuteDispatch}
                    disabled={isDispatching}
                    className="flex-1 h-11 text-sm font-bold gap-2 rounded-xl shadow-lg"
                  >
                    <Send className="h-4 w-4" />
                    <span>{isDispatching ? 'Generating Pathao Consignment...' : 'Dispatch to Pathao (Enter ↵)'}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="p-12 text-center border border-dashed border-border/80 rounded-2xl bg-card/40 backdrop-blur-md space-y-2">
              <Barcode className="h-10 w-10 text-muted-foreground/50 mx-auto" />
              <h3 className="text-sm font-semibold text-foreground">Waiting for Next Scan</h3>
              <p className="text-xs text-muted-foreground">
                Scan barcode on packing slip or type order number above to begin.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Session Dispatched Feed */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-border/80 bg-card/80 backdrop-blur-xl">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Dispatched This Session
                </CardTitle>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                  {recentDispatched.length}
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-2.5">
              {recentDispatched.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  No orders dispatched in this session yet.
                </p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {recentDispatched.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-border/60 bg-background/50 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground text-sm">{item.orderNumber}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{item.time}</span>
                      </div>
                      <p className="text-muted-foreground truncate">{item.customer}</p>
                      <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                        <span className="font-mono text-primary font-semibold">{item.consignmentId}</span>
                        <span className="text-emerald-400 font-bold">{formatBDT(item.cod)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
