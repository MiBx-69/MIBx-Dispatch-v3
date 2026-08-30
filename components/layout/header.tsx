'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Bell,
  RefreshCw,
  Send,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { syncHistoricalOrdersAction } from '@/lib/actions/sync-actions';
import { toast } from 'sonner';

export function Header() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [syncing, setSyncing] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    router.push(`/orders?search=${encodeURIComponent(searchTerm.trim())}`);
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const res = await syncHistoricalOrdersAction();
      if (res.success) {
        toast.success('Shopify Sync Complete', {
          description: res.message,
        });
      } else {
        toast.error('Sync Error', { description: res.error });
      }
    } catch {
      toast.error('Sync request failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/80 backdrop-blur-xl px-4 lg:px-6 py-3 flex items-center justify-between gap-4">
      {/* Mobile brand header */}
      <div className="flex md:hidden items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center text-white font-bold text-sm">
          M
        </div>
        <span className="font-bold text-sm">MIBx</span>
      </div>

      {/* Global Search Bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md relative hidden sm:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by Order #, Phone, Name, Consignment..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 pr-4 h-9 bg-card/60 border-border/70 rounded-xl text-xs focus-visible:ring-primary/40"
        />
      </form>

      {/* Action Controls & Health */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Sync Status Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/80 border border-border/60 text-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium text-foreground">Webhook Engine</span>
          <span className="text-[11px] text-muted-foreground font-mono">12ms</span>
        </div>

        {/* Quick Sync Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualSync}
          disabled={syncing}
          className="h-8 gap-1.5 text-xs rounded-lg border-border/80 hover:border-primary/50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
          <span className="hidden sm:inline">{syncing ? 'Syncing...' : 'Reconcile'}</span>
        </Button>

        {/* Warehouse Dispatch Tower Shortcut */}
        <Link href="/dispatch">
          <Button
            variant="pathao"
            size="sm"
            className="h-8 gap-1.5 text-xs rounded-lg font-semibold shadow-sm"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Fast Dispatch</span>
          </Button>
        </Link>
      </div>
    </header>
  );
}
