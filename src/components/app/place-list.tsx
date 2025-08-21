
// 'use client';

// import * as React from 'react';
// import type { Place } from '@/lib/types';
// import { PlaceCard } from './place-card';
// import { ScrollArea } from '@/components/ui/scroll-area';
// import InfiniteScroll from 'react-infinite-scroll-component';
// import { LoadingSpinner } from './loading-spinner';

// interface PlaceListProps {
//   items: Place[];
//   selectedPlaceId: string | null;
//   onCardClick: (placeId: string) => void;
// }

// const ITEMS_PER_PAGE = 10;

// export function PlaceList({ items, selectedPlaceId, onCardClick }: PlaceListProps) {
//   const [visibleCount, setVisibleCount] = React.useState(ITEMS_PER_PAGE);
//   const scrollableContainerRef = React.useRef<HTMLDivElement>(null);

//   const visibleItems = React.useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
//   const hasMore = visibleCount < items.length;

//   const fetchMoreData = () => {
//     if (!hasMore) return;
//     // Using a timeout to mimic network latency for a smoother feel
//     setTimeout(() => {
//         setVisibleCount(prevCount => Math.min(prevCount + ITEMS_PER_PAGE, items.length));
//     }, 500);
//   };
  
//   // Reset scroll and visible items when the main items array changes (e.g., due to filtering)
//   React.useEffect(() => {
//     setVisibleCount(ITEMS_PER_PAGE);
//     if (scrollableContainerRef.current) {
//         const scrollableDiv = scrollableContainerRef.current.querySelector('#scrollableDiv');
//         if (scrollableDiv) {
//             scrollableDiv.scrollTop = 0;
//         }
//     }
//   }, [items]);

//   // Scroll the selected card into view
//   React.useEffect(() => {
//     if (!selectedPlaceId) return;
    
//     const cardElement = document.getElementById(`place-card-${selectedPlaceId}`);
//     if (cardElement) {
//         cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
//     }
//   }, [selectedPlaceId]);

//   if (items.length === 0) {
//     return (
//         <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
//             <h3 className="font-semibold">No Places Found</h3>
//             <p className="text-sm text-muted-foreground">Try adjusting your filters or exploring a different area.</p>
//         </div>
//     );
//   }

//   return (
//     <ScrollArea className="flex-1" ref={scrollableContainerRef}>
//       <div id="scrollableDiv" style={{ height: '100%', overflow: 'auto' }}>
//         <InfiniteScroll
//             dataLength={visibleItems.length}
//             next={fetchMoreData}
//             hasMore={hasMore}
//             loader={
//                 <div className="flex justify-center items-center py-4">
//                     <LoadingSpinner />
//                     <p className="ml-2 text-muted-foreground text-sm">Loading more...</p>
//                 </div>
//             }
//             endMessage={
//               items.length > ITEMS_PER_PAGE ? (
//                 <p className="text-center text-sm text-muted-foreground py-4">
//                   <b>That's all for now!</b>
//                 </p>
//               ) : null
//             }
//             scrollableTarget="scrollableDiv"
//         >
//             <div className="p-2 space-y-2">
//                 {visibleItems.map((item) => (
//                 <PlaceCard
//                     key={item.place_id}
//                     item={item}
//                     isSelected={item.place_id === selectedPlaceId}
//                     onClick={() => onCardClick(item.place_id)}
//                 />
//                 ))}
//             </div>
//         </InfiniteScroll>
//       </div>
//     </ScrollArea>
//   );
// }

'use client';

import * as React from 'react';
import type { Place } from '@/lib/types';
import { PlaceCard } from './place-card';

interface PlaceListProps {
  items: Place[];
  selectedPlaceId: string | null;
  onCardClick: (placeId: string) => void;
}

export function PlaceList({ items, selectedPlaceId, onCardClick }: PlaceListProps) {
  const scrollableContainerRef = React.useRef<HTMLDivElement>(null);

  // Debug log to verify item counts
  React.useEffect(() => {
    console.log(`[PlaceList] Total items: ${items.length}`);
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <h3 className="font-semibold">No Places Found</h3>
        <p className="text-sm text-muted-foreground">Try adjusting your filters or exploring a different area.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto" ref={scrollableContainerRef}>
      <div className="p-2 space-y-2">
        {items.map((item) => (
          <PlaceCard
            key={item.place_id}
            item={item}
            isSelected={item.place_id === selectedPlaceId}
            onClick={() => onCardClick(item.place_id)}
          />
        ))}
      </div>
    </div>
  );
}