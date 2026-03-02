"use client";

import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Wallet, Activity, Box, RefreshCcw, X, Server, ArrowDownUp, Trash2, CheckCircle2 } from "lucide-react";
import { usePortfolio } from "@/context/PortfolioContext";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ['#007aff', '#34C759', '#FF9500', '#AF52DE', '#FF3B30', '#5AC8FA'];

const CustomizedContent = (props: any) => {
  const { x, y, width, height, index, name, value, colors, totalValue } = props;
  const percent = ((value / totalValue) * 100).toFixed(1);

  if (width < 30 || height < 30) return null;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: colors[index % colors.length],
          stroke: 'var(--background)',
          strokeWidth: 2,
          strokeOpacity: 1,
          rx: 8,
          ry: 8,
        }}
      />
      {width > 40 && height > 30 && (
        <text x={x + width / 2} y={y + height / 2 - 2} textAnchor="middle" fill="#fff" fontSize={12} fontWeight="bold">
          {name}
        </text>
      )}
      {width > 50 && height > 45 && (
        <text x={x + width / 2} y={y + height / 2 + 12} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={10} fontWeight="600">
          {percent}%
        </text>
      )}
    </g>
  );
};

export default function Dashboard() {
  const { holdings, totalValue, currency, setCurrency, currencySymbol, trades, removeTrade } = usePortfolio();
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  const [sortOrder, setSortOrder] = useState<"VALUE_DESC" | "VALUE_ASC" | "AZ" | "ZA" | "RETURN_DESC">("VALUE_DESC");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const selectedHolding = holdings.find(h => h.ticker === selectedAsset);

  const assetBreakdown = useMemo(() => {
    if (!selectedAsset) return { platforms: [] };

    // We want the total shares per platform
    const platformShares: Record<string, number> = {};
    const assetTrades = trades.filter(t => t.ticker.toUpperCase() === selectedAsset);

    assetTrades.forEach(t => {
      if (!platformShares[t.platform]) platformShares[t.platform] = 0;
      if (t.type === "BUY") platformShares[t.platform] += t.quantity;
      if (t.type === "SELL") platformShares[t.platform] -= t.quantity;

      // Prevent negative floating point due to errors
      if (platformShares[t.platform] < 0) platformShares[t.platform] = 0;
    });

    // Convert to array
    return {
      platforms: Object.entries(platformShares)
        .map(([name, shares]) => ({ name, shares }))
        .filter(p => p.shares > 0.000001)
        .sort((a, b) => b.shares - a.shares)
    };
  }, [selectedAsset, trades]);

  const chartData = holdings.map(h => ({ name: h.ticker, value: h.shares * h.currentPrice }));

  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => {
      const valA = a.shares * a.currentPrice;
      const valB = b.shares * b.currentPrice;
      if (sortOrder === "VALUE_DESC") return valB - valA;
      if (sortOrder === "VALUE_ASC") return valA - valB;
      if (sortOrder === "AZ") return a.ticker.localeCompare(b.ticker);
      if (sortOrder === "ZA") return b.ticker.localeCompare(a.ticker);
      if (sortOrder === "RETURN_DESC") {
        const retA = a.costBasis > 0 ? (a.currentPrice - a.costBasis) / a.costBasis : -Infinity;
        const retB = b.costBasis > 0 ? (b.currentPrice - b.costBasis) / b.costBasis : -Infinity;
        return retB - retA;
      }
      return 0;
    });
  }, [holdings, sortOrder]);

  const specificTrades = useMemo(() => {
    if (!selectedAsset) return [];
    return trades.filter(t => t.ticker.toUpperCase() === selectedAsset).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedAsset, trades]);

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
          <div className="h-[220px] w-full mt-4 bg-background/30 rounded-2xl overflow-hidden p-1">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={chartData}
                dataKey="value"
                stroke="none"
                fill="none"
                isAnimationActive={true}
                content={<CustomizedContent colors={COLORS} totalValue={totalValue} />}
              >
                <Tooltip
                  formatter={(value: number | undefined) => [`${currencySymbol}${value ? value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 0}`, 'Value']}
                  contentStyle={{ backgroundColor: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)', backdropFilter: 'blur(20px)', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', zIndex: 100 }}
                  itemStyle={{ color: 'var(--foreground)', fontWeight: 'bold' }}
                />
              </Treemap>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Asset List */}
      <section>
        <div className="flex justify-between items-end mb-4 px-1 relative">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Activity size={20} className="text-accent" />
            Current Holdings
          </h3>
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-1.5 text-sm font-semibold text-tab-inactive hover:text-foreground transition-colors bg-white/5 px-3 py-1.5 rounded-full border border-white/5 active:scale-95"
            >
              <ArrowDownUp size={14} />
              Sort
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-[110%] w-48 bg-[#f2f2f7] dark:bg-[#1C1C1E] border border-glass-border rounded-xl shadow-2xl overflow-hidden z-[50]">
                {[
                  { label: "Value (High - Low)", val: "VALUE_DESC" },
                  { label: "Value (Low - High)", val: "VALUE_ASC" },
                  { label: "Total Return %", val: "RETURN_DESC" },
                  { label: "Alphabetical (A-Z)", val: "AZ" },
                ].map(opt => (
                  <button
                    key={opt.val}
                    onClick={() => { setSortOrder(opt.val as any); setShowSortMenu(false); }}
                    className={`w-full text-left px-4 py-3 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between ${sortOrder === opt.val ? 'text-accent' : 'text-foreground'}`}
                  >
                    {opt.label}
                    {sortOrder === opt.val && <CheckCircle2 size={16} />}
                  </button>
                ))}
              </div>
            )}
          </div>
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
            sortedHoldings.map((asset) => (
              <div
                key={asset.ticker}
                onClick={() => setSelectedAsset(asset.ticker)}
                className="glass rounded-2xl p-4 flex items-center justify-between active:scale-[0.98] transition-transform duration-200 cursor-pointer hover:bg-white/5"
              >
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
      {/* Asset Detail Pop-up Modal */}
      {selectedAsset && selectedHolding && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 pb-[env(safe-area-inset-bottom)]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedAsset(null)} />
          <div className="relative bg-[#1C1C1D] w-full md:w-[400px] max-h-[90vh] rounded-t-[2rem] md:rounded-[2rem] border border-glass-border shadow-2xl flex flex-col overflow-hidden pb-4">
            {/* Handle bar for mobile drag suggestion */}
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-4 mb-2 md:hidden" />

            <div className="p-6 pt-4 overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center font-bold text-2xl text-accent border border-accent/30 shadow-[0_0_15px_rgba(0,122,255,0.2)]">
                    {selectedHolding.ticker[0]}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold leading-tight">{selectedHolding.ticker}</h2>
                    <p className="text-tab-inactive font-medium">{selectedHolding.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* At a glance stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 rounded-xl p-4 border border-white/5 shadow-inner">
                  <p className="text-xs text-tab-inactive font-semibold uppercase tracking-wider mb-1">Total Value</p>
                  <p className="text-lg font-bold">{currencySymbol}{(selectedHolding.shares * selectedHolding.currentPrice).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/5 shadow-inner">
                  <p className="text-xs text-tab-inactive font-semibold uppercase tracking-wider mb-1">Total Return</p>
                  <p className={`text-lg font-bold ${selectedHolding.currentPrice >= selectedHolding.costBasis ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                    {selectedHolding.costBasis > 0 ? ((selectedHolding.currentPrice - selectedHolding.costBasis) / selectedHolding.costBasis * 100).toFixed(2) : "0.00"}%
                  </p>
                </div>
              </div>

              {/* Platform Breakdown */}
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2 mb-3 text-white/90">
                  <Server size={16} className="text-accent" />
                  Platform Distribution
                </h3>
                <div className="space-y-2">
                  {assetBreakdown.platforms.length === 0 ? (
                    <p className="text-sm text-tab-inactive bg-white/5 rounded-lg p-3 text-center border border-white/5">No platform data available.</p>
                  ) : (
                    assetBreakdown.platforms.map((p, i) => (
                      <div key={i} className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                        <span className="font-semibold text-sm">{p.name}</span>
                        <div className="text-right">
                          <p className="font-bold text-sm text-white">{p.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })} shares</p>
                          <p className="text-xs text-tab-inactive font-medium">{((p.shares / selectedHolding.shares) * 100).toFixed(1)}% of holding</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              {/* Trade History */}
              <div className="mt-8">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-3 text-white/90">
                  <Activity size={16} className="text-accent" />
                  Trade History
                </h3>
                <div className="space-y-2">
                  {specificTrades.length === 0 ? (
                    <p className="text-sm text-tab-inactive bg-white/5 rounded-lg p-3 text-center border border-white/5">No trades logged.</p>
                  ) : (
                    specificTrades.map((t) => (
                      <div key={t.id} className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5 relative group">
                        <div>
                          <p className="font-bold text-sm text-white">{t.type === "BUY" ? "Bought" : "Sold"} {t.quantity} <span className="text-tab-inactive text-xs font-medium">@ ${t.price}</span></p>
                          <p className="text-xs text-tab-inactive font-medium">{t.date} • {t.platform}</p>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this trade?")) {
                              removeTrade(t.id);
                              if (specificTrades.length === 1) setSelectedAsset(null); // Last trade deleted, close modal
                            }
                          }}
                          className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500/20 active:scale-90 transition-colors"
                          title="Delete Trade"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="px-6 pb-2 pt-2">
              <button onClick={() => setSelectedAsset(null)} className="w-full py-4 bg-accent text-white rounded-xl font-bold text-lg shadow-[0_4px_14px_rgba(0,122,255,0.4)] active:scale-[0.98] transition-transform">Done</button>
            </div>
          </div>
        </div>
      )}
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
