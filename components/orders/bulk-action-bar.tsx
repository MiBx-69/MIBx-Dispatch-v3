'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Send, Printer, RefreshCw, X, CheckSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BulkActionBarProps {
  selectedCount: number;
  totalFilteredCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDispatch: () => void;
  isAllSelected: boolean;
}

export function BulkActionBar({
  selectedCount,
  totalFilteredCount,
  onSelectAll,
  onClearSelection,
  onBulkDispatch,
  isAllSelected,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card/95 backdrop-blur-2xl border border-primary/40 shadow-2xl shadow-primary/20 rounded-2xl px-4 py-2.5 flex items-center gap-3 sm:gap-6 animate-in slide-in-from-bottom-5 duration-200">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
          {selectedCount}
        </div>
        <span className="text-xs font-semibold text-foreground whitespace-nowrap">
          Order{selectedCount > 1 ? 's' : ''} Selected
        </span>
      </div>

      <div className="hidden sm:flex items-center gap-2 border-l border-border/60 pl-3">
        {!isAllSelected && selectedCount < totalFilteredCount && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSelectAll}
            className="h-7 text-xs text-primary hover:text-primary/80"
          >
            Select All ({totalFilteredCount})
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="pathao"
          size="sm"
          onClick={onBulkDispatch}
          className="h-8 gap-1.5 text-xs font-semibold rounded-lg shadow-md"
        >
          <Send className="h-3.5 w-3.5" />
          <span>Dispatch Selected</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClearSelection}
          className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
          title="Clear selection"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
