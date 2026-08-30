'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Send, Radio, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const mobileNavItems = [
  { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Orders', href: '/orders', icon: Package },
  { name: 'Dispatch', href: '/dispatch', icon: Send, highlight: true },
  { name: 'Sync', href: '/sync', icon: Radio },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-2xl border-t border-border/80 px-2 py-2 safe-area-pb">
      <div className="flex items-center justify-around">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;

          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-5 relative group"
              >
                <div className="h-12 w-12 rounded-full bg-[#E22026] text-white flex items-center justify-center shadow-lg shadow-red-500/30 active:scale-95 transition-all">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-semibold text-foreground mt-1">
                  {item.name}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className={cn('text-[10px] mt-1 font-medium', isActive && 'font-semibold text-primary')}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
