"use client";

import { User, Settings, LogOut, Bell, Shield, CircleHelp } from "lucide-react";

export default function Profile() {
    const menuItems = [
        { icon: Settings, label: "Account Settings" },
        { icon: Bell, label: "Notifications" },
        { icon: Shield, label: "Privacy & Security" },
        { icon: CircleHelp, label: "Help & Support" },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground pb-24 pt-8 px-4 font-sans space-y-8">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
            </header>

            {/* User Info Card */}
            <section className="glass rounded-3xl p-6 flex flex-col items-center justify-center space-y-4 shadow-lg border border-glass-border">
                <div className="w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center border-4 border-background shadow-xl">
                    <User size={40} className="text-accent" />
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-bold">Noam Steele</h2>
                    <p className="text-tab-inactive font-medium">noam.steele@example.com</p>
                </div>
                <button className="bg-foreground text-background px-6 py-2 rounded-full font-semibold text-sm active:scale-95 transition-transform">
                    Edit Profile
                </button>
            </section>

            {/* Menu Options */}
            <section className="space-y-3">
                {menuItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                        <div key={index} className="glass rounded-2xl p-4 flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                                    <Icon size={20} />
                                </div>
                                <span className="font-semibold text-lg">{item.label}</span>
                            </div>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-tab-inactive">
                                <path d="m9 18 6-6-6-6" />
                            </svg>
                        </div>
                    );
                })}
            </section>

            {/* Logout */}
            <button className="w-full glass rounded-2xl p-4 flex items-center justify-center gap-2 text-red-500 font-bold text-lg active:scale-[0.98] transition-transform shadow-sm">
                <LogOut size={20} />
                Log Out
            </button>
        </div>
    );
}
