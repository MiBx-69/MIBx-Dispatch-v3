'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Send,
  Radio,
  Settings,
  ChevronLeft,
  ChevronRight,
  Store,
  Layers,
  Activity,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const navItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    badge: null,
  },
  {
    name: 'Orders',
    href: '/orders',
    icon: Package,
    badge: '6',
  },
  {
    name: 'Dispatch Tower',
    href: '/dispatch',
    icon: Send,
    badge: 'Ready',
    badgeVariant: 'ready' as const,
  },
  {
    name: 'Sync Center',
    href: '/sync',
    icon: Radio,
    badge: 'Live',
    badgeVariant: 'synced' as const,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    badge: null,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r border-border/80 bg-card/90 backdrop-blur-xl transition-all duration-300 relative z-30 h-screen sticky top-0',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand & Store Switcher */}
      <div className="p-4 border-b border-border/60 flex items-center justify-between">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center shadow-md shadow-primary/25 text-white font-bold text-lg tracking-tight">
              M
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-foreground">
                  MIBx Dispatch
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">
                  v3
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                Artisan Lifestyle BD
              </p>
            </div>
          </div>
        ) : (
          <div className="h-9 w-9 mx-auto rounded-xl bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center shadow-md text-white font-bold text-lg">
            M
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="h-7 w-7 rounded-lg border border-border/80 bg-background/80 hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25 font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0 transition-transform group-hover:scale-110', isActive ? 'text-white' : 'text-muted-foreground group-hover:text-primary')} />
              
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between">
                  <span>{item.name}</span>
                  {item.badge && (
                    <span
                      className={cn(
                        'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-secondary text-muted-foreground border border-border/60'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Store Connection Status Indicator */}
      {!collapsed ? (
        <div className="p-4 border-t border-border/60 bg-background/30">
          <div className="rounded-xl border border-border/70 p-3 bg-card/60 space-y-2 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Store className="h-3.5 w-3.5 text-primary" /> Shopify Store
              </span>
              <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                <CheckCircle2 className="h-3 w-3" /> Live
              </span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Send className="h-3.5 w-3.5 text-[#E22026]" /> Pathao Courier
              </span>
              <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                <CheckCircle2 className="h-3 w-3" /> Active
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 border-t border-border/60 flex justify-center">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" title="Systems online" />
        </div>
      )}
    </aside>
  );
}
