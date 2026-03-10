"use client";

import { useMemo, useState, useEffect } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import {
    Sparkles, BrainCircuit, ShieldAlert, TrendingUp, TrendingDown,
    Wallet, BarChart2, AlertTriangle, CheckCircle2, Zap, Globe,
    DollarSign, RefreshCcw, Layers, ArrowRight, Clock, Target,
    PiggyBank, Scale, X, Plus, Settings2, ChevronDown, ChevronUp,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────── */
type InsightSeverity = "positive" | "warning" | "negative" | "neutral" | "info";

type InsightDef = {
    id: string;
    title: string;
    desc: string;
    icon: React.ReactNode;
    severity: InsightSeverity;
    category: "Risk" | "Allocation" | "Performance" | "Tax & Cost" | "Strategy" | "Market";
    condition: (ctx: InsightContext) => boolean;
    dynamic: (ctx: InsightContext) => { title?: string; desc?: string };
};

type InsightContext = {
    holdings: any[];
    trades: any[];
    totalValue: number;
    totalCost: number;
    realizedPnL: number;
    unrealizedPnL: number;
    pnlByTicker: Record<string, { realizedPnL: number; unrealizedPnL: number }>;
    currencySymbol: string;
};

/* ─── Severity styles ────────────────────────────────────────────── */
const SEV: Record<InsightSeverity, { icon: string; bg: string; border: string; badge: string }> = {
    positive: { icon: "text-[#00e5a0]", bg: "bg-[#00e5a0]/10", border: "border-[#00e5a0]/20", badge: "bg-[#00e5a0]/15 text-[#00e5a0]" },
    warning: { icon: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20", badge: "bg-yellow-400/15 text-yellow-400" },
    negative: { icon: "text-[#ff3d57]", bg: "bg-[#ff3d57]/10", border: "border-[#ff3d57]/20", badge: "bg-[#ff3d57]/15 text-[#ff3d57]" },
    neutral: { icon: "text-white/50", bg: "bg-white/6", border: "border-white/8", badge: "bg-white/10 text-white/60" },
    info: { icon: "text-accent", bg: "bg-accent/10", border: "border-accent/20", badge: "bg-accent/15 text-accent" },
};

const CAT_COLOR: Record<string, string> = {
    "Risk": "bg-red-500/10 text-red-400 border-red-500/20",
    "Allocation": "bg-purple-500/10 text-purple-400 border-purple-500/20",
    "Performance": "bg-[#00e5a0]/10 text-[#00e5a0] border-[#00e5a0]/20",
    "Tax & Cost": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    "Strategy": "bg-accent/10 text-accent border-accent/20",
    "Market": "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

/* ─── All 20 insight definitions ────────────────────────────────── */
const ALL_INSIGHTS: InsightDef[] = [
    // ── RISK ──
    {
        id: "concentration_risk",
        title: "High Concentration Risk",
        desc: "Your portfolio is heavily concentrated in a very small number of positions. A single bad earnings report or sector downturn could have an outsized impact on your total balance.",
        icon: <ShieldAlert size={18} />, severity: "negative", category: "Risk",
        condition: ctx => ctx.holdings.length > 0 && ctx.holdings.length < 3 && ctx.totalValue > 500,
        dynamic: ctx => ({
            desc: `You hold only ${ctx.holdings.length} asset${ctx.holdings.length === 1 ? "" : "s"}. A single adverse event could significantly impact your entire portfolio. Consider distributing across 6–10+ uncorrelated positions.`
        }),
    },
    {
        id: "single_stock_dominance",
        title: "Single-Stock Dominance",
        desc: "One position makes up more than 40% of your portfolio, creating significant single-stock risk.",
        icon: <AlertTriangle size={18} />, severity: "warning", category: "Risk",
        condition: ctx => {
            if (!ctx.holdings.length) return false;
            const top = Math.max(...ctx.holdings.map(h => (h.shares * h.currentPrice)));
            return ctx.totalValue > 0 && (top / ctx.totalValue) > 0.4;
        },
        dynamic: ctx => {
            const top = ctx.holdings.reduce((a, b) => (a.shares * a.currentPrice) > (b.shares * b.currentPrice) ? a : b);
            const pct = ((top.shares * top.currentPrice) / ctx.totalValue * 100).toFixed(1);
            return { desc: `${top.ticker} makes up ${pct}% of your portfolio. Consider trimming this position and redeploying into diversifying assets.` };
        },
    },
    {
        id: "high_crypto_weight",
        title: "Heavy Crypto Weighting",
        desc: "More than 40% of your portfolio is in crypto assets, dramatically increasing your overall volatility.",
        icon: <Zap size={18} />, severity: "warning", category: "Risk",
        condition: ctx => {
            const cryptoPct = getCryptoPct(ctx);
            return cryptoPct > 40;
        },
        dynamic: ctx => {
            const pct = getCryptoPct(ctx).toFixed(1);
            return { desc: `${pct}% of your portfolio is in crypto. While high-upside, this level of exposure can cause severe drawdowns during bear markets. Consider balancing with equities or bonds.` };
        },
    },
    {
        id: "no_stop_loss_mindset",
        title: "Underwater Positions Detected",
        desc: "You have positions trading significantly below their average cost basis.",
        icon: <TrendingDown size={18} />, severity: "warning", category: "Risk",
        condition: ctx => ctx.holdings.some(h => h.currentPrice < h.costBasis * 0.85),
        dynamic: ctx => {
            const underwater = ctx.holdings.filter(h => h.currentPrice < h.costBasis * 0.85);
            const names = underwater.map(h => h.ticker).join(", ");
            return { desc: `${names} ${underwater.length === 1 ? "is" : "are"} trading more than 15% below your average cost. Review whether the original investment thesis is still intact before averaging down further.` };
        },
    },

    // ── ALLOCATION ──
    {
        id: "well_diversified",
        title: "Well-Diversified Portfolio",
        desc: "You hold a healthy number of uncorrelated positions, spreading risk effectively.",
        icon: <CheckCircle2 size={18} />, severity: "positive", category: "Allocation",
        condition: ctx => ctx.holdings.length >= 6,
        dynamic: ctx => ({
            desc: `With ${ctx.holdings.length} distinct holdings, your portfolio has a good spread of market exposure. Continue monitoring correlation between assets to ensure true diversification.`
        }),
    },
    {
        id: "no_international",
        title: "Zero International Exposure",
        desc: "Your portfolio appears to be 100% in domestic (US) markets, missing global growth opportunities.",
        icon: <Globe size={18} />, severity: "info", category: "Allocation",
        condition: ctx => {
            if (!ctx.holdings.length) return false;
            const intl = ["VEA", "VWO", "EFA", "IEFA", "VXUS", "EEM", "ACWI", "INDA", "FXI", "EWJ", "VGK"];
            return !ctx.holdings.some(h => intl.includes(h.ticker.toUpperCase()));
        },
        dynamic: _ => ({
            desc: "Consider adding international ETFs (e.g. VXUS, VEA, EFA) to capture growth in developed and emerging markets — currently ~55% of global market cap lies outside the US."
        }),
    },
    {
        id: "no_bonds",
        title: "No Fixed-Income Buffer",
        desc: "Your portfolio has no bond or fixed-income allocation to cushion equity volatility.",
        icon: <Scale size={18} />, severity: "info", category: "Allocation",
        condition: ctx => {
            if (!ctx.holdings.length) return false;
            const bonds = ["BND", "AGG", "TLT", "IEF", "SHY", "VTEB", "LQD", "HYG", "BNDX", "TIP"];
            return !ctx.holdings.some(h => bonds.includes(h.ticker.toUpperCase()));
        },
        dynamic: _ => ({
            desc: "During equity downturns, bonds often hold or gain in value. Even a 10–20% allocation to investment-grade bonds (AGG, BND) can significantly reduce portfolio drawdown."
        }),
    },
    {
        id: "optimal_crypto_exposure",
        title: "Balanced Crypto Exposure",
        desc: "Your crypto allocation sits in the optimal 5–20% range for growth without excessive volatility.",
        icon: <Sparkles size={18} />, severity: "positive", category: "Allocation",
        condition: ctx => {
            const pct = getCryptoPct(ctx);
            return pct >= 5 && pct <= 20;
        },
        dynamic: ctx => {
            const pct = getCryptoPct(ctx).toFixed(1);
            return { desc: `At ${pct}% crypto, you're capturing asymmetric upside potential while keeping systemic risk contained. This aligns with most risk-adjusted portfolio frameworks.` };
        },
    },

    // ── PERFORMANCE ──
    {
        id: "strong_unrealized_gains",
        title: "Significant Unrealized Gains",
        desc: "You have substantial unrealized profits — a great position to be in.",
        icon: <TrendingUp size={18} />, severity: "positive", category: "Performance",
        condition: ctx => ctx.totalValue > 0 && ctx.unrealizedPnL > ctx.totalValue * 0.2,
        dynamic: ctx => {
            const pct = (ctx.unrealizedPnL / Math.max(ctx.totalCost, 1) * 100).toFixed(1);
            return { desc: `Your open positions are up ${pct}% on average. Consider whether to lock in some gains by taking partial profits, especially in high-beta positions near 52-week highs.` };
        },
    },
    {
        id: "portfolio_underwater",
        title: "Portfolio in the Red",
        desc: "Your overall portfolio is currently below your total cost basis.",
        icon: <TrendingDown size={18} />, severity: "negative", category: "Performance",
        condition: ctx => ctx.totalValue > 0 && ctx.unrealizedPnL < -ctx.totalCost * 0.05,
        dynamic: ctx => {
            const loss = Math.abs(ctx.unrealizedPnL);
            const pct = (loss / Math.max(ctx.totalCost, 1) * 100).toFixed(1);
            return { desc: `Your portfolio is down ${pct}% (${ctx.currencySymbol}${loss.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) from cost. Stay disciplined — avoid panic-selling quality assets; corrections are a normal part of the market cycle.` };
        },
    },
    {
        id: "realized_profit_positive",
        title: "Profitable Trade History",
        desc: "Your closed/sold positions have generated a net profit overall.",
        icon: <DollarSign size={18} />, severity: "positive", category: "Performance",
        condition: ctx => ctx.realizedPnL > 0,
        dynamic: ctx => {
            return { desc: `You've locked in ${ctx.currencySymbol}${ctx.realizedPnL.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in realized gains from completed trades. This reaffirms your ability to identify and exit positions profitably.` };
        },
    },
    {
        id: "realized_loss",
        title: "Net Realized Losses",
        desc: "Your closed positions have resulted in a net realized loss. This may have tax implications.",
        icon: <AlertTriangle size={18} />, severity: "warning", category: "Performance",
        condition: ctx => ctx.realizedPnL < -50,
        dynamic: ctx => {
            const loss = Math.abs(ctx.realizedPnL);
            return { desc: `You have ${ctx.currencySymbol}${loss.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in net realized losses. In taxable accounts, capital losses can be used to offset capital gains — consider consulting a tax professional about tax-loss harvesting strategies.` };
        },
    },

    // ── TAX & COST ──
    {
        id: "tax_loss_harvest",
        title: "Tax-Loss Harvesting Opportunity",
        desc: "Some positions are sitting at a loss and could be used to offset taxable gains.",
        icon: <PiggyBank size={18} />, severity: "info", category: "Tax & Cost",
        condition: ctx => ctx.holdings.some(h => h.currentPrice < h.costBasis) && ctx.realizedPnL > 0,
        dynamic: ctx => {
            const losers = ctx.holdings.filter(h => h.currentPrice < h.costBasis);
            const names = losers.map(h => h.ticker).slice(0, 3).join(", ");
            return { desc: `${names} ${losers.length === 1 ? "is" : "are"} currently below cost. Selling these at a loss to offset your ${ctx.currencySymbol}${ctx.realizedPnL.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in realized gains can reduce your current-year tax bill (consult a qualified tax advisor).` };
        },
    },
    {
        id: "multi_platform",
        title: "Multi-Platform Portfolio",
        desc: "Your investments are spread across multiple brokerages, which is useful for resilience.",
        icon: <Layers size={18} />, severity: "info", category: "Tax & Cost",
        condition: ctx => {
            const platforms = new Set(ctx.trades.map((t: any) => t.platform));
            return platforms.size >= 3;
        },
        dynamic: ctx => {
            const platforms = Array.from(new Set(ctx.trades.map((t: any) => t.platform)));
            return { desc: `Your trades span ${platforms.length} platforms (${platforms.join(", ")}). While diversification of custodians adds resilience, it can complicate annual tax reporting. Consider using a unified tax tool.` };
        },
    },

    // ── STRATEGY ──
    {
        id: "dollar_cost_averaging",
        title: "DCA Pattern Detected",
        desc: "You've made multiple buys in the same asset over time — a disciplined DCA strategy.",
        icon: <RefreshCcw size={18} />, severity: "positive", category: "Strategy",
        condition: ctx => {
            const buys = ctx.trades.filter((t: any) => t.type === "BUY");
            const tickerCounts: Record<string, number> = {};
            buys.forEach((t: any) => { tickerCounts[t.ticker] = (tickerCounts[t.ticker] || 0) + 1; });
            return Object.values(tickerCounts).some(c => c >= 3);
        },
        dynamic: ctx => {
            const buys = ctx.trades.filter((t: any) => t.type === "BUY");
            const ticker = Object.entries(
                buys.reduce((acc: any, t: any) => { acc[t.ticker] = (acc[t.ticker] || 0) + 1; return acc; }, {})
            ).sort(([, a]: any, [, b]: any) => b - a)[0]?.[0];
            return { desc: `You've made multiple purchases in ${ticker}, smoothing your average entry price over time. Dollar-cost averaging is one of the most evidence-backed strategies for long-term wealth building.` };
        },
    },
    {
        id: "no_trades_30d",
        title: "No Recent Activity",
        desc: "You haven't logged any trades in the past 30 days.",
        icon: <Clock size={18} />, severity: "neutral", category: "Strategy",
        condition: ctx => {
            if (!ctx.trades.length) return false;
            const thirtyDaysAgo = Date.now() - 30 * 24 * 3600 * 1000;
            return !ctx.trades.some((t: any) => new Date(t.date).getTime() > thirtyDaysAgo);
        },
        dynamic: _ => ({
            desc: "No trades logged in the last 30 days. If you're holding for the long term, this is great discipline. If markets have moved significantly, it may be worth reviewing your allocation targets."
        }),
    },
    {
        id: "active_trader",
        title: "Active Trading Pattern",
        desc: "You've made a high volume of trades recently — be mindful of transaction costs and short-term tax rates.",
        icon: <BarChart2 size={18} />, severity: "warning", category: "Strategy",
        condition: ctx => {
            const thirtyDaysAgo = Date.now() - 30 * 24 * 3600 * 1000;
            const recent = ctx.trades.filter((t: any) => new Date(t.date).getTime() > thirtyDaysAgo);
            return recent.length >= 6;
        },
        dynamic: ctx => {
            const thirtyDaysAgo = Date.now() - 30 * 24 * 3600 * 1000;
            const recent = ctx.trades.filter((t: any) => new Date(t.date).getTime() > thirtyDaysAgo);
            return { desc: `You've made ${recent.length} trades in the last 30 days. Frequent trading can erode returns through commissions, spreads, and short-term capital gains tax rates. Compare your performance to a passive index like the S&P 500.` };
        },
    },
    {
        id: "portfolio_target_achieved",
        title: "Milestone Reached",
        desc: "Your portfolio has broken through a significant value milestone.",
        icon: <Target size={18} />, severity: "positive", category: "Strategy",
        condition: ctx => {
            const milestones = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
            return milestones.some(m => ctx.totalValue >= m && ctx.totalValue < m * 2);
        },
        dynamic: ctx => {
            const milestones = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
            const reached = milestones.filter(m => ctx.totalValue >= m).pop() ?? 0;
            return { title: `${ctx.currencySymbol}${reached.toLocaleString()} Milestone Reached 🎉`, desc: `Your portfolio has crossed the ${ctx.currencySymbol}${reached.toLocaleString()} mark. This is a meaningful step in your wealth-building journey. Keep compounding consistently!` };
        },
    },
    {
        id: "avg_cost_improvement",
        title: "Cost Basis Optimized",
        desc: "Your repeated purchases have successfully lowered your average cost basis in key positions.",
        icon: <Wallet size={18} />, severity: "positive", category: "Strategy",
        condition: ctx => {
            const buys = ctx.trades.filter((t: any) => t.type === "BUY");
            return ctx.holdings.some(h => {
                const hBuys = buys.filter((t: any) => t.ticker.toUpperCase() === h.ticker).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
                if (hBuys.length < 2) return false;
                const firstPrice = hBuys[0].price;
                return h.costBasis < firstPrice * 0.97; // avg cost meaningfully below first buy
            });
        },
        dynamic: _ => ({
            desc: "By averaging into positions at different price levels, you've succeeded in lowering your average cost basis below your initial entry price. This gives you a more favorable break-even point."
        }),
    },

    // ── MARKET ──
    {
        id: "market_neutral_tip",
        title: "Market Cycle Awareness",
        desc: "Consider where we are in the current market cycle when making allocation decisions.",
        icon: <ArrowRight size={18} />, severity: "neutral", category: "Market",
        condition: _ => true, // always available
        dynamic: _ => ({
            desc: "Markets move in cycles — expansion, peak, contraction, and trough. During late-cycle environments, consider rotating toward quality, dividend-paying, and defensive stocks while reducing speculative exposure."
        }),
    },
    {
        id: "rebalancing_suggestion",
        title: "Rebalancing Opportunity",
        desc: "One of your positions may have drifted significantly from your target allocation.",
        icon: <Scale size={18} />, severity: "info", category: "Market",
        condition: ctx => {
            if (ctx.holdings.length < 2) return false;
            const equal = 100 / ctx.holdings.length;
            return ctx.holdings.some(h => {
                const actual = (h.shares * h.currentPrice / ctx.totalValue) * 100;
                return Math.abs(actual - equal) > 20;
            });
        },
        dynamic: ctx => {
            const equal = 100 / ctx.holdings.length;
            const drifted = ctx.holdings.map(h => ({
                ticker: h.ticker,
                delta: (h.shares * h.currentPrice / ctx.totalValue) * 100 - equal,
            })).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
            const dir = drifted.delta > 0 ? "over" : "under";
            return { desc: `${drifted.ticker} is ${Math.abs(drifted.delta).toFixed(1)}% ${dir}-weight relative to an equal-weight target. Annual rebalancing has historically improved risk-adjusted returns by maintaining intended risk levels.` };
        },
    },
];

/* ─── Helper function ────────────────────────────────────────────── */
function getCryptoPct(ctx: InsightContext): number {
    if (!ctx.totalValue) return 0;
    const cryptoTickers = new Set([
        "BTC", "BTC-USD", "ETH", "ETH-USD", "SOL", "SOL-USD", "DOGE", "DOGE-USD",
        "ADA", "XRP", "DOT", "LTC", "LINK", "BNB", "AVAX", "MATIC", "SHIB", "UNI",
        "ATOM", "NEAR", "FTM", "ALGO", "ICP", "XLM", "VET", "SAND", "MANA", "AXS",
        "FIL", "HBAR", "ETC", "THETA", "AAVE", "MKR", "TON", "OP", "ARB", "INJ", "SUI", "APT", "PEPE", "TRX", "BCH", "XMR", "ZEC",
    ]);
    const cryptoVal = ctx.holdings
        .filter(h => cryptoTickers.has(h.ticker.toUpperCase()))
        .reduce((a: number, h: any) => a + h.shares * h.currentPrice, 0);
    return (cryptoVal / ctx.totalValue) * 100;
}

/* ─── Insight Card ───────────────────────────────────────────────── */
function InsightCard({ insight, data, onRemove }: {
    insight: InsightDef;
    data: { title: string; desc: string };
    onRemove: () => void;
}) {
    const s = SEV[insight.severity];
    const [expanded, setExpanded] = useState(false);
    const isLong = data.desc.length > 120;

    return (
        <div className={`glass rounded-2xl border ${s.border} overflow-hidden transition-all duration-200`}>
            <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg} ${s.icon} mt-0.5`}>
                            {insight.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="font-bold text-sm leading-tight">{data.title}</h3>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${CAT_COLOR[insight.category]}`}>
                                    {insight.category}
                                </span>
                            </div>
                            <p className={`text-xs text-white/55 leading-relaxed ${!expanded && isLong ? "line-clamp-2" : ""}`}>
                                {data.desc}
                            </p>
                            {isLong && (
                                <button onClick={() => setExpanded(!expanded)}
                                    className="flex items-center gap-1 text-[10px] font-bold text-accent mt-1.5">
                                    {expanded ? <><ChevronUp size={11} />Less</> : <><ChevronDown size={11} />More</>}
                                </button>
                            )}
                        </div>
                    </div>
                    <button onClick={onRemove}
                        className="w-6 h-6 rounded-md bg-white/6 flex items-center justify-center text-white/25 hover:bg-white/12 hover:text-white/60 active:scale-90 transition-all flex-shrink-0 mt-0.5">
                        <X size={11} />
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── Library Sheet ──────────────────────────────────────────────── */
function LibrarySheet({ activeIds, available, onAdd, onClose, ctx }: {
    activeIds: Set<string>;
    available: InsightDef[];
    onAdd: (id: string) => void;
    onClose: () => void;
    ctx: InsightContext;
}) {
    const categories = Array.from(new Set(available.map(i => i.category)));
    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
            <div className="relative bg-[#07111f] w-full max-h-[85vh] rounded-t-2xl border border-[rgba(50,100,200,0.2)] shadow-2xl flex flex-col overflow-hidden">
                <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/6 flex-shrink-0">
                    <div>
                        <h2 className="text-base font-bold">Insight Library</h2>
                        <p className="text-[11px] text-white/40 font-medium">{available.length} insights available</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-md bg-white/8 flex items-center justify-center text-white/60 hover:bg-white/15">
                        <X size={16} />
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
                    {categories.map(cat => {
                        const catInsights = available.filter(i => i.category === cat);
                        return (
                            <div key={cat}>
                                <p className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg mb-2 inline-flex border ${CAT_COLOR[cat]}`}>{cat}</p>
                                <div className="space-y-2">
                                    {catInsights.map(insight => {
                                        const isActive = activeIds.has(insight.id);
                                        const dyn = insight.dynamic(ctx);
                                        const title = dyn.title || insight.title;
                                        const s = SEV[insight.severity];
                                        return (
                                            <div key={insight.id}
                                                className={`flex items-center gap-3 p-3.5 rounded-xl border ${isActive ? "bg-accent/5 border-accent/20" : "bg-white/4 border-white/6"}`}>
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${s.bg} ${s.icon}`}>
                                                    {insight.icon}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold leading-tight">{title}</p>
                                                    <p className="text-[10px] text-white/35 font-medium">{insight.category}</p>
                                                </div>
                                                <button
                                                    onClick={() => !isActive && onAdd(insight.id)}
                                                    disabled={isActive}
                                                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${isActive
                                                            ? "bg-accent/20 text-accent cursor-default"
                                                            : "bg-accent text-white hover:brightness-110 active:scale-90"
                                                        }`}>
                                                    {isActive ? <CheckCircle2 size={13} /> : <Plus size={14} />}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="px-5 pb-5 pt-3 flex-shrink-0">
                    <button onClick={onClose} className="w-full py-3.5 bg-accent text-white rounded-xl font-bold text-base shadow-[0_4px_20px_rgba(41,121,255,0.4)] active:scale-[0.98] transition-transform">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── Main page ──────────────────────────────────────────────────── */
const DISMISSED_KEY = "myquant_dismissed_insights";
const ACTIVE_KEY = "myquant_active_insights";

export default function Insights() {
    const { holdings, totalValue, trades, currencySymbol, realizedPnL, unrealizedPnL, pnlByTicker } = usePortfolio();

    // Dismissed insight IDs
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
    // Overridden active set (null = use defaults)
    const [activeIds, setActiveIds] = useState<Set<string> | null>(null);
    const [showLibrary, setShowLibrary] = useState(false);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        try {
            const d = localStorage.getItem(DISMISSED_KEY);
            if (d) setDismissedIds(new Set(JSON.parse(d)));
            const a = localStorage.getItem(ACTIVE_KEY);
            if (a) setActiveIds(new Set(JSON.parse(a)));
        } catch { }
        setInitialized(true);
    }, []);

    // Build context
    const totalCost = holdings.reduce((a, h) => a + h.costBasis * h.shares, 0);
    const ctx: InsightContext = { holdings, trades, totalValue, totalCost, realizedPnL, unrealizedPnL, pnlByTicker, currencySymbol };

    // Determine which insights are applicable (condition passes)
    const applicable = useMemo(() => ALL_INSIGHTS.filter(i => i.condition(ctx)), [holdings, trades, totalValue, realizedPnL]);

    // Active set = all applicable minus dismissed, optionally overridden
    const activeInsights = useMemo(() => {
        const base = applicable.filter(i => !dismissedIds.has(i.id));
        if (!activeIds) return base;
        return base.filter(i => activeIds.has(i.id));
    }, [applicable, dismissedIds, activeIds]);

    const dismiss = (id: string) => {
        const next = new Set([...dismissedIds, id]);
        setDismissedIds(next);
        localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
        if (activeIds) {
            const nextActive = new Set([...activeIds].filter(x => x !== id));
            setActiveIds(nextActive);
            localStorage.setItem(ACTIVE_KEY, JSON.stringify([...nextActive]));
        }
    };

    const addBack = (id: string) => {
        const nextDismissed = new Set([...dismissedIds].filter(x => x !== id));
        setDismissedIds(nextDismissed);
        localStorage.setItem(DISMISSED_KEY, JSON.stringify([...nextDismissed]));
        if (activeIds) {
            const nextActive = new Set([...activeIds, id]);
            setActiveIds(nextActive);
            localStorage.setItem(ACTIVE_KEY, JSON.stringify([...nextActive]));
        }
    };

    if (!initialized) return null;

    const positiveCount = activeInsights.filter(i => i.severity === "positive").length;
    const warningCount = activeInsights.filter(i => i.severity === "warning" || i.severity === "negative").length;

    return (
        <div className="min-h-screen bg-background text-foreground pb-24 pt-8 px-4 font-sans space-y-5">

            {/* Header */}
            <header className="flex justify-between items-start mb-1">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">AI Insights</h1>
                    <p className="text-tab-inactive text-sm font-medium">Smart analysis on your holdings</p>
                </div>
                <button onClick={() => setShowLibrary(true)}
                    className="flex items-center gap-1.5 bg-foreground/5 hover:bg-foreground/10 px-3 py-1.5 rounded-md text-xs font-bold transition-colors border border-glass-border shadow-sm active:scale-95">
                    <Settings2 size={12} className="text-accent" />
                    Manage
                </button>
            </header>

            {/* Summary pills */}
            {holdings.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-[#00e5a0]/10 border border-[#00e5a0]/20 rounded-full px-3 py-1.5 text-[11px] font-bold text-[#00e5a0]">
                        <CheckCircle2 size={11} /> {positiveCount} positive
                    </div>
                    <div className={`flex items-center gap-1.5 border rounded-full px-3 py-1.5 text-[11px] font-bold ${warningCount > 0 ? "bg-yellow-400/10 border-yellow-400/20 text-yellow-400" : "bg-white/5 border-white/10 text-white/40"}`}>
                        <AlertTriangle size={11} /> {warningCount} {warningCount === 1 ? "warning" : "warnings"}
                    </div>
                    <div className="flex items-center gap-1.5 bg-accent/10 border border-accent/20 rounded-full px-3 py-1.5 text-[11px] font-bold text-accent">
                        <BrainCircuit size={11} /> {activeInsights.length} active
                    </div>
                </div>
            )}

            {/* Empty state */}
            {activeInsights.length === 0 && holdings.length === 0 && (
                <div className="glass rounded-2xl p-10 flex flex-col items-center justify-center text-center border border-glass-border">
                    <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4 text-accent">
                        <BrainCircuit size={28} />
                    </div>
                    <h4 className="text-base font-bold mb-2">No Holdings Yet</h4>
                    <p className="text-tab-inactive text-sm font-medium leading-relaxed">
                        Log your first trade to unlock AI-powered portfolio insights.
                    </p>
                </div>
            )}

            {activeInsights.length === 0 && holdings.length > 0 && (
                <div className="glass rounded-2xl p-10 flex flex-col items-center justify-center text-center border border-glass-border">
                    <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4 text-accent">
                        <Sparkles size={28} />
                    </div>
                    <h4 className="text-base font-bold mb-2">All Caught Up</h4>
                    <p className="text-tab-inactive text-sm font-medium leading-relaxed mb-5">
                        No active insights right now. Add more from the library.
                    </p>
                    <button onClick={() => setShowLibrary(true)}
                        className="bg-accent text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-[0_4px_14px_rgba(41,121,255,0.35)] active:scale-95 transition-transform">
                        Open Library
                    </button>
                </div>
            )}

            {/* Active insight cards */}
            {activeInsights.length > 0 && (
                <div className="space-y-3">
                    {activeInsights.map(insight => {
                        const dyn = insight.dynamic(ctx);
                        return (
                            <InsightCard
                                key={insight.id}
                                insight={insight}
                                data={{ title: dyn.title || insight.title, desc: dyn.desc || insight.desc }}
                                onRemove={() => dismiss(insight.id)}
                            />
                        );
                    })}
                </div>
            )}

            {/* Dismissed section */}
            {dismissedIds.size > 0 && (
                <div className="glass rounded-2xl p-4 border border-glass-border">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">{dismissedIds.size} dismissed</p>
                    <div className="flex flex-wrap gap-2">
                        {ALL_INSIGHTS.filter(i => dismissedIds.has(i.id)).map(i => (
                            <button key={i.id} onClick={() => addBack(i.id)}
                                className="flex items-center gap-1.5 bg-white/4 border border-white/8 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white/50 hover:bg-white/8 hover:text-white/80 active:scale-95 transition-all">
                                <Plus size={10} />
                                {i.title}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Library modal */}
            {showLibrary && (
                <LibrarySheet
                    activeIds={new Set(activeInsights.map(i => i.id))}
                    available={ALL_INSIGHTS}
                    onAdd={addBack}
                    onClose={() => setShowLibrary(false)}
                    ctx={ctx}
                />
            )}
        </div>
    );
}
