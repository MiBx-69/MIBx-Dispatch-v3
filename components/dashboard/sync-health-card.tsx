'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Radio,
  Store,
  Send,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { timeAgo } from '@/lib/utils';

export function SyncHealthCard({
  stats,
}: {
  stats: {
    shopifyConnected: boolean;
    pathaoConnected: boolean;
    webhookHealth: string;
    lastSync: string;
    unresolvedErrors: number;
  };
}) {
  return (
    <Card className="border-border/80 bg-card/80 backdrop-blur-xl">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary animate-pulse" />
          <CardTitle className="text-sm font-semibold">
            Integration & Sync Health
          </CardTitle>
        </div>
        <Link href="/sync">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary">
            Sync Center <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="p-4 pt-2 space-y-3">
        {/* Grid of integrations */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Shopify Platform */}
          <div className="p-3 rounded-xl border border-border/60 bg-background/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Store className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Shopify Store</p>
                <p className="text-[10px] text-muted-foreground">Admin GraphQL API</p>
              </div>
            </div>
            <Badge variant="synced" className="text-[10px] px-2 py-0.5">
              Live
            </Badge>
          </div>

          {/* Pathao Courier */}
          <div className="p-3 rounded-xl border border-border/60 bg-background/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-red-500/10 text-[#E22026] flex items-center justify-center">
                <Send className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Pathao Aladdin</p>
                <p className="text-[10px] text-muted-foreground">API Token Active</p>
              </div>
            </div>
            <Badge variant="synced" className="text-[10px] px-2 py-0.5">
              Connected
            </Badge>
          </div>

          {/* Webhook Stream */}
          <div className="p-3 rounded-xl border border-border/60 bg-background/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Webhook Queue</p>
                <p className="text-[10px] text-muted-foreground">{timeAgo(stats.lastSync)}</p>
              </div>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-medium">
              {stats.webhookHealth}
            </span>
          </div>
        </div>

        {/* Sync Failure Alert Banner (if errors exist) */}
        {stats.unresolvedErrors > 0 && (
          <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-red-400 font-medium">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                {stats.unresolvedErrors} delivery sync error(s) require operator review.
              </span>
            </div>
            <Link href="/sync">
              <Button size="sm" variant="destructive" className="h-7 text-xs px-2.5">
                Review & Retry
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
