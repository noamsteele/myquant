"use client";

import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Wallet, Activity, Box, RefreshCcw, X, Server, ArrowDownUp, Trash2, CheckCircle2 } from "lucide-react";
import { usePortfolio } from "@/context/PortfolioContext";
import {
  Treemap, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Area, AreaChart,
} from "recharts";

const COLORS = ['#2979ff', '#00e5a0', '#ff9100', '#be6aff', '#ff3d57', '#00b8e0'];

/* ─── Treemap cell renderer ─── */
const CustomizedContent = (props: any) => {
  const { x, y, width, height, index, name, value, colors, totalValue } = props;
  const percent = ((value / totalValue) * 100).toFixed(1);
  if (width < 30 || height < 30) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height}
        style={{ fill: colors[index % colors.length], stroke: 'var(--background)', strokeWidth: 2 }}
        rx={6} ry={6}
      />
      {width > 40 && height > 30 && (
        <text x={x + width / 2} y={y + height / 2 - 2} textAnchor="middle" fill="#fff" fontSize={11} fontWeight="700">{name}</text>
      )}
      {width > 50 && height > 44 && (
        <text x={x + width / 2} y={y + height / 2 + 12} textAnchor="middle" fill="rgba(255,255,255,0.65)" fontSize={10} fontWeight="600">{percent}%</text>
      )}
    </g>
  );
};

/* ─── Custom tooltip for the line chart ─── */
const PerfTooltip = ({ active, payload, label, currencySymbol }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(20px)', borderRadius: 10, padding: '8px 14px', fontSize: 12 }}>
      <p style={{ color: 'var(--tab-inactive)', marginBottom: 2 }}>{label}</p>
      <p style={{ color: 'var(--foreground)', fontWeight: 700 }}>{currencySymbol}{Number(payload[0].value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    </div>
  );
};

export default function Dashboard() {
  const { holdings, totalValue, currency, setCurrency, currencySymbol, trades, removeTrade } = usePortfolio();
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"VALUE_DESC" | "VALUE_ASC" | "AZ" | "ZA" | "RETURN_DESC">("VALUE_DESC");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const selectedHolding = holdings.find(h => h.ticker === selectedAsset);

  /* ─── Platform breakdown for modal ─── */
  const assetBreakdown = useMemo(() => {
    if (!selectedAsset) return { platforms: [] };
    const platformShares: Record<string, number> = {};
    trades.filter(t => t.ticker.toUpperCase() === selectedAsset).forEach(t => {
      if (!platformShares[t.platform]) platformShares[t.platform] = 0;
      if (t.type === "BUY") platformShares[t.platform] += t.quantity;
      if (t.type === "SELL") platformShares[t.platform] -= t.quantity;
      if (platformShares[t.platform] < 0) platformShares[t.platform] = 0;
    });
    return {
      platforms: Object.entries(platformShares)
        .map(([name, shares]) => ({ name, shares }))
        .filter(p => p.shares > 0.000001)
        .sort((a, b) => b.shares - a.shares)
    };
  }, [selectedAsset, trades]);

  /* ─── Cumulative portfolio performance over time ─── */
  const performanceData = useMemo(() => {
    if (!trades.length) return [];
    const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Build per-date cumulative cost basis as a proxy for portfolio value over time
    const dateMap = new Map<string, number>();
    const runningCost: Record<string, { shares: number; cost: number }> = {};

    sorted.forEach(t => {
      const ticker = t.ticker.toUpperCase();
      if (!runningCost[ticker]) runningCost[ticker] = { shares: 0, cost: 0 };
      if (t.type === "BUY") {
        runningCost[ticker].shares += t.quantity;
        runningCost[ticker].cost += t.quantity * t.price;
      } else {
        const avgCost = runningCost[ticker].shares > 0 ? runningCost[ticker].cost / runningCost[ticker].shares : 0;
        runningCost[ticker].shares = Math.max(0, runningCost[ticker].shares - t.quantity);
        runningCost[ticker].cost = runningCost[ticker].shares * avgCost;
      }
      // Total cost basis on this date
      const totalCostBasis = Object.values(runningCost).reduce((a, c) => a + c.cost, 0);
      dateMap.set(t.date, totalCostBasis);
    });

    // Build chart series — apply live price growth factor using holdings on last point
    const entries = Array.from(dateMap.entries()).sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());
    const lastCostBasis = entries[entries.length - 1]?.[1] ?? 0;
    const growthFactor = lastCostBasis > 0 ? totalValue / lastCostBasis : 1;

    return entries.map(([date, costBasis], i) => {
      // Scale older cost basis points proportionally; most recent maps to live totalValue
      const factor = i === entries.length - 1 ? 1 : growthFactor;
      const val = i === entries.length - 1 ? totalValue : costBasis * factor;
      const d = new Date(date);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return { date: label, value: parseFloat(val.toFixed(2)) };
    });
  }, [trades, totalValue]);

  /* ─── Allocation treemap data ─── */
  const chartData = holdings.map(h => ({ name: h.ticker, value: h.shares * h.currentPrice }));

  /* ─── Sorted holdings ─── */
  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => {
      const valA = a.shares * a.currentPrice, valB = b.shares * b.currentPrice;
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

  const totalCost = holdings.reduce((acc, curr) => acc + (curr.costBasis * curr.shares), 0);
  const totalReturn = totalValue - totalCost;
  const returnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;
  const isPositiveReturn = totalReturn >= 0;
  const perfColor = isPositiveReturn ? "#00e5a0" : "#ff3d57";

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 pt-8 px-4 font-sans space-y-5">

      {/* ─── Header ─── */}
      <header className="flex justify-between items-center mb-1">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
          <p className="text-tab-inactive text-sm font-medium">Welcome back, Noam</p>
        </div>
        <button
          onClick={() => setCurrency(currency === "USD" ? "CAD" : "USD")}
          className="flex items-center gap-1.5 bg-foreground/5 hover:bg-foreground/10 px-3 py-1.5 rounded-md text-xs font-bold transition-colors border border-glass-border shadow-sm active:scale-95"
        >
          <RefreshCcw size={11} className="text-accent" />
          {currency}
        </button>
      </header>

      {/* ─── Main Balance Card ─── */}
      <section className="glass rounded-xl p-6 relative overflow-hidden isolate border border-glass-border">
        <div className="absolute -top-16 -right-16 w-52 h-52 bg-accent/10 rounded-full blur-[60px] -z-10 pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-700/10 rounded-full blur-[50px] -z-10 pointer-events-none" />

        <div className="flex items-center space-x-2 text-tab-inactive mb-1">
          <Wallet size={14} />
          <span className="text-[11px] font-bold uppercase tracking-widest">Total Balance</span>
        </div>
        <p className="text-[3.2rem] leading-none font-bold mb-3 tracking-tight">
          {currencySymbol}{totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        {totalValue > 0 && (
          <div className={`flex items-center space-x-1.5 text-sm font-semibold ${isPositiveReturn ? 'text-[#00e5a0]' : 'text-[#ff3d57]'}`}>
            {isPositiveReturn ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>{isPositiveReturn ? "+" : ""}{currencySymbol}{totalReturn.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({isPositiveReturn ? "+" : ""}{returnPercent.toFixed(2)}%)</span>
            <span className="text-tab-inactive ml-1 font-medium text-xs">All Time</span>
          </div>
        )}
      </section>

      {/* ─── Cumulative Performance Line Chart ─── */}
      {performanceData.length >= 2 && (
        <section className="glass rounded-xl p-5 border border-glass-border">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-tab-inactive mb-4">Performance</h3>
          <div className="h-[160px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={perfColor} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={perfColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'var(--tab-inactive)', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fill: 'var(--tab-inactive)', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${currencySymbol}${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                  width={52}
                />
                <Tooltip content={<PerfTooltip currencySymbol={currencySymbol} />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={perfColor}
                  strokeWidth={2}
                  fill="url(#perfGrad)"
                  dot={{ r: 3, fill: perfColor, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: perfColor, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* ─── Allocation Treemap ─── */}
      {holdings.length > 0 && (
        <section className="glass rounded-xl p-5 border border-glass-border">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-tab-inactive mb-3">Allocation</h3>
          <div className="h-[200px] w-full rounded-lg overflow-hidden">
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
                  formatter={(value: number | undefined) => [`${currencySymbol}${value ? value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 0}`, "Value"]}
                  contentStyle={{ backgroundColor: "var(--card-bg)", borderRadius: 10, border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", zIndex: 100 }}
                  itemStyle={{ color: "var(--foreground)", fontWeight: "bold" }}
                />
              </Treemap>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* ─── Current Holdings ─── */}
      <section>
        <div className="flex justify-between items-center mb-3 px-1 relative">
          <h3 className="text-base font-bold flex items-center gap-2">
            <Activity size={17} className="text-accent" />
            Current Holdings
          </h3>
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-1.5 text-xs font-semibold text-tab-inactive hover:text-foreground transition-colors bg-white/5 px-3 py-1.5 rounded-md border border-glass-border active:scale-95"
            >
              <ArrowDownUp size={13} />
              Sort
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-[110%] w-48 bg-[#f0f2f7] dark:bg-[#0d1a30] border border-glass-border rounded-lg shadow-2xl overflow-hidden z-[50]">
                {[
                  { label: "Value (High – Low)", val: "VALUE_DESC" },
                  { label: "Value (Low – High)", val: "VALUE_ASC" },
                  { label: "Total Return %", val: "RETURN_DESC" },
                  { label: "Alphabetical (A–Z)", val: "AZ" },
                ].map(opt => (
                  <button
                    key={opt.val}
                    onClick={() => { setSortOrder(opt.val as any); setShowSortMenu(false); }}
                    className={`w-full text-left px-4 py-3 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between ${sortOrder === opt.val ? "text-accent" : "text-foreground"}`}
                  >
                    {opt.label}
                    {sortOrder === opt.val && <CheckCircle2 size={15} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {holdings.length === 0 ? (
            <div className="glass rounded-xl p-10 flex flex-col items-center justify-center text-center border border-glass-border">
              <div className="w-14 h-14 rounded-lg bg-accent/10 flex items-center justify-center mb-4 text-accent">
                <Box size={28} />
              </div>
              <h4 className="text-base font-bold mb-2">No Active Holdings</h4>
              <p className="text-tab-inactive text-sm font-medium mb-6 leading-relaxed">
                Your portfolio is currently empty. Start tracking your investments by logging a trade.
              </p>
              <a href="/trade" className="bg-accent text-white px-7 py-2.5 rounded-md font-bold text-sm shadow-[0_4px_14px_rgba(41,121,255,0.35)] transition-transform hover:scale-105 active:scale-95">
                Log Your First Trade
              </a>
            </div>
          ) : (
            sortedHoldings.map((asset) => (
              <div
                key={asset.ticker}
                onClick={() => setSelectedAsset(asset.ticker)}
                className="glass rounded-xl p-4 flex items-center justify-between active:scale-[0.98] transition-transform duration-150 cursor-pointer hover:brightness-105 border border-glass-border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-accent/15 flex items-center justify-center font-bold text-base text-accent border border-accent/20">
                    {asset.ticker[0]}
                  </div>
                  <div>
                    <h4 className="font-semibold text-base leading-tight">{asset.ticker}</h4>
                    <p className="text-xs text-tab-inactive font-medium">{asset.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })} shares</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-base leading-tight">
                    {currencySymbol}{(asset.currentPrice * asset.shares).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <div className={`text-xs font-medium ${asset.currentPrice >= asset.costBasis ? "text-[#00e5a0]" : "text-[#ff3d57]"}`}>
                    Avg: {currencySymbol}{asset.costBasis.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ─── Asset Detail Modal ─── */}
      {selectedAsset && selectedHolding && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/65 backdrop-blur-md" onClick={() => setSelectedAsset(null)} />
          <div className="relative bg-[#07111f] w-full max-h-[90vh] rounded-t-2xl border border-[rgba(50,100,200,0.2)] shadow-2xl flex flex-col overflow-hidden">
            <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mt-3 mb-1" />

            <div className="p-5 pt-3 overflow-y-auto flex-1">
              {/* Header */}
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center font-bold text-xl text-accent border border-accent/25">
                    {selectedHolding.ticker[0]}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold leading-tight">{selectedHolding.ticker}</h2>
                    <p className="text-tab-inactive text-sm font-medium">{selectedHolding.name}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedAsset(null)} className="w-8 h-8 rounded-md bg-white/8 flex items-center justify-center text-white/60 hover:bg-white/15 transition-colors">
                  <X size={16} />
                </button>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-white/4 rounded-lg p-4 border border-white/6">
                  <p className="text-[10px] text-tab-inactive font-semibold uppercase tracking-wider mb-1">Total Value</p>
                  <p className="text-base font-bold">{currencySymbol}{(selectedHolding.shares * selectedHolding.currentPrice).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-white/4 rounded-lg p-4 border border-white/6">
                  <p className="text-[10px] text-tab-inactive font-semibold uppercase tracking-wider mb-1">Total Return</p>
                  <p className={`text-base font-bold ${selectedHolding.currentPrice >= selectedHolding.costBasis ? "text-[#00e5a0]" : "text-[#ff3d57]"}`}>
                    {selectedHolding.costBasis > 0 ? ((selectedHolding.currentPrice - selectedHolding.costBasis) / selectedHolding.costBasis * 100).toFixed(2) : "0.00"}%
                  </p>
                </div>
              </div>

              {/* Platform Breakdown */}
              <h3 className="text-xs font-bold flex items-center gap-2 mb-2 text-white/80">
                <Server size={14} className="text-accent" />
                Platform Distribution
              </h3>
              <div className="space-y-2 mb-6">
                {assetBreakdown.platforms.length === 0 ? (
                  <p className="text-sm text-tab-inactive bg-white/4 rounded-lg p-3 text-center border border-white/6">No platform data.</p>
                ) : (
                  assetBreakdown.platforms.map((p, i) => (
                    <div key={i} className="flex justify-between items-center bg-white/4 p-3.5 rounded-lg border border-white/6">
                      <span className="font-semibold text-sm">{p.name}</span>
                      <div className="text-right">
                        <p className="font-bold text-sm">{p.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })} shares</p>
                        <p className="text-xs text-tab-inactive">{((p.shares / selectedHolding.shares) * 100).toFixed(1)}% of holding</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Trade History */}
              <h3 className="text-xs font-bold flex items-center gap-2 mb-2 text-white/80">
                <Activity size={14} className="text-accent" />
                Trade History
              </h3>
              <div className="space-y-2">
                {specificTrades.length === 0 ? (
                  <p className="text-sm text-tab-inactive bg-white/4 rounded-lg p-3 text-center border border-white/6">No trades logged.</p>
                ) : (
                  specificTrades.map((t) => (
                    <div key={t.id} className="flex justify-between items-center bg-white/4 p-3.5 rounded-lg border border-white/6">
                      <div>
                        <p className="font-bold text-sm">{t.type === "BUY" ? "Bought" : "Sold"} {t.quantity} <span className="text-tab-inactive text-xs">@ ${t.price}</span></p>
                        <p className="text-xs text-tab-inactive">{t.date} · {t.platform}</p>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm("Delete this trade?")) {
                            removeTrade(t.id);
                            if (specificTrades.length === 1) setSelectedAsset(null);
                          }
                        }}
                        className="w-7 h-7 rounded-md bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/25 active:scale-90 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="px-5 pb-5 pt-3">
              <button onClick={() => setSelectedAsset(null)} className="w-full py-3.5 bg-accent text-white rounded-lg font-bold text-base shadow-[0_4px_20px_rgba(41,121,255,0.4)] active:scale-[0.98] transition-transform">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
