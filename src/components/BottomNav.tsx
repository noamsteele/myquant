"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, User } from "lucide-react";

export default function BottomNav() {
    const pathname = usePathname();

    const navItems = [
        { name: "Dashboard", href: "/", icon: Home },
        { name: "Trade", href: "/trade", icon: PlusCircle },
        { name: "Profile", href: "/profile", icon: User },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 glass pb-[env(safe-area-inset-bottom)] z-50">
            <div className="flex justify-around items-center h-16 px-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200 ${isActive ? "text-accent" : "text-tab-inactive"
                                }`}
                        >
                            <Icon size={24} className={isActive ? "stroke-2" : "stroke-[1.5]"} />
                            <span className="text-[10px] font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
