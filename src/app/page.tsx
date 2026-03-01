"use client";

import { TrendingUp, TrendingDown, Wallet, Activity } from "lucide-react";

const holdings = [
  { ticker: "AAPL", name: "Apple Inc.", shares: 45, price: 189.3, change: 1.2 },
  { ticker: "BTC", name: "Bitcoin", shares: 0.15, price: 62000.5, change: -2.3 },
  { ticker: "VTI", name: "Vanguard Total Stock", shares: 120, price: 250.1, change: 0.8 },
  { ticker: "ETH", name: "Ethereum", shares: 4.5, price: 3100.2, change: 4.1 },
];

export default function Dashboard() {
  const totalValue = holdings.reduce((acc, curr) => acc + curr.shares * curr.price, 0);
  const isPositiveDay = true;

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 pt-8 px-4 font-sans space-y-6">
      <header className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
          <p className="text-tab-inactive text-sm font-medium">Welcome back, Noam</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center border border-accent/30 shadow-[0_0_15px_rgba(0,122,255,0.3)]">
          <UserIcon />
        </div>
      </header>

      {/* Main Balance Card */}
      <section className="glass rounded-[2rem] p-6 relative overflow-hidden shadow-lg border border-glass-border">
        {/* Decorative background glows */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center space-x-2 text-tab-inactive mb-1">
            <Wallet size={16} />
            <h2 className="text-sm font-medium uppercase tracking-wider">Total Balance</h2>
          </div>
          <p className="text-[2.75rem] leading-none font-bold mb-2">
            ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className={`flex items-center space-x-1 text-sm font-medium ${isPositiveDay ? 'text-green-500' : 'text-red-500'}`}>
            {isPositiveDay ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>+$1,245.50 (2.4%)</span>
            <span className="text-tab-inactive ml-2">Today</span>
          </div>
        </div>
      </section>

      {/* Asset List */}
      <section>
        <div className="flex justify-between items-end mb-4 px-1">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Activity size={20} className="text-accent" />
            Current Holdings
          </h3>
          <span className="text-sm text-tab-inactive font-medium">See All</span>
        </div>

        <div className="space-y-3">
          {holdings.map((asset) => (
            <div key={asset.ticker} className="glass rounded-2xl p-4 flex items-center justify-between active:scale-[0.98] transition-transform duration-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center font-bold text-lg text-accent border border-glass-border">
                  {asset.ticker[0]}
                </div>
                <div>
                  <h4 className="font-semibold text-lg leading-tight">{asset.ticker}</h4>
                  <p className="text-sm text-tab-inactive font-medium">{asset.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-lg leading-tight">
                  ${(asset.price * asset.shares).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <div className={`flex items-center justify-end text-sm font-medium ${asset.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {asset.change >= 0 ? "+" : ""}{asset.change}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
