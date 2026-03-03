"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, PlusCircle, Lightbulb, Settings } from "lucide-react";

export default function BottomNav() {
    const pathname = usePathname();

    const navItems = [
        { name: "Dash", href: "/", icon: Home },
        { name: "Watch", href: "/watchlist", icon: List },
        { name: "Trade", href: "/trade", icon: PlusCircle },
        { name: "Insights", href: "/insights", icon: Lightbulb },
        { name: "Settings", href: "/profile", icon: Settings },
    ];

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 bg-[var(--card-bg)] border-t border-[var(--glass-border)] z-50"
            style={{
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                paddingBottom: 'env(safe-area-inset-bottom, 12px)',
            }}
        >
            <div className="flex justify-around items-stretch h-16">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors duration-150 relative ${isActive ? "text-accent" : "text-tab-inactive"}`}
                        >
                            {isActive && (
                                <span className="absolute top-0 left-1/4 right-1/4 h-[2px] rounded-b-full bg-accent" />
                            )}
                            <Icon size={22} strokeWidth={isActive ? 2.2 : 1.6} />
                            <span className="text-[10px] font-semibold tracking-wide">{item.name}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
