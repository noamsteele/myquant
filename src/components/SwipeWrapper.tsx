"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export const ROUTES = ["/", "/watchlist", "/trade", "/insights", "/profile"];

export default function SwipeWrapper({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const [touchStartY, setTouchStartY] = useState<number | null>(null);
    const [touchEndX, setTouchEndX] = useState<number | null>(null);
    const [touchEndY, setTouchEndY] = useState<number | null>(null);

    // the required distance between touchStart and touchEnd to be detected as a swipe
    const minSwipeDistance = 75;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEndX(null);
        setTouchEndY(null);
        setTouchStartX(e.targetTouches[0].clientX);
        setTouchStartY(e.targetTouches[0].clientY);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEndX(e.targetTouches[0].clientX);
        setTouchEndY(e.targetTouches[0].clientY);
    };

    const onTouchEnd = () => {
        if (!touchStartX || !touchEndX || !touchStartY || !touchEndY) return;

        const distanceX = touchStartX - touchEndX;
        const distanceY = Math.abs(touchStartY - touchEndY);

        // Ensure it's mostly a horizontal swipe, not a vertical scroll
        if (distanceY > 50) return;

        const isLeftSwipe = distanceX > minSwipeDistance;
        const isRightSwipe = distanceX < -minSwipeDistance;

        const currentIndex = ROUTES.indexOf(pathname);
        if (currentIndex === -1) return;

        if (isLeftSwipe && currentIndex < ROUTES.length - 1) {
            router.push(ROUTES[currentIndex + 1]);
        } else if (isRightSwipe && currentIndex > 0) {
            router.push(ROUTES[currentIndex - 1]);
        }
    };

    return (
        <div
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className="w-full min-h-screen"
        >
            {children}
        </div>
    );
}
