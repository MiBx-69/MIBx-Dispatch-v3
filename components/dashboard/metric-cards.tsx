'use client';

import React from 'react';
import {
  Package,
  Clock,
  Truck,
  CheckCircle2,
  AlertOctagon,
  Coins,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatBDT } from '@/lib/utils';

interface MetricStats {
  totalOrders: number;
  readyOrders: number;
  dispatched: number;
  inTransit: number;
  delivered: number;
  failed: number;
  todayCod: number;
}

export function MetricCards({ stats }: { stats: MetricStats }) {
  const cards = [
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      subtitle: 'From Shopify Store',
      icon: Package,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
    {
      title: 'Ready to Dispatch',
      value: stats.readyOrders,
      subtitle: 'Awaiting Pathao Pickup',
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      highlight: true,
    },
    {
      title: 'In Transit',
      value: stats.inTransit + stats.dispatched,
      subtitle: 'On Delivery Way',
      icon: Truck,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
    },
    {
      title: 'Delivered',
      value: stats.delivered,
      subtitle: 'Successfully Handed Over',
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      title: 'Action Needed',
      value: stats.failed,
      subtitle: 'Failed / Returned / Unreachable',
      icon: AlertOctagon,
      color: stats.failed > 0 ? 'text-red-400' : 'text-muted-foreground',
      bg: stats.failed > 0 ? 'bg-red-500/10' : 'bg-secondary/40',
      border: stats.failed > 0 ? 'border-red-500/30' : 'border-border/60',
    },
    {
      title: 'COD Collected',
      value: formatBDT(stats.todayCod),
      subtitle: 'Cash on Delivery',
      icon: Coins,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card
            key={idx}
            className={`border ${card.border} ${card.bg} relative overflow-hidden backdrop-blur-md glow-hover`}
          >
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {card.title}
                </span>
                <div className={`p-1.5 rounded-lg ${card.bg} ${card.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              <div>
                <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {card.value}
                </div>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {card.subtitle}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
