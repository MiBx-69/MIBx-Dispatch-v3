'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { OrdersFilterBar } from '@/components/orders/orders-filter-bar';
import { OrdersTable } from '@/components/orders/orders-table';
import { BulkActionBar } from '@/components/orders/bulk-action-bar';
import { BulkDispatchModal } from '@/components/orders/bulk-dispatch-modal';
import { OrderDetailSheet } from '@/components/orders/detail/order-detail-sheet';
import { Order } from '@/lib/types/database';
import { getOrdersAction } from '@/lib/actions/order-actions';
import { Package, RefreshCw, Send, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await getOrdersAction({
        search,
        courierStatus: statusTab,
        city: cityFilter,
      });
      if (res.success && res.data) {
        setOrders(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [search, statusTab, cityFilter]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === orders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(orders.map((o) => o.id));
    }
  };

  const handleOpenOrder = (order: Order) => {
    setSelectedOrderForDetail(order);
    setIsDetailOpen(true);
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusTab('all');
    setCityFilter('all');
    setSelectedIds([]);
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Orders & Shipments Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Synchronized with Shopify. Fast individual or bulk courier dispatching with Pathao.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            disabled={loading}
            className="h-8 text-xs gap-1.5 rounded-lg border-border/80"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="pathao"
            size="sm"
            onClick={() => {
              if (selectedIds.length === 0) {
                // If none selected, select ready orders by default
                const ready = orders
                  .filter((o) => o.courier_status === 'ready_to_dispatch' || o.courier_status === 'unassigned')
                  .map((o) => o.id);
                setSelectedIds(ready.length > 0 ? ready : orders.map((o) => o.id));
              }
              setIsBulkModalOpen(true);
            }}
            className="h-8 text-xs font-semibold gap-1.5 rounded-lg shadow-sm"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Bulk Dispatch</span>
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <OrdersFilterBar
        search={search}
        setSearch={setSearch}
        statusTab={statusTab}
        setStatusTab={setStatusTab}
        cityFilter={cityFilter}
        setCityFilter={setCityFilter}
        onReset={handleResetFilters}
      />

      {/* Orders Data Table */}
      {loading ? (
        <div className="p-12 text-center border border-border/70 rounded-2xl bg-card/60 backdrop-blur-md">
          <RefreshCw className="h-6 w-6 text-primary animate-spin mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Loading orders...</p>
        </div>
      ) : (
        <OrdersTable
          orders={orders}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          onOpenOrder={handleOpenOrder}
        />
      )}

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalFilteredCount={orders.length}
        onSelectAll={handleSelectAll}
        onClearSelection={() => setSelectedIds([])}
        onBulkDispatch={() => setIsBulkModalOpen(true)}
        isAllSelected={selectedIds.length === orders.length && orders.length > 0}
      />

      {/* Bulk Dispatch Progress & Summary Modal */}
      <BulkDispatchModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        orderIds={selectedIds}
        onComplete={() => {
          fetchOrders();
          setSelectedIds([]);
        }}
      />

      {/* Order Detail & Dispatch Drawer */}
      <OrderDetailSheet
        order={selectedOrderForDetail}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onOrderUpdated={() => {
          fetchOrders();
          if (selectedOrderForDetail) {
            // refresh active detail
            getOrdersAction().then((res) => {
              if (res.data) {
                const refreshed = res.data.find((o) => o.id === selectedOrderForDetail.id);
                if (refreshed) setSelectedOrderForDetail(refreshed);
              }
            });
          }
        }}
      />
    </div>
  );
}
