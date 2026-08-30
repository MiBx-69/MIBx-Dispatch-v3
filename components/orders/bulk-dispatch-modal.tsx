'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  Package,
} from 'lucide-react';
import { bulkDispatchOrdersAction } from '@/lib/actions/order-actions';
import { BulkDispatchItemResult, BulkDispatchSummary } from '@/lib/dispatch/bulk-engine';
import { toast } from 'sonner';

interface BulkDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderIds: string[];
  onComplete: () => void;
}

export function BulkDispatchModal({
  isOpen,
  onClose,
  orderIds,
  onComplete,
}: BulkDispatchModalProps) {
  const [storeId, setStoreId] = useState<number>(101);
  const [deliveryType, setDeliveryType] = useState<number>(48);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState<BulkDispatchSummary | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setSummary(null);
      setProgressPercent(0);
      setIsProcessing(false);
    }
  }, [isOpen, orderIds]);

  const handleStartDispatch = async () => {
    setIsProcessing(true);
    setProgressPercent(20);

    try {
      const res = await bulkDispatchOrdersAction(orderIds, {
        storeId,
        deliveryType,
      });

      if (res.success && res.data) {
        setSummary(res.data);
        setProgressPercent(100);
        toast.success('Bulk Dispatch Completed', {
          description: `${res.data.successCount} dispatched successfully, ${res.data.failedCount} failed.`,
        });
        onComplete();
      } else {
        toast.error('Bulk Dispatch Error', { description: res.error });
      }
    } catch {
      toast.error('Bulk dispatch request failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetryFailed = async () => {
    if (!summary) return;
    const failedIds = summary.results.filter((r) => r.status === 'failed').map((r) => r.orderId);
    if (failedIds.length === 0) return;

    setIsProcessing(true);
    try {
      const res = await bulkDispatchOrdersAction(failedIds, {
        storeId,
        deliveryType,
      });

      if (res.success && res.data) {
        // Merge results
        const updatedResults = summary.results.map((r) => {
          const retried = res.data.results.find((rr) => rr.orderId === r.orderId);
          return retried || r;
        });

        const newSuccess = updatedResults.filter((r) => r.status === 'success').length;
        const newFailed = updatedResults.filter((r) => r.status === 'failed').length;

        setSummary({
          ...summary,
          successCount: newSuccess,
          failedCount: newFailed,
          results: updatedResults,
        });

        toast.success('Retry Completed', {
          description: `${res.data.successCount} newly dispatched.`,
        });
        onComplete();
      }
    } catch {
      toast.error('Retry failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const failedCount = summary ? summary.failedCount : 0;
  const successCount = summary ? summary.successCount : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isProcessing && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#E22026]/15 text-[#E22026] flex items-center justify-center">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Bulk Dispatch to Pathao Aladdin
              </DialogTitle>
              <DialogDescription className="text-xs">
                Batch consignments creation and Shopify fulfillment sync.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Configuration step (before execution) */}
        {!summary && !isProcessing && (
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-xl border border-border/80 bg-background/50 space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Pickup Store Location
                </label>
                <Select value={String(storeId)} onValueChange={(v) => setStoreId(Number(v))}>
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="101">Main Hub - Dhanmondi (Dhaka 1209)</SelectItem>
                    <SelectItem value="102">Uttara Warehouse (Dhaka 1230)</SelectItem>
                    <SelectItem value="103">Agrabad C/A (Chittagong)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Delivery Speed / Type
                </label>
                <Select value={String(deliveryType)} onValueChange={(v) => setDeliveryType(Number(v))}>
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="48">Standard Delivery (24-48 Hours)</SelectItem>
                    <SelectItem value="12">On Demand / Express (Same Day)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 p-3 bg-secondary/30 flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Selected Orders for Dispatch</span>
              <span className="font-bold text-foreground font-mono">{orderIds.length} Orders</span>
            </div>
          </div>
        )}

        {/* Live Processing State */}
        {isProcessing && !summary && (
          <div className="py-6 space-y-4 text-center">
            <Loader2 className="h-8 w-8 text-[#E22026] animate-spin mx-auto" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Dispatching orders to Pathao...
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Validating phone numbers, generating consignments & syncing Shopify
              </p>
            </div>
            <Progress value={progressPercent} className="h-2 max-w-xs mx-auto" />
          </div>
        )}

        {/* Results Summary State */}
        {summary && (
          <div className="space-y-4 py-2">
            {/* Status overview metrics */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-secondary/50 border border-border/60">
                <span className="text-[10px] text-muted-foreground font-medium uppercase">Total</span>
                <p className="text-lg font-bold">{summary.total}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <span className="text-[10px] font-medium uppercase">Successful</span>
                <p className="text-lg font-bold">{successCount}</p>
              </div>
              <div className={`p-2.5 rounded-xl border ${failedCount > 0 ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-secondary/50 border-border/60 text-muted-foreground'}`}>
                <span className="text-[10px] font-medium uppercase">Failed</span>
                <p className="text-lg font-bold">{failedCount}</p>
              </div>
            </div>

            {/* Per-item live status list */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-border/60 rounded-xl p-2 bg-background/50 text-xs">
              {summary.results.map((res) => (
                <div
                  key={res.orderId}
                  className="flex items-center justify-between p-2 rounded-lg bg-card border border-border/40"
                >
                  <div className="flex items-center gap-2">
                    {res.status === 'success' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                    {res.status === 'failed' && <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                    {res.status === 'processing' && <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />}
                    <div>
                      <span className="font-semibold text-foreground">{res.orderNumber}</span>
                      <span className="text-muted-foreground ml-2 truncate">{res.recipientName}</span>
                    </div>
                  </div>

                  <div>
                    {res.status === 'success' && (
                      <span className="font-mono text-[11px] text-emerald-400 font-medium">
                        {res.consignmentId}
                      </span>
                    )}
                    {res.status === 'failed' && (
                      <span className="text-[10px] text-red-400 font-medium truncate max-w-[150px] inline-block">
                        {res.error || 'Failed'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {!summary && !isProcessing && (
            <>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="pathao"
                size="sm"
                onClick={handleStartDispatch}
                className="gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Start Batch Dispatch ({orderIds.length})</span>
              </Button>
            </>
          )}

          {summary && (
            <div className="flex items-center justify-between w-full">
              {failedCount > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetryFailed}
                  disabled={isProcessing}
                  className="gap-1.5 text-red-400 border-red-500/40 hover:bg-red-500/10"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                  <span>Retry Failed ({failedCount})</span>
                </Button>
              ) : <div />}

              <Button variant="default" size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
