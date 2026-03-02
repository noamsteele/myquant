"use client";

import { TrendingUp, TrendingDown, Wallet, Activity, Box, RefreshCcw } from "lucide-react";
import { usePortfolio } from "@/context/PortfolioContext";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ['#007aff', '#34C759', '#FF9500', '#AF52DE', '#FF3B30', '#5AC8FA'];

export default function Dashboard() {
  const { holdings, totalValue, currency, setCurrency, currencySymbol } = usePortfolio();

  const chartData = holdings.map(h => ({ name: h.ticker, value: h.shares * h.currentPrice }));

  // Calculate actual total return dynamically instead of mock placeholder
  const totalCost = holdings.reduce((acc, curr) => acc + (curr.costBasis * curr.shares), 0);
  const totalReturn = totalValue - totalCost;
  const returnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;
  const isPositiveReturn = totalReturn >= 0;

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 pt-8 px-4 font-sans space-y-8">
      <header className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
          <p className="text-tab-inactive text-sm font-medium">Welcome back, Noam</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrency(currency === "USD" ? "CAD" : "USD")}
            className="flex items-center gap-1.5 bg-foreground/5 hover:bg-foreground/10 px-3 py-1.5 rounded-full text-xs font-bold transition-colors border border-glass-border shadow-sm active:scale-95"
          >
            <RefreshCcw size={12} className="text-accent" />
            {currency}
          </button>
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center border border-accent/30 shadow-[0_0_15px_rgba(0,122,255,0.3)]">
            <UserIcon />
          </div>
        </div>
      </header>

      {/* Main Balance Card */}
      <section className="glass rounded-[2rem] p-6 relative shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-glass-border isolate">
        {/* Decorative background glows contained separately to avoid backdrop-filter bugs */}
        <div className="absolute inset-0 rounded-[2rem] overflow-hidden -z-10 pointer-events-none">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/20 rounded-full blur-[40px]" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/15 rounded-full blur-[40px]" />
        </div>

        <div className="flex items-center space-x-2 text-tab-inactive mb-2">
          <Wallet size={16} />
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8E8E93] dark:text-[#98989D]">Total Balance</h2>
        </div>
        <p className="text-[3rem] leading-none font-bold mb-3 tracking-tight">
          {currencySymbol}{totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>

        {totalValue > 0 && (
          <div className={`flex items-center space-x-1.5 text-sm font-semibold ${isPositiveReturn ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
            {isPositiveReturn ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            <span>{isPositiveReturn ? "+" : ""}{currencySymbol}{totalReturn.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({isPositiveReturn ? "+" : ""}{returnPercent.toFixed(2)}%)</span>
            <span className="text-tab-inactive ml-1 font-medium">All Time</span>
          </div>
        )}
      </section>

      {/* Allocation Chart */}
      {holdings.length > 0 && (
        <section className="glass rounded-[2rem] p-6 border border-glass-border">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#8E8E93] dark:text-[#98989D] mb-4">Allocation</h3>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                  cornerRadii={4}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${currencySymbol}${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Value']}
                  contentStyle={{ backgroundColor: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)', backdropFilter: 'blur(20px)', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
                  itemStyle={{ color: 'var(--foreground)', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Asset List */}
      <section>
        <div className="flex justify-between items-end mb-4 px-1">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Activity size={20} className="text-accent" />
            Current Holdings
          </h3>
          <span className="text-sm text-tab-inactive font-medium">See All</span>
        </div>

        <div className="space-y-4">
          {holdings.length === 0 ? (
            <div className="glass rounded-[1.5rem] p-10 flex flex-col items-center justify-center text-center border border-glass-border">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4 text-accent">
                <Box size={32} />
              </div>
              <h4 className="text-lg font-bold mb-2">No Active Holdings</h4>
              <p className="text-tab-inactive text-sm font-medium mb-6 leading-relaxed">
                Your portfolio is currently empty. Start tracking your investments by logging a trade.
              </p>
              <a href="/trade" className="bg-accent text-white px-8 py-3 rounded-full font-bold text-sm shadow-[0_4px_14px_rgba(0,122,255,0.4)] transition-transform hover:scale-105 active:scale-95">
                Log Your First Trade
              </a>
            </div>
          ) : (
            holdings.map((asset) => (
              <div key={asset.ticker} className="glass rounded-2xl p-4 flex items-center justify-between active:scale-[0.98] transition-transform duration-200">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center font-bold text-lg text-accent border border-glass-border">
                    {asset.ticker[0]}
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg leading-tight">{asset.ticker}</h4>
                    <p className="text-sm text-tab-inactive font-medium">{asset.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })} shares</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-[1.1rem] leading-tight">
                    {currencySymbol}{(asset.currentPrice * asset.shares).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <div className={`flex items-center justify-end text-sm font-medium ${asset.currentPrice >= asset.costBasis ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                    Avg: {currencySymbol}{(asset.costBasis).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            ))
          )}
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
