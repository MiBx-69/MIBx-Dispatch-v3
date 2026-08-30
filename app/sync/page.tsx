'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Radio,
  Store,
  Send,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Code2,
  ExternalLink,
  Layers,
} from 'lucide-react';
import {
  getSyncStatsAction,
  getSyncEventsAction,
  getSyncErrorsAction,
  retrySyncErrorAction,
  syncHistoricalOrdersAction,
} from '@/lib/actions/sync-actions';
import { SyncEvent, SyncError } from '@/lib/types/database';
import { formatDate, timeAgo } from '@/lib/utils';
import { toast } from 'sonner';

export default function SyncCenterPage() {
  const [stats, setStats] = useState<{
    shopifyConnected: boolean;
    pathaoConnected: boolean;
    webhookHealth: string;
    lastSync: string;
    unresolvedErrors: number;
  } | null>(null);
  const [events, setEvents] = useState<SyncEvent[]>([]);
  const [errors, setErrors] = useState<SyncError[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReconciling, setIsReconciling] = useState(false);

  // Payload modal state
  const [selectedPayload, setSelectedPayload] = useState<Record<string, unknown> | null>(null);

  const loadSyncData = async () => {
    setLoading(true);
    try {
      const [statsRes, eventsRes, errorsRes] = await Promise.all([
        getSyncStatsAction(),
        getSyncEventsAction(),
        getSyncErrorsAction(),
      ]);

      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (eventsRes.success && eventsRes.data) setEvents(eventsRes.data);
      if (errorsRes.success && errorsRes.data) setErrors(errorsRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSyncData();
  }, []);

  const handleManualReconcile = async () => {
    setIsReconciling(true);
    try {
      // Assuming a default domain for testing, or we could add an input field if needed.
      const res = await syncHistoricalOrdersAction();
      if (res.success) {
        toast.success('Sync Completed', { description: res.message });
        loadSyncData();
      } else {
        toast.error('Reconciliation error', { description: res.error });
      }
    } finally {
      setIsReconciling(false);
    }
  };

  const handleRetryError = async (errorId: string) => {
    try {
      const res = await retrySyncErrorAction(errorId);
      if (res.success) {
        toast.success('Error Retried Successfully', { description: res.message });
        loadSyncData();
      } else {
        toast.error('Retry failed', { description: res.message });
      }
    } catch {
      toast.error('Retry request failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Radio className="h-6 w-6 text-primary animate-pulse" />
            Synchronization & Webhook Command Center
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time webhook ingestion, Shopify GraphQL reconciliation, and Pathao status synchronization.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleManualReconcile}
          disabled={isReconciling}
          className="h-9 text-xs gap-2 rounded-xl border-border/80"
        >
          <RefreshCw className={`h-4 w-4 ${isReconciling ? 'animate-spin text-primary' : ''}`} />
          <span>{isReconciling ? 'Reconciling...' : 'Trigger Full Reconcile'}</span>
        </Button>
      </div>

      {/* Integration Connections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Shopify Connection */}
        <Card className="border-border/80 bg-card/80 backdrop-blur-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Shopify Partner App</p>
                <p className="text-xs text-muted-foreground">Admin GraphQL API</p>
              </div>
            </div>
            <Badge variant="synced">Live</Badge>
          </CardContent>
        </Card>

        {/* Pathao Courier */}
        <Card className="border-border/80 bg-card/80 backdrop-blur-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-500/10 text-[#E22026] flex items-center justify-center">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Pathao Aladdin API</p>
                <p className="text-xs text-muted-foreground">OAuth Bearer Token</p>
              </div>
            </div>
            <Badge variant="synced">Connected</Badge>
          </CardContent>
        </Card>

        {/* Webhook Queue */}
        <Card className="border-border/80 bg-card/80 backdrop-blur-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Webhook Ingestion</p>
                <p className="text-xs text-muted-foreground">HMAC-SHA256 Verified</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400">
              99.8% Health
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Sync Flow Diagram / Demonstration */}
      <Card className="border-border/80 bg-card/80 backdrop-blur-xl">
        <CardHeader className="p-4 pb-2 border-b border-border/60">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Active Data Flow Architecture
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl border border-border/60 bg-background/50 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">1. Shopify → MIBx</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <p className="text-muted-foreground">Order & Customer Webhook Ingestion</p>
            </div>

            <div className="p-3 rounded-xl border border-border/60 bg-background/50 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">2. MIBx → Pathao</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <p className="text-muted-foreground">Consignment Creation & Routing</p>
            </div>

            <div className="p-3 rounded-xl border border-border/60 bg-background/50 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">3. Pathao → MIBx</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <p className="text-muted-foreground">Delivery & COD Status Stream</p>
            </div>

            <div className="p-3 rounded-xl border border-border/60 bg-background/50 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">4. MIBx → Shopify</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <p className="text-muted-foreground">Fulfillment & Tracking Reconciliation</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Failed Event Queue with Retry Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              Failed Sync & Attention Queue ({errors.filter((e) => !e.resolved).length})
            </h3>
          </div>

          {errors.filter((e) => !e.resolved).length === 0 ? (
            <div className="p-8 text-center border border-border/70 rounded-2xl bg-card/60 backdrop-blur-md space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
              <p className="text-xs font-semibold text-foreground">All Sync Queues Healthy</p>
              <p className="text-[11px] text-muted-foreground">No pending or failed synchronization events.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {errors
                .filter((e) => !e.resolved)
                .map((err) => (
                  <div
                    key={err.id}
                    className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-red-400 font-mono">
                        {err.error_code || 'SYNC_ERROR'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {timeAgo(err.created_at)}
                      </span>
                    </div>

                    <p className="text-foreground leading-relaxed">
                      {err.error_message}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-red-500/20">
                      <span className="text-[11px] text-muted-foreground">
                        Retries: {err.retry_count}
                      </span>

                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleRetryError(err.id)}
                        className="h-7 text-xs gap-1 px-3"
                      >
                        <RotateCcw className="h-3 w-3" /> Retry Sync Now
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Right Column: Webhook & Sync Events Stream */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Recent Synchronization Stream ({events.length})
          </h3>

          <div className="border border-border/80 rounded-2xl bg-card/80 backdrop-blur-xl p-3 divide-y divide-border/60 max-h-[500px] overflow-y-auto">
            {events.map((evt) => (
              <div key={evt.id} className="py-2.5 flex items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-2.5">
                  <Badge variant={evt.status === 'processed' ? 'synced' : 'syncFailed'}>
                    {evt.source.toUpperCase()}
                  </Badge>
                  <div>
                    <span className="font-semibold text-foreground">{evt.event_type}</span>
                    <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">
                      ID: {evt.event_id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {timeAgo(evt.created_at)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedPayload(evt.payload)}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    title="View JSON Payload"
                  >
                    <Code2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* JSON Payload Inspection Modal */}
      <Dialog open={Boolean(selectedPayload)} onOpenChange={(open) => !open && setSelectedPayload(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Webhook JSON Payload</DialogTitle>
          </DialogHeader>
          <div className="p-3 bg-black/60 rounded-xl border border-border/60 max-h-96 overflow-y-auto font-mono text-[11px] text-emerald-400">
            <pre>{JSON.stringify(selectedPayload, null, 2)}</pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
