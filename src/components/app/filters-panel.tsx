
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SlidersHorizontal, Filter, Star, X } from 'lucide-react';

interface FiltersPanelProps {
  selectedFilters: string[];
  onFilterChange: (filters: string[]) => void;
  qualityFilter: 'all' | 'good' | 'excellent';
  onQualityFilterChange: (quality: 'all' | 'good' | 'excellent') => void;
  totalPlaces?: number;
  filteredPlaces?: number;
}

const categories = [
  { id: 'historical', label: '🏛️ Historical', priority: 1 },
  { id: 'monument', label: '🗿 Monuments', priority: 1 },
  { id: 'temple', label: '🕌 Temples', priority: 1 },
  { id: 'park', label: '🌳 Parks & Gardens', priority: 2 },
  { id: 'hotel', label: '🏨 Hotels', priority: 2 },
  { id: 'restaurant', label: '🍽️ Restaurants', priority: 2 },
  { id: 'museum', label: '🏛️ Museums', priority: 1 },
  { id: 'palace', label: '👑 Palaces', priority: 1 },
  { id: 'fort', label: '🏰 Forts', priority: 1 },
  { id: 'lake', label: '🌊 Lakes & Water', priority: 2 },
  { id: 'market', label: '🛒 Markets', priority: 3 },
  { id: 'entertainment', label: '🎭 Entertainment', priority: 3 },
];

export function FiltersPanel({ 
  selectedFilters, 
  onFilterChange, 
  qualityFilter, 
  onQualityFilterChange,
  totalPlaces = 0,
  filteredPlaces = 0
}: FiltersPanelProps) {
  const handleToggle = (categoryId: string) => {
    const newFilters = selectedFilters.includes(categoryId)
      ? selectedFilters.filter((id) => id !== categoryId)
      : [...selectedFilters, categoryId];
    onFilterChange(newFilters);
  };

  const activeFilterCount = selectedFilters.length;
  
  // Sort categories by priority
  const sortedCategories = [...categories].sort((a, b) => a.priority - b.priority);

  return (
    <div className="p-3 border-b bg-muted/30">
      <div className="flex flex-col gap-3">
        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Places found: {filteredPlaces}</span>
          {totalPlaces > filteredPlaces && (
            <span className="text-amber-600">Filtered from {totalPlaces}</span>
          )}
        </div>
        
        {/* Filter Controls */}
        <div className="flex flex-wrap gap-2">
          {/* Category Filters */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 relative z-10"
              >
                <Filter className="h-4 w-4 mr-2" />
                Categories
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1 text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 !z-[9999]" align="start" side="bottom" sideOffset={4} style={{ zIndex: 9999 }}>
              <DropdownMenuLabel className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter by Category
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {sortedCategories.map((category) => (
                <DropdownMenuCheckboxItem
                  key={category.id}
                  checked={selectedFilters.includes(category.id)}
                  onCheckedChange={() => handleToggle(category.id)}
                  className="text-sm"
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
                    className="w-full justify-center text-sm h-8"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear Categories
                  </Button>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Quality Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant={qualityFilter === 'all' ? 'outline' : 'default'} 
                size="sm" 
                className="h-8 relative z-10"
              >
                <Star className={`h-4 w-4 mr-2 ${qualityFilter !== 'all' ? 'fill-current' : ''}`} />
                Quality: {qualityFilter === 'all' ? 'All' : qualityFilter === 'good' ? 'Good+' : 'Excellent'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 !z-[9999]" align="start" side="bottom" sideOffset={4} style={{ zIndex: 9999 }}>
              <DropdownMenuLabel className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Quality Level
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={qualityFilter === 'all'}
                onCheckedChange={() => onQualityFilterChange('all')}
              >
                All Places
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={qualityFilter === 'good'}
                onCheckedChange={() => onQualityFilterChange('good')}
              >
                <Star className="h-3 w-3 mr-1 fill-current text-amber-500" />
                Good & Excellent
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={qualityFilter === 'excellent'}
                onCheckedChange={() => onQualityFilterChange('excellent')}
              >
                <Star className="h-3 w-3 mr-1 fill-current text-amber-500" />
                <Star className="h-3 w-3 mr-1 fill-current text-amber-500" />
                Excellent Only
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Active Filter Tags */}
        {selectedFilters.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedFilters.map(filterId => {
              const category = categories.find(cat => cat.id === filterId);
              if (!category) return null;
              return (
                <Badge
                  key={filterId}
                  variant="secondary"
                  className="text-xs h-6 pr-1 cursor-pointer hover:bg-destructive/20"
                  onClick={() => handleToggle(filterId)}
                >
                  {category.label}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
