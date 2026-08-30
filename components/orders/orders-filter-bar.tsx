'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, RefreshCw, X } from 'lucide-react';

interface FilterProps {
  search: string;
  setSearch: (s: string) => void;
  statusTab: string;
  setStatusTab: (s: string) => void;
  cityFilter: string;
  setCityFilter: (c: string) => void;
  onReset: () => void;
}

const statusTabs = [
  { id: 'all', label: 'All Orders' },
  { id: 'ready_to_dispatch', label: 'Ready to Dispatch' },
  { id: 'in_transit', label: 'In Transit' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'failed', label: 'Action Required' },
];

export function OrdersFilterBar({
  search,
  setSearch,
  statusTab,
  setStatusTab,
  cityFilter,
  setCityFilter,
  onReset,
}: FilterProps) {
  const isFiltered = search || statusTab !== 'all' || cityFilter !== 'all';

  return (
    <div className="space-y-3">
      {/* Primary Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {statusTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              statusTab === tab.id
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                : 'bg-card/80 text-muted-foreground hover:text-foreground hover:bg-secondary/80 border border-border/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Toolbar (Search + City dropdown + Reset) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by order #, customer, phone, or tracking..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-card/60 border-border/70 rounded-lg"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* City Filter */}
        <div className="w-full sm:w-44">
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="h-8 text-xs bg-card/60 border-border/70 rounded-lg">
              <SelectValue placeholder="All Cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              <SelectItem value="Dhaka">Dhaka</SelectItem>
              <SelectItem value="Chittagong">Chittagong</SelectItem>
              <SelectItem value="Sylhet">Sylhet</SelectItem>
              <SelectItem value="Gazipur">Gazipur</SelectItem>
              <SelectItem value="Narayanganj">Narayanganj</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters Button */}
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3 w-3" /> Clear
          </Button>
        )}
      </div>
    </div>
  );
}
