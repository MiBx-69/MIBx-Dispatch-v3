'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { OrderEvent } from '@/lib/types/database';
import { timeAgo } from '@/lib/utils';
import {
  Send,
  ShoppingBag,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';

export function RecentActivity({ events }: { events: OrderEvent[] }) {
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'ORDER_CREATED':
        return <ShoppingBag className="h-3.5 w-3.5 text-blue-400" />;
      case 'PATHAO_SHIPMENT_CREATED':
        return <Send className="h-3.5 w-3.5 text-[#E22026]" />;
      case 'FULFILLMENT_CREATED':
      case 'STATUS_UPDATED':
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
      case 'NOTE_ADDED':
        return <FileText className="h-3.5 w-3.5 text-purple-400" />;
      case 'SYNC_RETRIED':
        return <RefreshCw className="h-3.5 w-3.5 text-amber-400" />;
      default:
        return <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <Card className="border-border/80 bg-card/80 backdrop-blur-xl">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span>Live Operations Timeline</span>
          <span className="text-[11px] font-normal text-muted-foreground">
            Audit Stream
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 pt-2">
        <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
          {events.slice(0, 6).map((evt) => (
            <div key={evt.id} className="relative group">
              {/* Event node */}
              <div className="absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-card border border-border flex items-center justify-center shadow-sm">
                {getEventIcon(evt.event_type)}
              </div>

              <div className="text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">
                    {evt.actor || 'System'}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {timeAgo(evt.created_at)}
                  </span>
                </div>

                <p className="text-muted-foreground mt-0.5 leading-relaxed">
                  {evt.message}
                </p>

                {evt.pathao_id && (
                  <span className="inline-block mt-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#E22026]/10 text-[#E22026] border border-red-500/20">
                    Consignment: {evt.pathao_id}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
