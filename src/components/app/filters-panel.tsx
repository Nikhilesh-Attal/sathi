
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SlidersHorizontal } from 'lucide-react';

interface FiltersPanelProps {
  selectedFilters: string[];
  onFilterChange: (filters: string[]) => void;
}

const categories = [
  { id: 'place', label: 'Places' },
  { id: 'hotel', label: 'Hotels' },
  { id: 'restaurant', label: 'Restaurants' },
  { id: 'park', label: 'Parks' },
  { id: 'historical', label: 'Historical' },
  { id: 'market', label: 'Markets' },
  { id: 'monument', label: 'Monuments' },
];

export function FiltersPanel({ selectedFilters, onFilterChange }: FiltersPanelProps) {
  const handleToggle = (categoryId: string) => {
    const newFilters = selectedFilters.includes(categoryId)
      ? selectedFilters.filter((id) => id !== categoryId)
      : [...selectedFilters, categoryId];
    onFilterChange(newFilters);
  };

  const activeFilterCount = selectedFilters.length;

  return (
    <div className="p-2 border-b">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full md:w-auto justify-center">
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filter {activeFilterCount > 0 && `(${activeFilterCount})`}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {categories.map((category) => (
            <DropdownMenuCheckboxItem
              key={category.id}
              checked={selectedFilters.includes(category.id)}
              onCheckedChange={() => handleToggle(category.id)}
            >
              {category.label}
            </DropdownMenuCheckboxItem>
          ))}
          {activeFilterCount > 0 && (
            <>
              <DropdownMenuSeparator />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFilterChange([])}
                className="w-full justify-center text-sm"
              >
                Clear Filters
              </Button>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
