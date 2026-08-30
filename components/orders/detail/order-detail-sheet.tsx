'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { OrderDispatchPanel } from './order-dispatch-panel';
import { Order } from '@/lib/types/database';
import { formatBDT, formatDate, timeAgo } from '@/lib/utils';
import {
  Package,
  User,
  MapPin,
  Phone,
  CreditCard,
  History,
  FileText,
  Save,
  Send,
  Edit2,
  ExternalLink,
} from 'lucide-react';
import {
  updateOrderDetailsAction,
  addOrderNoteAction,
} from '@/lib/actions/order-actions';
import { toast } from 'sonner';

interface OrderDetailSheetProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated: () => void;
}

export function OrderDetailSheet({
  order,
  isOpen,
  onClose,
  onOrderUpdated,
}: OrderDetailSheetProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when order changes
  React.useEffect(() => {
    if (order) {
      setRecipientName(order.recipient_name);
      setRecipientPhone(order.recipient_phone);
      setRecipientAddress(order.recipient_address);
      setIsEditingAddress(false);
    }
  }, [order]);

  if (!order) return null;

  const handleSaveAddress = async () => {
    setIsSaving(true);
    try {
      const res = await updateOrderDetailsAction(order.id, {
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        recipient_address: recipientAddress,
      });
      if (res.success) {
        toast.success('Shipping Details Updated');
        setIsEditingAddress(false);
        onOrderUpdated();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    try {
      const res = await addOrderNoteAction(order.id, noteContent.trim(), 'Operator');
      if (res.success) {
        toast.success('Note Added');
        setNoteContent('');
        onOrderUpdated();
      }
    } catch {
      toast.error('Failed to add note');
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col h-full bg-card">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-border/70 bg-card/60 backdrop-blur-xl">
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">
                    {order.order_number}
                  </h2>
                  <Badge variant={order.payment_status === 'paid' ? 'paid' : 'pending'}>
                    {order.payment_status.toUpperCase()}
                  </Badge>
                  <Badge
                    variant={
                      order.courier_status === 'delivered'
                        ? 'delivered'
                        : order.courier_status === 'in_transit'
                        ? 'transit'
                        : order.courier_status === 'ready_to_dispatch'
                        ? 'ready'
                        : 'default'
                    }
                  >
                    {order.courier_status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Placed {formatDate(order.shopify_created_at)} • Source: Shopify
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 w-full h-8">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="dispatch" className="text-xs">Dispatch</TabsTrigger>
                <TabsTrigger value="timeline" className="text-xs">Timeline ({order.events?.length || 0})</TabsTrigger>
                <TabsTrigger value="notes" className="text-xs">Notes ({order.notes_list?.length || 0})</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Customer & Shipping Destination Card */}
              <div className="p-4 rounded-xl border border-border/80 bg-background/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-primary" /> Recipient & Shipping Information
                  </span>
                  {!isEditingAddress ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingAddress(true)}
                      className="h-7 text-xs text-muted-foreground hover:text-primary gap-1"
                    >
                      <Edit2 className="h-3 w-3" /> Edit
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSaveAddress}
                      disabled={isSaving}
                      className="h-7 text-xs gap-1"
                    >
                      <Save className="h-3 w-3" /> Save
                    </Button>
                  )}
                </div>

                {!isEditingAddress ? (
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-foreground text-sm">{order.recipient_name}</p>
                    <p className="text-muted-foreground flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-muted-foreground" /> {order.recipient_phone}
                    </p>
                    <p className="text-muted-foreground flex items-start gap-1.5 pt-1">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <span>{order.recipient_address} ({order.city}, {order.zone})</span>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 pt-1 text-xs">
                    <Input
                      placeholder="Recipient Full Name"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="h-8 text-xs bg-card"
                    />
                    <Input
                      placeholder="11-digit Phone (01XXXXXXXXX)"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      className="h-8 text-xs bg-card"
                    />
                    <Input
                      placeholder="Full Street Address"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      className="h-8 text-xs bg-card"
                    />
                  </div>
                )}
              </div>

              {/* Line Items Card */}
              <div className="p-4 rounded-xl border border-border/80 bg-background/50 space-y-3">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-primary" /> Ordered Products ({order.items?.length || 0})
                </span>

                <div className="divide-y divide-border/60">
                  {order.items?.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-secondary overflow-hidden shrink-0 border border-border/60 relative">
                          {item.image_url ? (
                            <Image
                              src={item.image_url}
                              alt={item.title}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-[10px] text-muted-foreground">
                              No Pic
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground leading-tight">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {item.variant_title || 'Default'} • SKU: {item.sku || 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right whitespace-nowrap">
                        <p className="font-semibold text-foreground">
                          {formatBDT(item.total_price)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Qty: {item.quantity} × {formatBDT(item.unit_price)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Calculation */}
              <div className="p-4 rounded-xl border border-border/80 bg-background/50 space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatBDT(order.subtotal_price)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery Charge</span>
                  <span>{formatBDT(order.delivery_charge)}</span>
                </div>
                <div className="flex justify-between font-bold text-foreground text-sm pt-2 border-t border-border/60">
                  <span>Total Order Value</span>
                  <span>{formatBDT(order.total_price)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-400 text-xs pt-1">
                  <span>COD to Collect (Courier)</span>
                  <span>{formatBDT(order.cod_amount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DISPATCH PANEL */}
          {activeTab === 'dispatch' && (
            <OrderDispatchPanel order={order} onOrderUpdated={onOrderUpdated} />
          )}

          {/* TAB 3: TIMELINE / AUDIT HISTORY */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Immutable chronological event trail of all Shopify sync, courier events, and operator actions.
              </p>

              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
                {order.events?.map((evt) => (
                  <div key={evt.id} className="relative text-xs">
                    <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full bg-primary border-2 border-card" />
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{evt.event_type}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {formatDate(evt.created_at)}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-0.5">{evt.message}</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      Actor: {evt.actor} • Source: {evt.source}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: OPERATIONAL NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <form onSubmit={handleAddNote} className="flex gap-2">
                <Input
                  placeholder="Add internal warehouse or delivery note..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="text-xs h-9 bg-background/50"
                />
                <Button type="submit" size="sm" className="h-9 text-xs gap-1">
                  Add Note
                </Button>
              </form>

              <div className="space-y-2">
                {order.notes_list?.map((note) => (
                  <div key={note.id} className="p-3 rounded-xl border border-border/60 bg-background/50 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">{note.author_name}</span>
                      <span>{timeAgo(note.created_at)}</span>
                    </div>
                    <p className="text-muted-foreground">{note.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
