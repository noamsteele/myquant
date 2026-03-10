"use client";

import { useState, useMemo, useEffect } from "react";
import { TrendingUp, TrendingDown, Wallet, Activity, Box, RefreshCcw, X, Server, ArrowDownUp, Trash2, CheckCircle2, History } from "lucide-react";
import { usePortfolio } from "@/context/PortfolioContext";
import {
  Treemap, ResponsiveContainer, Tooltip,
  XAxis, YAxis, CartesianGrid, Area, AreaChart, ReferenceLine,
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
  const val = payload.find((p: any) => p.dataKey === 'value');
  const inv = payload.find((p: any) => p.dataKey === 'invested');
  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(20px)', borderRadius: 10, padding: '8px 14px', fontSize: 12 }}>
      <p style={{ color: 'var(--tab-inactive)', marginBottom: 4, fontWeight: 600 }}>{label}</p>
      {val && <p style={{ color: val.color, fontWeight: 700, marginBottom: 2 }}>Portfolio: {currencySymbol}{Number(val.value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>}
      {inv && <p style={{ color: inv.color, fontWeight: 700 }}>Invested: {currencySymbol}{Number(inv.value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>}
    </div>
  );
};

export default function Dashboard() {
  const { holdings, totalValue, currency, setCurrency, currencySymbol, fxRate, trades, removeTrade, realizedPnL, unrealizedPnL, pnlByTicker } = usePortfolio();
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"VALUE_DESC" | "VALUE_ASC" | "AZ" | "ZA" | "RETURN_DESC">("VALUE_DESC");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showAllTrades, setShowAllTrades] = useState(false);

  // Price chart for the selected asset (30-day)
  const [chartPrices, setChartPrices] = useState<{ date: string; price: number }[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    if (!selectedAsset) { setChartPrices([]); return; }
    setChartLoading(true);
    fetch(`/api/chart?ticker=${selectedAsset}`)
      .then(r => r.json())
      .then(d => setChartPrices(d.data ?? []))
      .catch(() => setChartPrices([]))
      .finally(() => setChartLoading(false));
  }, [selectedAsset]);

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

    // Build running cost basis per ticker per date
    const dateMap = new Map<string, { costBasis: number; invested: number }>();
    const runningCost: Record<string, { shares: number; cost: number }> = {};
    let cumulativeInvested = 0;

    sorted.forEach(t => {
      const ticker = t.ticker.toUpperCase();
      if (!runningCost[ticker]) runningCost[ticker] = { shares: 0, cost: 0 };
      if (t.type === "BUY") {
        runningCost[ticker].shares += t.quantity;
        runningCost[ticker].cost += t.quantity * t.price;
        cumulativeInvested += t.quantity * t.price;
      } else {
        const avgCost = runningCost[ticker].shares > 0 ? runningCost[ticker].cost / runningCost[ticker].shares : 0;
        const qtySold = Math.min(t.quantity, runningCost[ticker].shares);
        runningCost[ticker].shares = Math.max(0, runningCost[ticker].shares - t.quantity);
        runningCost[ticker].cost = runningCost[ticker].shares * avgCost;
        // Reduce invested by the cost basis of shares sold (not sell price)
        cumulativeInvested = Math.max(0, cumulativeInvested - qtySold * avgCost);
      }
      const totalCostBasis = Object.values(runningCost).reduce((a, c) => a + c.cost, 0);
      dateMap.set(t.date, { costBasis: totalCostBasis, invested: cumulativeInvested });
    });

    // Build chart series — scale cost basis to live portfolio value, keep invested as-is
    const entries = Array.from(dateMap.entries()).sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());
    const lastCostBasis = entries[entries.length - 1]?.[1].costBasis ?? 0;
    const growthFactor = lastCostBasis > 0 ? totalValue / lastCostBasis : 1;

    return entries.map(([date, data], i) => {
      const val = i === entries.length - 1 ? totalValue : data.costBasis * growthFactor;
      const d = new Date(date);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return { date: label, value: parseFloat(val.toFixed(2)), invested: parseFloat(data.invested.toFixed(2)) };
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

      {/* ─── P&L Summary Cards ─── */}
      {trades.length > 0 && (
        <section className="grid grid-cols-2 gap-3">
          {/* Realized P&L */}
          <div className="glass rounded-xl p-4 border border-glass-border relative overflow-hidden isolate">
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl -z-10 pointer-events-none"
              style={{ background: realizedPnL >= 0 ? 'rgba(0,229,160,0.12)' : 'rgba(255,61,87,0.12)' }} />
            <p className="text-[9px] font-bold uppercase tracking-widest text-tab-inactive mb-1.5">Realized P&amp;L</p>
            <p className={`text-base font-bold leading-tight ${realizedPnL >= 0 ? 'text-[#00e5a0]' : 'text-[#ff3d57]'
              }`}>
              {realizedPnL >= 0 ? '+' : ''}{currencySymbol}{Math.abs(realizedPnL).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[9px] text-tab-inactive font-medium mt-0.5">From closed positions</p>
          </div>
          {/* Unrealized P&L */}
          <div className="glass rounded-xl p-4 border border-glass-border relative overflow-hidden isolate">
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl -z-10 pointer-events-none"
              style={{ background: unrealizedPnL >= 0 ? 'rgba(0,229,160,0.12)' : 'rgba(255,61,87,0.12)' }} />
            <p className="text-[9px] font-bold uppercase tracking-widest text-tab-inactive mb-1.5">Unrealized P&amp;L</p>
            <p className={`text-base font-bold leading-tight ${unrealizedPnL >= 0 ? 'text-[#00e5a0]' : 'text-[#ff3d57]'
              }`}>
              {unrealizedPnL >= 0 ? '+' : ''}{currencySymbol}{Math.abs(unrealizedPnL).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[9px] text-tab-inactive font-medium mt-0.5">Open positions</p>
          </div>
        </section>
      )}
      {performanceData.length >= 2 && (
        <section className="glass rounded-xl p-5 border border-glass-border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-tab-inactive">Performance</h3>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[10px] font-semibold text-tab-inactive">
                <span className="inline-block w-5 h-0.5 rounded" style={{ background: perfColor }} />
                Portfolio
              </span>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-tab-inactive">
                <span className="inline-block w-5 h-0.5 rounded border-t border-dashed" style={{ borderColor: 'rgba(128,180,255,0.7)' }} />
                Invested
              </span>
            </div>
          </div>
          <div className="h-[170px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={perfColor} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={perfColor} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="investedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#80b4ff" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#80b4ff" stopOpacity={0} />
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
                {/* Invested line — behind portfolio */}
                <Area
                  type="monotone"
                  dataKey="invested"
                  stroke="rgba(128,180,255,0.7)"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  fill="url(#investedGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#80b4ff', strokeWidth: 0 }}
                />
                {/* Portfolio value line — on top */}
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

      {/* ─── All Trades Button ─── */}
      {trades.length > 0 && (
        <section>
          <button
            onClick={() => setShowAllTrades(true)}
            className="w-full glass rounded-xl p-4 flex items-center justify-center gap-2 border border-glass-border text-accent font-semibold text-sm hover:brightness-105 active:scale-[0.98] transition-all"
          >
            <History size={17} />
            View Full Trade History
          </button>
        </section>
      )}

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

              {/* Stats grid — value & cost basis in both currencies */}
              {(() => {
                const totalUSD = currency === "USD"
                  ? selectedHolding.shares * selectedHolding.currentPrice
                  : (selectedHolding.shares * selectedHolding.currentPrice) / fxRate;
                const totalCAD = currency === "CAD"
                  ? selectedHolding.shares * selectedHolding.currentPrice
                  : selectedHolding.shares * selectedHolding.currentPrice * fxRate;
                const costUSD = currency === "USD" ? selectedHolding.costBasis : selectedHolding.costBasis / fxRate;
                const costCAD = currency === "CAD" ? selectedHolding.costBasis : selectedHolding.costBasis * fxRate;
                const returnPct = selectedHolding.costBasis > 0
                  ? ((selectedHolding.currentPrice - selectedHolding.costBasis) / selectedHolding.costBasis * 100)
                  : 0;
                const isUp = returnPct >= 0;
                const fmt = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const assetPnL = pnlByTicker[selectedAsset] ?? { realizedPnL: 0, unrealizedPnL: 0 };
                const pnlFmt = (v: number) => `${v >= 0 ? '+' : ''}${currencySymbol}${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                return (
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {/* Total Value */}
                    <div className="bg-white/4 rounded-lg p-4 border border-white/6 col-span-2">
                      <p className="text-[10px] text-tab-inactive font-semibold uppercase tracking-wider mb-2">Total Value</p>
                      <div className="flex items-end gap-3">
                        <div>
                          <p className="text-[11px] text-tab-inactive font-medium">USD</p>
                          <p className="text-base font-bold">${fmt(totalUSD)}</p>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div>
                          <p className="text-[11px] text-tab-inactive font-medium">CAD</p>
                          <p className="text-base font-bold">C${fmt(totalCAD)}</p>
                        </div>
                      </div>
                    </div>
                    {/* Cost Basis */}
                    <div className="bg-white/4 rounded-lg p-4 border border-white/6 col-span-2">
                      <p className="text-[10px] text-tab-inactive font-semibold uppercase tracking-wider mb-2">Avg Cost / Share</p>
                      <div className="flex items-end gap-3">
                        <div>
                          <p className="text-[11px] text-tab-inactive font-medium">USD</p>
                          <p className="text-base font-bold">${fmt(costUSD)}</p>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div>
                          <p className="text-[11px] text-tab-inactive font-medium">CAD</p>
                          <p className="text-base font-bold">C${fmt(costCAD)}</p>
                        </div>
                      </div>
                    </div>
                    {/* Return & Shares */}
                    <div className="bg-white/4 rounded-lg p-4 border border-white/6">
                      <p className="text-[10px] text-tab-inactive font-semibold uppercase tracking-wider mb-1">Total Return</p>
                      <p className={`text-base font-bold ${isUp ? 'text-[#00e5a0]' : 'text-[#ff3d57]'}`}>
                        {isUp ? '+' : ''}{returnPct.toFixed(2)}%
                      </p>
                    </div>
                    <div className="bg-white/4 rounded-lg p-4 border border-white/6">
                      <p className="text-[10px] text-tab-inactive font-semibold uppercase tracking-wider mb-1">Shares Held</p>
                      <p className="text-base font-bold">{selectedHolding.shares.toLocaleString(undefined, { maximumFractionDigits: 6 })}</p>
                    </div>
                    {/* Realized P&L */}
                    <div className="bg-white/4 rounded-lg p-4 border border-white/6 relative overflow-hidden isolate">
                      <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full blur-xl -z-10 pointer-events-none"
                        style={{ background: assetPnL.realizedPnL >= 0 ? 'rgba(0,229,160,0.15)' : 'rgba(255,61,87,0.15)' }} />
                      <p className="text-[10px] text-tab-inactive font-semibold uppercase tracking-wider mb-1">Realized P&amp;L</p>
                      <p className={`text-base font-bold ${assetPnL.realizedPnL >= 0 ? 'text-[#00e5a0]' : 'text-[#ff3d57]'}`}>
                        {pnlFmt(assetPnL.realizedPnL)}
                      </p>
                      <p className="text-[9px] text-tab-inactive font-medium mt-0.5">Closed trades</p>
                    </div>
                    {/* Unrealized P&L */}
                    <div className="bg-white/4 rounded-lg p-4 border border-white/6 relative overflow-hidden isolate">
                      <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full blur-xl -z-10 pointer-events-none"
                        style={{ background: assetPnL.unrealizedPnL >= 0 ? 'rgba(0,229,160,0.15)' : 'rgba(255,61,87,0.15)' }} />
                      <p className="text-[10px] text-tab-inactive font-semibold uppercase tracking-wider mb-1">Unrealized P&amp;L</p>
                      <p className={`text-base font-bold ${assetPnL.unrealizedPnL >= 0 ? 'text-[#00e5a0]' : 'text-[#ff3d57]'}`}>
                        {pnlFmt(assetPnL.unrealizedPnL)}
                      </p>
                      <p className="text-[9px] text-tab-inactive font-medium mt-0.5">Open position</p>
                    </div>
                  </div>
                );
              })()}

              {/* 30-day Price Chart */}
              <div className="mb-5">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-bold flex items-center gap-2 text-white/80">
                    <Activity size={14} className="text-accent" />
                    30-Day Price
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[10px] text-tab-inactive font-semibold">
                      <span className="inline-block w-4 h-0.5 rounded" style={{ background: selectedHolding.currentPrice >= selectedHolding.costBasis ? '#00e5a0' : '#ff3d57' }} />
                      Price
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-tab-inactive font-semibold">
                      <span className="inline-block w-4 h-0.5 rounded border-t border-dashed" style={{ borderColor: 'rgba(128,180,255,0.7)' }} />
                      Cost Basis
                    </span>
                  </div>
                </div>
                {chartLoading ? (
                  <div className="h-[130px] flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : chartPrices.length >= 2 ? (
                  <div className="h-[130px] bg-white/3 rounded-lg overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartPrices} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={selectedHolding.currentPrice >= selectedHolding.costBasis ? '#00e5a0' : '#ff3d57'} stopOpacity={0.18} />
                            <stop offset="95%" stopColor={selectedHolding.currentPrice >= selectedHolding.costBasis ? '#00e5a0' : '#ff3d57'} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{ fill: 'var(--tab-inactive)', fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                        <YAxis tick={{ fill: 'var(--tab-inactive)', fontSize: 9 }} tickLine={false} axisLine={false} width={42}
                          tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                          domain={['auto', 'auto']}
                        />
                        <Tooltip
                          formatter={(v: any) => [`$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Price']}
                          contentStyle={{ background: '#07111f', border: '1px solid rgba(50,100,200,0.25)', borderRadius: 8, fontSize: 11 }}
                          itemStyle={{ color: '#e8edf5' }}
                        />
                        <ReferenceLine
                          y={selectedHolding.costBasis}
                          stroke="rgba(128,180,255,0.65)"
                          strokeDasharray="5 4"
                          strokeWidth={1.5}
                        />
                        <Area
                          type="monotone"
                          dataKey="price"
                          stroke={selectedHolding.currentPrice >= selectedHolding.costBasis ? '#00e5a0' : '#ff3d57'}
                          strokeWidth={1.8}
                          fill="url(#priceGrad)"
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-xs text-tab-inactive bg-white/4 rounded-lg p-3 text-center border border-white/6">No chart data available.</p>
                )}
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

      {/* ─── All Trades Sheet ─── */}
      {showAllTrades && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/65 backdrop-blur-md" onClick={() => setShowAllTrades(false)} />
          <div className="relative bg-[#07111f] w-full max-h-[85vh] rounded-t-2xl border border-[rgba(50,100,200,0.2)] shadow-2xl flex flex-col overflow-hidden">
            <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mt-3 mb-1" />
            <div className="flex justify-between items-center px-5 py-3">
              <h2 className="text-base font-bold">Trade History</h2>
              <button onClick={() => setShowAllTrades(false)} className="w-8 h-8 rounded-md bg-white/8 flex items-center justify-center text-white/60 hover:bg-white/15 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 pb-5 space-y-2">
              {[...trades]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((t) => (
                  <div key={t.id} className="flex justify-between items-center bg-white/4 p-3.5 rounded-lg border border-white/6">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.type === 'BUY' ? 'bg-[#00e5a0]' : 'bg-[#ff3d57]'}`} />
                      <div>
                        <p className="font-bold text-sm">
                          {t.ticker} &nbsp;
                          <span className={`text-xs font-semibold ${t.type === 'BUY' ? 'text-[#00e5a0]' : 'text-[#ff3d57]'}`}>{t.type}</span>
                        </p>
                        <p className="text-xs text-tab-inactive">{t.quantity} shares @ ${t.price} · {t.platform}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-tab-inactive font-medium">{t.date}</p>
                      <button
                        onClick={() => { if (confirm('Delete this trade?')) removeTrade(t.id); }}
                        className="w-6 h-6 rounded-md bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/25 active:scale-90 transition-colors mt-1 ml-auto"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
