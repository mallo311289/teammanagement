import { useRef, useState, useCallback } from 'react';

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      setStartY(e.touches[0].clientY);
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startY === 0 || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;

    if (distance > 0 && containerRef.current && containerRef.current.scrollTop === 0) {
      setIsPulling(true);
      setPullDistance(Math.min(distance * 0.5, 80));
    }
  }, [startY, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (isPulling && pullDistance > 60 && !isRefreshing) {
      setIsRefreshing(true);
      setIsPulling(false);
      setPullDistance(0);

      await onRefresh();

      setIsRefreshing(false);
    } else {
      setIsPulling(false);
      setPullDistance(0);
    }
    setStartY(0);
  }, [isPulling, pullDistance, isRefreshing, onRefresh]);

  if (containerRef.current) {
    containerRef.current.addEventListener('touchstart', handleTouchStart);
    containerRef.current.addEventListener('touchmove', handleTouchMove);
    containerRef.current.addEventListener('touchend', handleTouchEnd);
  }

  return {
    containerRef,
    isPulling,
    isRefreshing,
    pullDistance,
  };
}
